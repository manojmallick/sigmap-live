import { NextResponse } from "next/server";
import { loadAnalysis } from "@/lib/store";
import type { ApiError, ContextMap } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/saved?repo=owner/name → a previously-saved analysis.
 * No rate limit (it's a cache read, costs nothing). 404 if not saved yet.
 */
export async function GET(
  request: Request
): Promise<NextResponse<ContextMap | ApiError>> {
  const repo = new URL(request.url).searchParams.get("repo");
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json(
      { error: "A repo of the form owner/name is required." },
      { status: 400 }
    );
  }
  const map = await loadAnalysis(repo);
  if (!map) {
    return NextResponse.json(
      { error: "No saved analysis for this repo yet." },
      { status: 404 }
    );
  }
  return NextResponse.json(map);
}
