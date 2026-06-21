import { execFile } from "node:child_process";
import { mkdtemp, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { promisify } from "node:util";
import * as tar from "tar";
import { buildSigIndex } from "sigmap";
import { GitHubError } from "@/lib/github";
import type { RepoConfigInput } from "@/lib/types";

const execFileAsync = promisify(execFile);

/**
 * Runs the real SigMap CLI (gen-context.js) on a freshly downloaded copy of a
 * repo, so the demo reports SigMap's own numbers — identical to running
 * `npx sigmap` locally — instead of a reimplementation. SigMap does its own
 * source-folder detection and coverage budgeting; we just drive it and read
 * back the generated signature index.
 */

export interface SigmapRun {
  /** file → signatures, for every source file SigMap included. */
  entries: Array<[string, string[]]>;
  filesScanned: number;
  symbolsFound: number;
  rawTokens: number;
  mappedTokens: number;
  /** e.g. 0.93 */
  reduction: number;
  coverageGrade: string;
  filesIncluded: number;
  filesTotal: number;
  redacted: boolean;
  version: string;
  /** The generated .github/copilot-instructions.md content. */
  output: string;
  /** SigMap's own note about coverage/budget (tips printed to stderr). */
  coverageNote: string;
}

/** Resolve the gen-context.js CLI shipped inside the sigmap package.
 *
 * Uses the runtime CommonJS require (via eval) so the bundler doesn't rewrite
 * require.resolve into a numeric module id. Falls back to a cwd-relative path. */
function resolveCliPath(): string {
  try {
    const nodeRequire = (0, eval)("require") as NodeJS.Require;
    const core = nodeRequire.resolve("sigmap"); // <root>/packages/core/index.js
    return join(dirname(dirname(dirname(core))), "gen-context.js");
  } catch {
    return join(process.cwd(), "node_modules", "sigmap", "gen-context.js");
  }
}

function parseInt0(s: string | undefined): number {
  return s ? parseInt(s.replace(/,/g, ""), 10) || 0 : 0;
}

/** Parse the stats block the CLI prints to stdout. */
function parseStats(stdout: string) {
  const filesScanned = parseInt0(/Files scanned\s*:\s*([\d,]+)/.exec(stdout)?.[1]);
  const symbolsFound = parseInt0(/Symbols found\s*:\s*([\d,]+)/.exec(stdout)?.[1]);
  const red = /Token reduction:\s*(\d+)%\s*\(([\d,]+)\s*(?:→|->|-?>)\s*([\d,]+)\)/.exec(
    stdout
  );
  const cov = /Coverage\s*:\s*([A-F])\s*\((\d+)%\).*?(\d+)\s+of\s+(\d+)\s+source files/.exec(
    stdout
  );
  const version = /SigMap v([\d.]+)/.exec(stdout)?.[1] ?? "unknown";

  // SigMap prints actionable tips (e.g. "large repo — consider per-module")
  // and a budget annotation on the coverage line — capture both as the note.
  const tips = [...stdout.matchAll(/tip:\s*(.+)/gi)].map((m) =>
    m[1].trim().replace(/^["']|["']$/g, "")
  );
  const budget = /Coverage[^\n]*\[([^\]]+)\]/.exec(stdout)?.[1];
  const note = [budget, ...tips].filter(Boolean).join(" · ");

  return {
    filesScanned,
    symbolsFound,
    rawTokens: parseInt0(red?.[2]),
    mappedTokens: parseInt0(red?.[3]),
    reduction: red ? parseInt0(red[1]) / 100 : 0,
    coverageGrade: cov?.[1] ?? "?",
    filesIncluded: parseInt0(cov?.[3]),
    filesTotal: parseInt0(cov?.[4]),
    version,
    note,
  };
}

export async function runSigmap(
  owner: string,
  name: string,
  branch: string,
  config?: RepoConfigInput | null
): Promise<SigmapRun> {
  const work = await mkdtemp(join(tmpdir(), "sigmap-"));
  try {
    // 1. Download + extract the repo tarball (one request, not N file fetches).
    const tarUrl = `https://codeload.github.com/${owner}/${name}/tar.gz/refs/heads/${encodeURIComponent(
      branch
    )}`;
    const res = await fetch(tarUrl, {
      headers: { "User-Agent": "sigmap-live" },
    });
    if (!res.ok) {
      throw new GitHubError(`Could not download repository (${res.status}).`, 502);
    }
    const tgz = join(work, "repo.tgz");
    await writeFile(tgz, Buffer.from(await res.arrayBuffer()));
    // Pure-JS extraction — the Vercel function runtime has no system `tar`.
    await tar.x({ file: tgz, cwd: work });

    // codeload extracts to a single <name>-<branch>/ directory.
    const dirs = (await readdir(work, { withFileTypes: true })).filter((d) =>
      d.isDirectory()
    );
    if (dirs.length === 0) {
      throw new GitHubError("Downloaded archive was empty.", 502);
    }
    const repoDir = join(work, dirs[0].name);

    // If the user supplied a config override, write it so SigMap uses it.
    const hasUserConfig = !!config && Object.keys(config).length > 0;
    if (hasUserConfig) {
      await writeFile(
        join(repoDir, "gen-context.config.json"),
        JSON.stringify(config)
      );
    }

    // 2. Run the real SigMap CLI in that directory.
    const cli = resolveCliPath();
    const runCli = async () => {
      const { stdout, stderr } = await execFileAsync(process.execPath, [cli], {
        cwd: repoDir,
        // keep any home-dir writes (MCP auto-register) inside the sandbox
        env: { ...process.env, HOME: work },
        timeout: 50_000, // fail cleanly within the function's 60s budget
        maxBuffer: 16 * 1024 * 1024,
      });
      // SigMap prints its summary block to stderr — parse both streams.
      return parseStats(`${stdout}\n${stderr}`);
    };

    let stats = await runCli();
    let index = buildSigIndex(repoDir);

    // Fallback: SigMap only scans standard source folders by default. Repos
    // that keep code at the root (e.g. a single index.js) scan to zero — add
    // the root to srcDirs and re-run. Triggered whenever nothing was found and
    // the caller didn't pin srcDirs themselves (their other config is merged).
    const userSetSrcDirs = !!config?.srcDirs && config.srcDirs.length > 0;
    if (index.size === 0 && !userSetSrcDirs) {
      await writeFile(
        join(repoDir, "gen-context.config.json"),
        JSON.stringify({
          ...(config ?? {}),
          srcDirs: ["."],
          maxDepth: Math.max(config?.maxDepth ?? 0, 4),
          exclude: config?.exclude ?? [
            "node_modules",
            ".git",
            "dist",
            "build",
            "test",
            "tests",
          ],
        })
      );
      stats = await runCli();
      index = buildSigIndex(repoDir);
    }

    // 3. Read back the full signature index SigMap generated.
    const entries = [...index.entries()];
    const redacted = entries.some(([, sigs]) =>
      sigs.some((s) => s.includes("REDACTED"))
    );

    // The actual artifact SigMap writes — what an agent would consume.
    let output = "";
    try {
      output = await readFile(
        join(repoDir, ".github", "copilot-instructions.md"),
        "utf8"
      );
      if (output.length > 500_000) {
        output = output.slice(0, 500_000) + "\n\n… (truncated)";
      }
    } catch {
      // no output file — leave empty
    }

    return {
      entries,
      filesScanned: stats.filesScanned || entries.length,
      symbolsFound:
        stats.symbolsFound ||
        entries.reduce((n, [, s]) => n + s.length, 0),
      rawTokens: stats.rawTokens,
      mappedTokens: stats.mappedTokens,
      // Precise ratio — SigMap only prints a rounded integer % to stdout.
      reduction:
        stats.rawTokens > 0
          ? 1 - stats.mappedTokens / stats.rawTokens
          : stats.reduction,
      coverageGrade: stats.coverageGrade,
      filesIncluded: stats.filesIncluded || entries.length,
      filesTotal: stats.filesTotal || entries.length,
      redacted,
      version: stats.version,
      output,
      coverageNote: stats.note,
    };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
