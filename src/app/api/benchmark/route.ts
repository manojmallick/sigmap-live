import { NextResponse } from "next/server";
import { analyzeRepo } from "@/lib/sigmap";
import { GitHubError } from "@/lib/github";
import type { ApiError, TokenStats } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface BenchmarkResponse extends TokenStats {
  repo: string;
  query: string;
}

/** GET /api/benchmark?url=<repo>&query=<intent> → before/after token comparison. */
export async function GET(
  request: Request
): Promise<NextResponse<BenchmarkResponse | ApiError>> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const query = searchParams.get("query") ?? undefined;

  if (!url) {
    return NextResponse.json(
      { error: "A `url` query parameter is required." },
      { status: 400 }
    );
  }

  try {
    const map = await analyzeRepo(url, query);
    return NextResponse.json({
      repo: `${map.repo.owner}/${map.repo.name}`,
      query: map.query,
      ...map.stats,
    });
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("benchmark failed:", err);
    return NextResponse.json(
      { error: "Failed to benchmark repository." },
      { status: 500 }
    );
  }
}
