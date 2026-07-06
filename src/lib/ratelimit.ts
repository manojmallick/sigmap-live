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

/**
 * Client IP for rate-limit keys — spoof-resistant.
 *
 * On Vercel, `x-real-ip` is set by the platform to the real connecting IP and
 * is NOT overridable by the client. The LEFT-most `x-forwarded-for` entry is
 * client-supplied, so a user can send `X-Forwarded-For: <random>` to mint a
 * fresh identity every request and dodge per-IP limits — never key off it.
 * Prefer `x-real-ip`; only fall back to the LAST forwarded hop off-Vercel.
 */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    return hops[hops.length - 1] || "0.0.0.0";
  }
  return "0.0.0.0";
}

/** Hard daily ceiling on paid LLM calls across ALL users (distributed-abuse cap). */
export const GLOBAL_ASK_LIMIT = 1000;

/**
 * Circuit breaker: caps total Ask (Gemini) calls per day across every visitor.
 * Per-IP limits can't stop a botnet cycling IPs; this bounds the worst-case
 * spend. Increments a daily counter and returns false once the ceiling is hit.
 */
export async function checkGlobalAskBudget(): Promise<boolean> {
  if (!redis) return true;
  const key = `rl:ask:global:${utcDay()}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60 * 60 * 48);
  return n <= GLOBAL_ASK_LIMIT;
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
