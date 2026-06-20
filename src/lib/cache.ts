import { createHash } from "node:crypto";

/**
 * In-memory SHA-256 response cache.
 *
 * Per CLAUDE.md: no database, no localStorage — in-memory only.
 * On Vercel this lives for the lifetime of a warm function instance, which is
 * plenty for the demo's repeat-request pattern. Entries expire after `ttlMs`.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 1000 * 60 * 15; // 15 minutes

/** Hash any JSON-serialisable key material into a stable cache key. */
export function cacheKey(...parts: unknown[]): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(parts));
  return hash.digest("hex");
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < nowMs()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): T {
  store.set(key, { value, expiresAt: nowMs() + ttlMs });
  return value;
}

/** Get-or-compute helper. */
export async function withCache<T>(
  key: string,
  compute: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  const value = await compute();
  return setCached(key, value, ttlMs);
}

function nowMs(): number {
  return Date.now();
}
