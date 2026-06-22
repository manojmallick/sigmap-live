import { NextResponse } from "next/server";
import { adapt } from "sigmap";
import type { AdaptResult, ApiError } from "@/lib/types";

export const runtime = "nodejs";

const ADAPTERS = new Set([
  "claude",
  "cursor",
  "copilot",
  "windsurf",
  "gemini",
  "codex",
  "openai",
]);

/**
 * `sigmap --adapter <name>` — reformats the generated context for a specific
 * agent. Programmatic via adapt(); free (no LLM).
 */
export async function POST(
  request: Request
): Promise<NextResponse<AdaptResult | ApiError>> {
  let body: { output?: string; adapter?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const adapter = (body.adapter ?? "").toLowerCase();
  if (!body.output?.trim() || !ADAPTERS.has(adapter)) {
    return NextResponse.json(
      { error: "A context output and a valid adapter are required." },
      { status: 400 }
    );
  }

  try {
    const out = adapt(body.output, adapter);
    return NextResponse.json({
      adapter,
      output: typeof out === "string" ? out : JSON.stringify(out, null, 2),
    });
  } catch (err) {
    console.error("adapt failed:", err);
    return NextResponse.json(
      { error: "Failed to adapt context." },
      { status: 500 }
    );
  }
}
