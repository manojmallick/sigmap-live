import { Redis } from "@upstash/redis";

/**
 * Shared Upstash Redis client. Vercel's Upstash integration injects
 * KV_REST_API_*; the standalone SDK uses UPSTASH_REDIS_REST_*. Accept either.
 * `null` when unconfigured (local dev) — callers degrade gracefully.
 */
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
