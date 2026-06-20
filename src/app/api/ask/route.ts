import { NextResponse } from "next/server";
import { askCodebase, GeminiError } from "@/lib/gemini";
import type { ApiError, AskRequest, AskResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request
): Promise<NextResponse<AskResult | ApiError>> {
  let body: AskRequest;
  try {
    body = (await request.json()) as AskRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.contextMap || !body?.question?.trim()) {
    return NextResponse.json(
      { error: "A context map and a question are required." },
      { status: 400 }
    );
  }

  try {
    const result = await askCodebase(body.contextMap, body.question);
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
