import { NextResponse } from "next/server";
import { rank } from "sigmap";
import type { ApiError, ContextMap, QueryResult } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Native SigMap ranked retrieval (`sigmap ask` / `--query`). Rebuilds the
 * signature index from a context map and ranks files against the query with
 * TF-IDF — no LLM, no API cost, so it's unlimited.
 */
export async function POST(
  request: Request
): Promise<NextResponse<QueryResult | ApiError>> {
  let body: { contextMap?: ContextMap; query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = body.query?.trim();
  const files = body.contextMap?.files;
  if (!query || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: "A context map and a query are required." },
      { status: 400 }
    );
  }

  const index = new Map(files.map((f) => [f.path, f.signatures]));
  const ranked = rank(query.slice(0, 300), index, { topK: 12 });

  return NextResponse.json({
    query,
    results: ranked.map((r) => ({
      path: r.file,
      score: r.score,
      sigCount: r.sigs.length,
      confidence: r.confidence,
    })),
  });
}
