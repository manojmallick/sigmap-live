import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/**
 * Per-IP daily limits for the public demo (free tier):
 *   - 20 distinct repos per day — analysis is cheap (SigMap CLI, no LLM),
 *     and re-running the SAME repo is free, so the config editor doesn't
 *     burn quota.
 *   - 5 questions per day — this is the binding limit because "Ask the
 *     codebase" is the only feature that makes a (paid) Gemini call.
 *
 * Backed by Upstash Redis (serverless-correct, survives across function
 * instances). If Upstash isn't configured the limiter degrades to a no-op
 * (enforced:false) so local dev and pre-provision deploys still work.
 */

export const REPO_LIMIT = 20;
export const ASK_LIMIT = 5;

/** 5 questions per IP per rolling day. */
const askLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(ASK_LIMIT, "1 d"),
      prefix: "rl:ask",
      analytics: false,
    })
  : null;

export interface LimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  /** Whether a real store is enforcing this (false = Upstash not configured). */
  enforced: boolean;
}

/** Best-effort client IP from Vercel's forwarding headers. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Distinct-repo limiter: allows up to REPO_LIMIT unique repos per IP per day.
 * Re-analyzing a repo already counted today is always allowed (returns ok).
 */
export async function checkRepoLimit(
  ip: string,
  repoId: string
): Promise<LimitResult> {
  if (!redis) {
    return { ok: true, remaining: REPO_LIMIT, limit: REPO_LIMIT, enforced: false };
  }
  const key = `rl:repos:${ip}:${utcDay()}`;
  const already = await redis.sismember(key, repoId);
  if (already) {
    const used = await redis.scard(key);
    return {
      ok: true,
      remaining: Math.max(0, REPO_LIMIT - used),
      limit: REPO_LIMIT,
      enforced: true,
    };
  }
  const used = await redis.scard(key);
  if (used >= REPO_LIMIT) {
    return { ok: false, remaining: 0, limit: REPO_LIMIT, enforced: true };
  }
  await redis.sadd(key, repoId);
  await redis.expire(key, 60 * 60 * 48); // safety TTL (2 days)
  return {
    ok: true,
    remaining: Math.max(0, REPO_LIMIT - (used + 1)),
    limit: REPO_LIMIT,
    enforced: true,
  };
}

/** Per-IP daily question limiter. */
export async function checkAskLimit(ip: string): Promise<LimitResult> {
  if (!askLimiter) {
    return { ok: true, remaining: ASK_LIMIT, limit: ASK_LIMIT, enforced: false };
  }
  const r = await askLimiter.limit(ip);
  return {
    ok: r.success,
    remaining: r.remaining,
    limit: ASK_LIMIT,
    enforced: true,
  };
}
