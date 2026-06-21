import { redis } from "@/lib/redis";
import type { ContextMap } from "@/lib/types";

/**
 * Persists analysis results (the tiny redacted signature map — never source)
 * in Upstash so the gallery and permalinks load instantly with zero quota.
 * Degrades to no-op when Upstash isn't configured.
 */

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SavedSummary {
  repoId: string;
  reduction: number;
  filesIncluded: number;
  filesTotal: number;
  rawTokens: number;
  mappedTokens: number;
  sigmapVersion: string;
  generatedAt: number;
}

function repoKey(repoId: string): string {
  return repoId.trim().toLowerCase();
}

function summaryOf(map: ContextMap): SavedSummary {
  return {
    repoId: `${map.repo.owner}/${map.repo.name}`.toLowerCase(),
    reduction: map.stats.reduction,
    filesIncluded: map.stats.filesIncluded,
    filesTotal: map.stats.filesTotal,
    rawTokens: map.stats.rawTokens,
    mappedTokens: map.stats.mappedTokens,
    sigmapVersion: map.sigmapVersion,
    generatedAt: map.generatedAt,
  };
}

/** Save the canonical (auto-detected) analysis for a repo. */
export async function saveAnalysis(map: ContextMap): Promise<void> {
  if (!redis) return;
  const key = repoKey(`${map.repo.owner}/${map.repo.name}`);
  await Promise.all([
    redis.set(`analysis:${key}`, map, { ex: TTL_SECONDS }),
    redis.set(`summary:${key}`, summaryOf(map), { ex: TTL_SECONDS }),
  ]);
}

export async function loadAnalysis(repoId: string): Promise<ContextMap | null> {
  if (!redis) return null;
  return (await redis.get<ContextMap>(`analysis:${repoKey(repoId)}`)) ?? null;
}

export async function loadSummary(
  repoId: string
): Promise<SavedSummary | null> {
  if (!redis) return null;
  return (await redis.get<SavedSummary>(`summary:${repoKey(repoId)}`)) ?? null;
}
