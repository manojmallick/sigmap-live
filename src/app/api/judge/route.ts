import { NextResponse } from "next/server";
import { judgeResponse } from "@/lib/sigmap-cli";
import type { ApiError, JudgeResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * `sigmap judge` — scores how grounded an AI answer is in the context map.
 * Free (no LLM); runs the SigMap CLI against the generated context markdown.
 */
export async function POST(
  request: Request
): Promise<NextResponse<JudgeResult | ApiError>> {
  let body: { context?: string; response?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.context?.trim() || !body.response?.trim()) {
    return NextResponse.json(
      { error: "A context map and a response are required." },
      { status: 400 }
    );
  }

  try {
    const result = await judgeResponse(
      body.context.slice(0, 600_000),
      body.response.slice(0, 50_000)
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("judge failed:", err);
    return NextResponse.json({ error: "Failed to judge response." }, { status: 500 });
  }
}
