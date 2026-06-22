import { NextResponse } from "next/server";
import { loadComparison } from "@/lib/store";
import type { ApiError, Comparison } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/comparison?repo=owner/name → precomputed with/without benchmark. */
export async function GET(
  request: Request
): Promise<NextResponse<Comparison | ApiError>> {
  const repo = new URL(request.url).searchParams.get("repo");
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: "repo required." }, { status: 400 });
  }
  const c = await loadComparison(repo);
  if (!c) {
    return NextResponse.json(
      { error: "No saved comparison for this repo." },
      { status: 404 }
    );
  }
  return NextResponse.json(c);
}
