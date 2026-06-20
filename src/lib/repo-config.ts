import type { RepoBlob } from "@/lib/github";
import { suggestRepoConfig } from "@/lib/gemini";

/**
 * Resolves which directories of a repo hold the primary source code, so the
 * analyzer scans the RIGHT files instead of "the N largest files anywhere".
 *
 * Two tiers (mirrors `sigmap init` + an LLM config step):
 *  1. Defaults — SigMap's own srcDirs/exclude (gen-context.config.json defaults),
 *     extended with common non-source dirs (tests, examples, fixtures…).
 *  2. Gemini refinement — tailors srcDirs/exclude to the repo's actual layout.
 *     Falls back to the defaults if Gemini is unavailable or errors.
 */

export interface RepoConfig {
  srcDirs: string[];
  exclude: string[];
  source: "gemini" | "default";
  reasoning?: string;
}

// Mirrors sigmap src/config/defaults.js `srcDirs`.
export const DEFAULT_SRC_DIRS = [
  "src", "app", "lib", "packages", "services", "api",
  "server", "client", "web", "frontend", "backend",
  "desktop", "mobile", "shared", "common", "core",
  "workers", "functions", "lambda", "cmd",
  "pages", "components", "hooks", "routes", "controllers",
  "models", "views", "resources", "db",
  "projects", "apps", "libs", "blueprints",
];

// Mirrors sigmap's `exclude`, extended with non-source dirs for relevance.
export const DEFAULT_EXCLUDE = [
  "node_modules", ".git", "dist", "build", "out",
  "__pycache__", ".next", "coverage", "target", "vendor",
  ".turbo", "storybook-static", ".docusaurus",
  // non-source dirs that hurt source detection
  "test", "tests", "__tests__", "spec", "specs", "e2e",
  "example", "examples", "samples", "demo", "demos",
  "fixtures", "fixture", "__fixtures__", "benchmark", "benchmarks",
  "bench", "scripts", "script", "docs", "doc", "website",
];

/** A compact tree summary for the LLM: top dirs → file count + sample exts. */
export function summarizeTree(blobs: RepoBlob[], maxDirs = 50): string {
  const dirs = new Map<string, { count: number; exts: Set<string> }>();
  for (const b of blobs) {
    const segs = b.path.split("/");
    // group at depth up to 2 (e.g. "packages/core")
    const key = segs.length === 1 ? "." : segs.slice(0, 2).join("/");
    const ext = b.path.includes(".") ? b.path.split(".").pop()! : "";
    const entry = dirs.get(key) ?? { count: 0, exts: new Set<string>() };
    entry.count += 1;
    if (ext) entry.exts.add(ext);
    dirs.set(key, entry);
  }
  return [...dirs.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxDirs)
    .map(
      ([dir, { count, exts }]) =>
        `${dir}  (${count} files; ${[...exts].slice(0, 6).join(",")})`
    )
    .join("\n");
}

/** Resolve the source config for a repo (Gemini-refined, defaults fallback). */
export async function resolveRepoConfig(
  blobs: RepoBlob[],
  repo: { owner: string; name: string }
): Promise<RepoConfig> {
  const suggested = await suggestRepoConfig(summarizeTree(blobs), repo);
  const cleaned = suggested ? normalizeDirs(suggested.srcDirs) : [];
  if (suggested && cleaned.length > 0) {
    return {
      srcDirs: cleaned,
      // always keep the hard build-artifact excludes, plus any LLM additions
      exclude: dedupe([...DEFAULT_EXCLUDE, ...suggested.exclude]),
      source: "gemini",
      reasoning: suggested.reasoning,
    };
  }
  return {
    srcDirs: DEFAULT_SRC_DIRS,
    exclude: DEFAULT_EXCLUDE,
    source: "default",
  };
}

/** Keep blobs that live under a source dir (or repo root) and aren't excluded. */
export function selectByConfig(
  blobs: RepoBlob[],
  config: RepoConfig
): RepoBlob[] {
  const excluded = new Set(config.exclude);
  return blobs.filter((b) => {
    const segs = b.path.split("/");
    if (segs.slice(0, -1).some((s) => excluded.has(s))) return false;

    const isRoot = segs.length === 1; // top-level entry files (e.g. index.ts)
    const underSrc = config.srcDirs.some(
      (dir) => b.path === dir || b.path.startsWith(`${dir}/`)
    );
    return isRoot || underSrc;
  });
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** Strip leading "./" and trailing "/" so dir matching is reliable. */
function normalizeDirs(dirs: string[]): string[] {
  return dedupe(
    dirs
      .map((d) => d.trim().replace(/^\.\//, "").replace(/\/+$/, ""))
      .filter((d) => d.length > 0 && d !== ".")
  );
}
