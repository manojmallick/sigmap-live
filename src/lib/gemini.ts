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
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/** gemini-2.5-flash pricing (USD per token). */
const FLASH_IN = 0.3 / 1_000_000;
const FLASH_OUT = 2.5 / 1_000_000;

export interface TimedAnswer {
  answer: string;
  promptTokens: number;
  outputTokens: number;
  latencyMs: number;
  cost: number;
}

/**
 * Answer a question over an arbitrary context block, measuring real prompt
 * tokens (from Gemini's usage metadata), latency, and cost. Used to benchmark
 * "with vs without SigMap". Returns null if not configured / on error.
 */
export async function geminiTimed(
  contextText: string,
  question: string,
  nowMs: number
): Promise<TimedAnswer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const prompt = `${contextText}\n\n---\nQuestion: ${question.trim()}`;
  try {
    const res = await fetch(
      `${GLA_BASE}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
        }),
      }
    );
    const latencyMs = elapsed(nowMs);
    if (!res.ok) return null;

    const data = (await res.json()) as GeminiResponse;
    const answer =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";
    const promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
    return {
      answer,
      promptTokens,
      outputTokens,
      latencyMs,
      cost: promptTokens * FLASH_IN + outputTokens * FLASH_OUT,
    };
  } catch {
    return null;
  }
}

function elapsed(start: number): number {
  return Math.max(0, Date.now() - start);
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

export interface SuggestedConfig {
  srcDirs: string[];
  exclude: string[];
  reasoning: string;
}

const CONFIG_SYSTEM = [
  "You configure SigMap for a repository. Given a directory tree summary,",
  "identify the directories that contain the project's PRIMARY source code",
  "(the code a developer would actually work on), and the directories to",
  "exclude (tests, fixtures, examples, generated code, build output, docs,",
  "benchmarks, scripts). Prefer precise paths (e.g. 'packages/core/src')",
  "over broad ones. Return only directories that exist in the tree.",
].join(" ");

/**
 * Ask Gemini to tailor SigMap's srcDirs/exclude to this repo's actual layout.
 * Returns null (caller falls back to defaults) if no key is set or on error —
 * config generation must never break the core analyze flow.
 */
export async function suggestRepoConfig(
  treeSummary: string,
  repo: { owner: string; name: string }
): Promise<SuggestedConfig | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(
      `${GLA_BASE}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: CONFIG_SYSTEM }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Repository: ${repo.owner}/${repo.name}\n\nDirectory tree (dir → file count, sample extensions):\n${treeSummary}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                srcDirs: { type: "array", items: { type: "string" } },
                exclude: { type: "array", items: { type: "string" } },
                reasoning: { type: "string" },
              },
              required: ["srcDirs", "exclude", "reasoning"],
            },
          },
        }),
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("");
    if (!text) return null;

    const parsed = JSON.parse(text) as Partial<SuggestedConfig>;
    if (!Array.isArray(parsed.srcDirs)) return null;

    return {
      srcDirs: parsed.srcDirs.filter((s) => typeof s === "string"),
      exclude: Array.isArray(parsed.exclude)
        ? parsed.exclude.filter((s) => typeof s === "string")
        : [],
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
  } catch {
    return null;
  }
}
