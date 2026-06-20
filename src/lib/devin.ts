import type {
  ContextMap,
  DevinMessage,
  DevinSessionResult,
  DevinSessionStatus,
} from "@/lib/types";

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

/**
 * Status enums where Devin has finished its turn — either done or waiting on
 * the user. Once reached, the demo stops polling. ("running" keeps polling.)
 */
const TERMINAL_STATUSES = new Set([
  "blocked",
  "finished",
  "expired",
  "suspended",
  "stopped",
]);

interface DevinSessionResponse {
  status?: string;
  status_enum?: string | null;
  messages?: Array<{ type?: string; message?: string }>;
}

/** Fetch a session's current status and messages for display. */
export async function getDevinSession(
  sessionId: string
): Promise<DevinSessionStatus> {
  const apiKey = process.env.DEVIN_API_KEY;
  if (!apiKey) {
    throw new DevinError("Devin integration is not configured.", 503);
  }

  const res = await fetch(
    `${DEVIN_API}/session/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (res.status === 401) {
    throw new DevinError("Devin authentication failed.", 502);
  }
  if (res.status === 404) {
    throw new DevinError("Devin session not found.", 404);
  }
  if (!res.ok) {
    throw new DevinError(`Devin API error (${res.status}).`, 502);
  }

  const data = (await res.json()) as DevinSessionResponse;

  const messages: DevinMessage[] = (data.messages ?? [])
    .filter((m) => m.type === "devin_message" && m.message)
    .map((m) => ({ type: m.type as string, message: m.message as string }));

  const statusEnum = data.status_enum ?? null;
  const done =
    statusEnum !== null &&
    TERMINAL_STATUSES.has(statusEnum) &&
    messages.length > 0;

  return {
    sessionId,
    status: data.status ?? "unknown",
    statusEnum,
    messages,
    url: `https://app.devin.ai/sessions/${sessionId}`,
    done,
  };
}
