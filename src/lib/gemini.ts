import type { AskResult, ContextMap } from "@/lib/types";

/**
 * Gemini client (Google AI Studio).
 *
 * Uses the public Generative Language REST API so we add no SDK dependency
 * (keeping with the project's lean footprint). The key is read from the
 * environment at call time and never logged.
 */
const GLA_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

/** Render the verified context map into a compact, grounding prompt block. */
function renderContext(map: ContextMap): string {
  const lines: string[] = [
    `Repository: ${map.repo.owner}/${map.repo.name}@${map.repo.branch}`,
    `Verified signatures (${map.files.length} files, secrets redacted):`,
    "",
  ];
  for (const file of map.files) {
    lines.push(`### ${file.path} [${file.language}]`);
    for (const sig of file.signatures) lines.push(`  ${sig}`);
    lines.push("");
  }
  return lines.join("\n");
}

const SYSTEM_INSTRUCTION = [
  "You are a senior engineer answering questions about a codebase.",
  "You are given a VERIFIED context map: extracted function and class",
  "signatures for the most relevant files, with secrets already redacted.",
  "Answer ONLY from this context. If the answer is not derivable from the",
  "signatures provided, say so plainly rather than guessing.",
  "When you reference a file, cite its path exactly as shown.",
  "Be concise.",
].join(" ");

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

export async function askCodebase(
  map: ContextMap,
  question: string
): Promise<AskResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("Gemini integration is not configured.", 503);
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const prompt = `${renderContext(map)}\n---\nQuestion: ${question.trim()}`;

  const res = await fetch(
    `${GLA_BASE}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    }
  );

  if (res.status === 400 || res.status === 403) {
    throw new GeminiError("Gemini authentication or request failed.", 502);
  }
  if (res.status === 429) {
    throw new GeminiError("Gemini rate limit reached. Try again shortly.", 429);
  }
  if (!res.ok) {
    throw new GeminiError(`Gemini API error (${res.status}).`, 502);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new GeminiError("Gemini blocked the request.", 502);
  }

  const answer =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";

  if (!answer) {
    throw new GeminiError("Gemini returned an empty response.", 502);
  }

  // Cite any context file whose path the model mentioned verbatim.
  const citedFiles = map.files
    .map((f) => f.path)
    .filter((path) => answer.includes(path));

  return { answer, model, citedFiles };
}
