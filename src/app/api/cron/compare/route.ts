import { NextResponse } from "next/server";
import { CURATED } from "@/lib/curated";
import { geminiTimed } from "@/lib/gemini";
import { downloadAndConcatSource, judgeResponse } from "@/lib/sigmap-cli";
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
 * Single-call LLM latency is noisy, so sample twice and keep the best (lowest)
 * latency per side — tokens are deterministic, so this just denoises timing.
 */
async function bestTimed(context: string, question: string) {
  const runs = [];
  for (let i = 0; i < 2; i++) {
    const r = await geminiTimed(context, question, Date.now());
    if (r) runs.push(r);
  }
  if (runs.length === 0) return null;
  return runs.reduce((a, b) => (b.latencyMs < a.latencyMs ? b : a));
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

      const withRes = await bestTimed(map.output, QUESTION);
      const withoutRes = await bestTimed(raw.text, QUESTION);
      if (!withRes || !withoutRes) {
        results.push({ repo: c.repoId, ok: false });
        continue;
      }

      // Same-quality proof: judge BOTH answers against the real source (ground
      // truth) — a fair common baseline — to show the SigMap answer is as
      // grounded in the actual code as the raw-context answer.
      const [withJudge, withoutJudge] = await Promise.all([
        judgeResponse(raw.text, withRes.answer).catch(() => ({ score: 0 })),
        judgeResponse(raw.text, withoutRes.answer).catch(() => ({ score: 0 })),
      ]);

      const comparison: Comparison = {
        repoId: c.repoId.toLowerCase(),
        question: QUESTION,
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        withSigmap: {
          promptTokens: withRes.promptTokens,
          latencyMs: withRes.latencyMs,
          cost: withRes.cost,
          groundedness: withJudge.score,
          answerPreview: preview(withRes.answer),
        },
        withoutSigmap: {
          promptTokens: withoutRes.promptTokens,
          latencyMs: withoutRes.latencyMs,
          cost: withoutRes.cost,
          groundedness: withoutJudge.score,
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
