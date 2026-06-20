import type { ContextMap, DevinSessionResult } from "@/lib/types";

/**
 * Devin API client (app.devin.ai).
 *
 * Per CLAUDE.md: never read or log the API key value. We read it from the
 * environment at call time and send the verified context map as the session
 * payload instead of raw repository files.
 */
const DEVIN_API = "https://api.devin.ai/v1";

export class DevinError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "DevinError";
  }
}

/** Render a context map into a compact, Devin-ready prompt prefix. */
function renderContext(contextMap: ContextMap): string {
  const { repo, query, files, stats } = contextMap;
  const lines: string[] = [
    `# Verified context for ${repo.owner}/${repo.name}@${repo.branch}`,
    `# Source: ${repo.url}`,
    `# Intent: ${query}`,
    `# ${stats.filesReturned} files, ~${stats.mappedTokens} tokens ` +
      `(${(stats.reduction * 100).toFixed(1)}% smaller than raw source)`,
    "",
  ];
  for (const file of files) {
    lines.push(`## ${file.path} [${file.language}, ${file.confidence}]`);
    for (const sig of file.signatures) lines.push(`  ${sig}`);
    lines.push("");
  }
  return lines.join("\n");
}

export async function createDevinSession(
  contextMap: ContextMap,
  prompt: string
): Promise<DevinSessionResult> {
  const apiKey = process.env.DEVIN_API_KEY;
  if (!apiKey) {
    throw new DevinError("Devin integration is not configured.", 503);
  }

  const fullPrompt = `${renderContext(contextMap)}\n---\n\n${prompt.trim()}`;

  const res = await fetch(`${DEVIN_API}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: fullPrompt, idempotent: true }),
  });

  if (res.status === 401) {
    throw new DevinError("Devin authentication failed.", 502);
  }
  if (!res.ok) {
    throw new DevinError(`Devin API error (${res.status}).`, 502);
  }

  const data = (await res.json()) as {
    session_id?: string;
    url?: string;
  };
  if (!data.session_id) {
    throw new DevinError("Devin did not return a session.", 502);
  }

  return {
    sessionId: data.session_id,
    url: data.url ?? `https://app.devin.ai/sessions/${data.session_id}`,
  };
}
