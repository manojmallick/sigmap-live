import { rank } from "sigmap";
import {
  getDefaultBranch,
  GitHubError,
  parseRepoUrl,
} from "@/lib/github";
import { runSigmap } from "@/lib/sigmap-cli";
import { cacheKey, withCache } from "@/lib/cache";
import type { ContextFile, ContextMap } from "@/lib/types";

/**
 * SigMap wrapper.
 *
 * Drives the real SigMap CLI on a downloaded copy of the repo (see
 * sigmap-cli.ts) so the demo reports SigMap's own numbers — same as running
 * `npx sigmap` locally. SigMap handles source-folder detection and coverage;
 * we read back the full signature index and optionally rank it for display.
 */

const EXT_LANGUAGE: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript", py: "python", go: "go", rb: "ruby",
  java: "java", rs: "rust", cs: "csharp", kt: "kotlin", kts: "kotlin",
  php: "php", swift: "swift", scala: "scala",
};

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  return (ext && EXT_LANGUAGE[ext]) || "other";
}

function estimateTokens(sigs: string[]): number {
  return Math.ceil(sigs.join("\n").length / 4);
}

export async function analyzeRepo(
  rawUrl: string,
  query?: string
): Promise<ContextMap> {
  const { owner, name, branch: pinnedBranch } = parseRepoUrl(rawUrl);
  const intent = (query?.trim() || "main entry points and public API").slice(0, 300);

  return withCache(cacheKey("analyze", owner, name, pinnedBranch ?? "", intent), async () => {
    const branch = pinnedBranch ?? (await getDefaultBranch(owner, name));

    // Generation is the expensive step and is query-independent — cache it
    // per repo+branch so different queries reuse the same SigMap run.
    const run = await withCache(cacheKey("sigmap-run", owner, name, branch), () =>
      runSigmap(owner, name, branch)
    );

    if (run.entries.length === 0) {
      throw new GitHubError(
        "SigMap found no source files in standard folders (src, lib, app, " +
          "packages…). This repo may keep its code at the root.",
        422
      );
    }

    // Rank all included files by relevance to the intent (ordering only —
    // every file SigMap included is kept).
    const index = new Map(run.entries);
    const ranked = rank(intent, index, { topK: index.size });

    const files: ContextFile[] = ranked.map((r) => ({
      path: r.file,
      language: languageFor(r.file),
      signatures: r.sigs,
      score: r.score,
      tokens: r.tokens || estimateTokens(r.sigs),
      confidence: r.confidence,
    }));

    return {
      repo: {
        owner,
        name,
        branch,
        url: `https://github.com/${owner}/${name}`,
      },
      query: intent,
      sigmapVersion: run.version,
      files,
      stats: {
        rawTokens: run.rawTokens,
        mappedTokens: run.mappedTokens,
        reduction: run.reduction,
        filesScanned: run.filesScanned,
        filesReturned: files.length,
        symbolsFound: run.symbolsFound,
        coverageGrade: run.coverageGrade,
        filesIncluded: run.filesIncluded,
        filesTotal: run.filesTotal,
      },
      redacted: run.redacted,
      generatedAt: Date.now(),
    } satisfies ContextMap;
  });
}
