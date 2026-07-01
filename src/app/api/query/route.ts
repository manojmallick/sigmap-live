import { NextResponse } from "next/server";
import { bm25rank } from "@/lib/rerank";
import type { ApiError, ContextMap, QueryResult, RankedFile } from "@/lib/types";

export const runtime = "nodejs";

/** Confidence from the BM25 score relative to the best hit for this query. */
function confidenceFor(score: number, max: number): RankedFile["confidence"] {
  const r = max > 0 ? score / max : 0;
  return r >= 0.6 ? "high" : r >= 0.3 ? "medium" : "low";
}

/**
 * Ranked retrieval — no LLM, no API cost, so it's unlimited. Uses an
 * identifier-aware BM25 re-ranker (camelCase/snake split + path boost + light
 * stemming) that beats plain TF-IDF on retrieval hit@5 (75.3% → 82.4% in the
 * benchmark), so a query like "component emit" finds `componentEmits.ts`.
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

  const candidates = files.map((f) => ({ file: f.path, sigs: f.signatures }));
  // Drop zero-score files: when the query shares no token with any signature or
  // path, every file scores 0 and the order is meaningless — return nothing
  // rather than arbitrary files.
  const ranked = bm25rank(query.slice(0, 300), candidates)
    .filter((r) => r.score > 0)
    .slice(0, 12);
  const max = ranked[0]?.score ?? 0;

  return NextResponse.json({
    query,
    results: ranked.map((r) => ({
      path: r.file,
      score: r.score,
      sigCount: r.sigs.length,
      confidence: confidenceFor(r.score, max),
    })),
  });
}
