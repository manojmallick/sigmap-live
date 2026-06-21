import { NextResponse } from "next/server";
import { CURATED } from "@/lib/curated";
import { analyzeRepo } from "@/lib/sigmap";
import { saveAnalysis } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Weekly cron (see vercel.json) that re-analyzes the curated gallery repos and
 * refreshes their saved entries, so the 30-day TTL never lapses and stats track
 * upstream changes. Calls analyzeRepo directly — no per-IP limit involved.
 *
 * Auth: Vercel attaches `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET
 * is set. Manual runs may use the x-seed-secret header instead.
 */
export async function GET(request: Request) {
  const cron = process.env.CRON_SECRET;
  const seed = process.env.SEED_SECRET;
  const authorized =
    (cron && request.headers.get("authorization") === `Bearer ${cron}`) ||
    (seed && request.headers.get("x-seed-secret") === seed) ||
    (!cron && !seed); // nothing configured → allow (dev only)

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ repo: string; ok: boolean; reduction?: number }> = [];
  for (const c of CURATED) {
    try {
      const map = await analyzeRepo(`https://github.com/${c.repoId}`);
      await saveAnalysis(map);
      results.push({ repo: c.repoId, ok: true, reduction: map.stats.reduction });
    } catch {
      results.push({ repo: c.repoId, ok: false });
    }
  }

  return NextResponse.json({
    seeded: results.filter((r) => r.ok).length,
    total: CURATED.length,
    results,
  });
}
