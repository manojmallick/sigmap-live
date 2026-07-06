import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";

/**
 * Lightweight visitor analytics on top of the existing Upstash Redis.
 *
 * - "active now"      = distinct visitors seen in the last ACTIVE_WINDOW (a
 *   sorted set of id → last-seen ms, counted within the window).
 * - "total visitors"  = distinct visitors ever (a HyperLogLog — O(1) memory,
 *   approximate, no per-visitor storage).
 *
 * Privacy: the visitor id is a truncated SHA-256 of the IP — no raw IP or
 * cookie is stored, and there's no client-side storage. Degrades to null when
 * Redis is unconfigured (local dev) so callers can hide the widget.
 */

const PRESENCE_KEY = "presence:live"; // ZSET id -> last-seen ms
const VISITORS_KEY = "visitors:total"; // HyperLogLog of visitor ids
const ACTIVE_WINDOW_MS = 90_000; // seen in the last 90s counts as "active"

export interface PresenceStats {
  active: number;
  total: number;
}

function visitorId(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Record a heartbeat and return live counts. Command budget per call:
 * heartbeat ≈ 3 (zadd + zcount + pfcount); first visit adds pfadd; the old-entry
 * prune runs opportunistically (~1 in 5) to keep the presence set small.
 */
export async function recordPresence(
  ip: string,
  opts: { first?: boolean } = {}
): Promise<PresenceStats | null> {
  if (!redis) return null;
  const id = visitorId(ip);
  const now = Date.now();
  const cutoff = now - ACTIVE_WINDOW_MS;

  try {
    await redis.zadd(PRESENCE_KEY, { score: now, member: id });
    if (opts.first) await redis.pfadd(VISITORS_KEY, id);
    if (Math.random() < 0.2) await redis.zremrangebyscore(PRESENCE_KEY, 0, cutoff);

    const [active, total] = await Promise.all([
      redis.zcount(PRESENCE_KEY, cutoff, "+inf"),
      redis.pfcount(VISITORS_KEY),
    ]);
    return { active: Number(active) || 0, total: Number(total) || 0 };
  } catch {
    return null; // never let analytics break a page
  }
}
