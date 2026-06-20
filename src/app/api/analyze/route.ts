import { NextResponse } from "next/server";
import { analyzeRepo } from "@/lib/sigmap";
import { GitHubError } from "@/lib/github";
import type { AnalyzeRequest, ApiError, ContextMap } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request
): Promise<NextResponse<ContextMap | ApiError>> {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "A GitHub repository URL is required." },
      { status: 400 }
    );
  }

  try {
    const contextMap = await analyzeRepo(body.url, body.query);
    return NextResponse.json(contextMap);
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Never leak a stack trace to the client.
    console.error("analyze failed:", err);
    return NextResponse.json(
      { error: "Failed to analyze repository." },
      { status: 500 }
    );
  }
}
