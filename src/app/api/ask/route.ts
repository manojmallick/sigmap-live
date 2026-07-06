import { NextResponse } from "next/server";
import { askCodebase, GeminiError } from "@/lib/gemini";
import {
  ASK_LIMIT,
  checkAskLimit,
  checkGlobalAskBudget,
  getClientIp,
} from "@/lib/ratelimit";
import type { ApiError, AskRequest, AskResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Per-call input caps — bound the cost/latency of a single (paid) Gemini call so
// one request within the daily quota can't send a giant payload. A real SigMap
// context map is tiny (that's the point), so these are generous.
const MAX_QUESTION_CHARS = 2000;
const MAX_CONTEXT_FILES = 400;
const MAX_SIGNATURE_CHARS = 120_000;

export async function POST(
  request: Request
): Promise<NextResponse<AskResult | ApiError>> {
  let body: AskRequest;
  try {
    body = (await request.json()) as AskRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const question = body?.question?.trim();
  if (!body?.contextMap || !question) {
    return NextResponse.json(
      { error: "A context map and a question are required." },
      { status: 400 }
    );
  }

  // Reject oversized input before spending a Gemini call.
  const files = body.contextMap.files ?? [];
  const sigChars = files.reduce(
    (n, f) => n + (f.signatures?.join("").length ?? 0),
    0
  );
  if (
    question.length > MAX_QUESTION_CHARS ||
    files.length > MAX_CONTEXT_FILES ||
    sigChars > MAX_SIGNATURE_CHARS
  ) {
    return NextResponse.json(
      { error: "Request too large. Trim the question or context map." },
      { status: 413 }
    );
  }

  const limit = await checkAskLimit(getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Daily limit reached — ${ASK_LIMIT} questions per day. ` +
          `Try again tomorrow, or run it yourself with \`npx sigmap ask\`.`,
      },
      { status: 429 }
    );
  }

  // Global circuit breaker: hard daily cap on paid calls across all users.
  if (!(await checkGlobalAskBudget())) {
    return NextResponse.json(
      {
        error:
          "The demo has hit today's shared question capacity. Try again " +
          "tomorrow, or run `npx sigmap ask` locally.",
      },
      { status: 429 }
    );
  }

  try {
    const result = await askCodebase(body.contextMap, question);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("ask failed:", err);
    return NextResponse.json(
      { error: "Failed to query the codebase." },
      { status: 500 }
    );
  }
}
