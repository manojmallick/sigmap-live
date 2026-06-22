import { NextResponse } from "next/server";
import { CURATED } from "@/lib/curated";
import { geminiTimed } from "@/lib/gemini";
import { downloadAndConcatSource } from "@/lib/sigmap-cli";
import { loadAnalysis, saveComparison } from "@/lib/store";
import type { Comparison } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const QUESTION =
  "Summarize what this project does and describe its main public API.";

function preview(s: string): string {
  return s.length > 400 ? s.slice(0, 400) + "…" : s;
}

/**
 * Precompute the "with vs without SigMap" benchmark for each curated repo:
 * answer the same question once over the SigMap context map and once over the
 * raw source, recording real tokens / latency / cost. Seeded (never on-demand)
 * because the raw call is large and slow — which is the whole point.
 */
export async function GET(request: Request) {
  const cron = process.env.CRON_SECRET;
  const seed = process.env.SEED_SECRET;
  const authorized =
    (cron && request.headers.get("authorization") === `Bearer ${cron}`) ||
    (seed && request.headers.get("x-seed-secret") === seed) ||
    (!cron && !seed);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ repo: string; ok: boolean }> = [];
  for (const c of CURATED) {
    try {
      const map = await loadAnalysis(c.repoId);
      if (!map?.output) {
        results.push({ repo: c.repoId, ok: false });
        continue;
      }
      const raw = await downloadAndConcatSource(
        map.repo.owner,
        map.repo.name,
        map.repo.branch
      );

      const withRes = await geminiTimed(map.output, QUESTION, Date.now());
      const withoutRes = await geminiTimed(raw.text, QUESTION, Date.now());
      if (!withRes || !withoutRes) {
        results.push({ repo: c.repoId, ok: false });
        continue;
      }

      const comparison: Comparison = {
        repoId: c.repoId.toLowerCase(),
        question: QUESTION,
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        withSigmap: {
          promptTokens: withRes.promptTokens,
          latencyMs: withRes.latencyMs,
          cost: withRes.cost,
          answerPreview: preview(withRes.answer),
        },
        withoutSigmap: {
          promptTokens: withoutRes.promptTokens,
          latencyMs: withoutRes.latencyMs,
          cost: withoutRes.cost,
          answerPreview: preview(withoutRes.answer),
        },
        rawCapped: raw.capped,
        generatedAt: Date.now(),
      };
      await saveComparison(comparison);
      results.push({ repo: c.repoId, ok: true });
    } catch {
      results.push({ repo: c.repoId, ok: false });
    }
  }

  return NextResponse.json({
    done: results.filter((r) => r.ok).length,
    total: CURATED.length,
    results,
  });
}
