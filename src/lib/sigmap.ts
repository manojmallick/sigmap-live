import { extract, rank, scan } from "sigmap";
import {
  fetchRaw,
  getDefaultBranch,
  GitHubError,
  listBlobs,
  parseRepoUrl,
  type RepoBlob,
} from "@/lib/github";
import { cacheKey, withCache } from "@/lib/cache";
import type { ContextFile, ContextMap } from "@/lib/types";

/**
 * SigMap wrapper.
 *
 * NOTE: the published `sigmap` package operates on local source text via
 * `extract()` and ranks an in-memory index via `rank()`. It has no remote-URL
 * entry point (the CLAUDE.md `assembleContext()` name predates the shipped API).
 * This wrapper bridges a public GitHub repo to that programmatic API:
 *   fetch source → extract() signatures → scan() redaction → rank() relevance.
 */

/** Map a file extension to a SigMap-supported language. */
const EXT_LANGUAGE: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  go: "go",
  rb: "ruby",
  java: "java",
  rs: "rust",
  cs: "csharp",
  kt: "kotlin",
  kts: "kotlin",
  php: "php",
  swift: "swift",
  scala: "scala",
};

/** Cap source files scanned to keep latency and rate-limit usage bounded. */
const MAX_FILES = 80;
/** Skip very large files (likely generated/vendored). */
const MAX_FILE_BYTES = 200_000;
const IGNORE_DIRS =
  /(^|\/)(node_modules|dist|build|out|vendor|\.next|\.git|__pycache__|target|\.venv)\//;

function languageFor(path: string): string | undefined {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ? EXT_LANGUAGE[ext] : undefined;
}

/** ~4 chars per token — a standard rough estimate for source text. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function selectBlobs(blobs: RepoBlob[]): RepoBlob[] {
  return blobs
    .filter(
      (b) =>
        languageFor(b.path) !== undefined &&
        b.size <= MAX_FILE_BYTES &&
        !IGNORE_DIRS.test(`/${b.path}`)
    )
    .sort((a, b) => b.size - a.size) // prefer substantive files
    .slice(0, MAX_FILES);
}

export async function analyzeRepo(
  rawUrl: string,
  query?: string
): Promise<ContextMap> {
  const { owner, name, branch: pinnedBranch } = parseRepoUrl(rawUrl);
  const intent = (query?.trim() || "main entry points and public API").slice(
    0,
    300
  );

  const key = cacheKey("analyze", owner, name, pinnedBranch ?? "", intent);

  return withCache(key, async () => {
    const branch = pinnedBranch ?? (await getDefaultBranch(owner, name));
    const blobs = selectBlobs(await listBlobs(owner, name, branch));

    if (blobs.length === 0) {
      throw new GitHubError(
        "No supported source files found in this repository.",
        422
      );
    }

    // Fetch + extract signatures per file (concurrently).
    const sigIndex = new Map<string, string[]>();
    const languageByPath = new Map<string, string>();
    let rawTokens = 0;
    let redactedAny = false;

    const fetched = await Promise.all(
      blobs.map(async (blob) => {
        const src = await fetchRaw(owner, name, branch, blob.path);
        return { blob, src };
      })
    );

    for (const { blob, src } of fetched) {
      if (!src) continue;
      const language = languageFor(blob.path)!;
      rawTokens += estimateTokens(src);

      const sigs = extract(src, language);
      if (sigs.length === 0) continue;

      const { safe, redacted } = scan(sigs, blob.path);
      if (redacted) redactedAny = true;

      sigIndex.set(blob.path, safe);
      languageByPath.set(blob.path, language);
    }

    if (sigIndex.size === 0) {
      throw new GitHubError(
        "Could not extract any signatures from this repository.",
        422
      );
    }

    const ranked = rank(intent, sigIndex, { topK: 20 });

    const files: ContextFile[] = ranked.map((r) => ({
      path: r.file,
      language: languageByPath.get(r.file) ?? "unknown",
      signatures: r.sigs,
      score: r.score,
      tokens: r.tokens,
      confidence: r.confidence,
    }));

    const mappedTokens = files.reduce((sum, f) => sum + f.tokens, 0);
    const reduction = rawTokens > 0 ? 1 - mappedTokens / rawTokens : 0;

    return {
      repo: {
        owner,
        name,
        branch,
        url: `https://github.com/${owner}/${name}`,
      },
      query: intent,
      files,
      stats: {
        rawTokens,
        mappedTokens,
        reduction,
        filesScanned: sigIndex.size,
        filesReturned: files.length,
      },
      redacted: redactedAny,
      generatedAt: Date.now(),
    } satisfies ContextMap;
  });
}
