/**
 * Benchmark results, baked as static data (no API cost to render).
 *
 * The OFFICIAL numbers mirror the SigMap source of truth — `benchmarks/latest.json`
 * in the core repo (synced to sigmap.io). The SCALE / TASKS / AGENT blocks are our
 * own independent, larger reproductions, kept consistent with the official figures.
 */

export const METHODOLOGY_URL =
  "https://github.com/manojmallick/sigmap-benchmark-suite";
export const OFFICIAL_URL = "https://sigmap.io/guide/benchmark.html";

/**
 * Official SigMap benchmark — the canonical numbers from the core repo's
 * `benchmarks/latest.json` (id sigmap-v8.9-main), the same figures shown on
 * sigmap.io. Generated from the benchmark suite, never hand-typed there.
 */
export const OFFICIAL = {
  version: "v8.9",
  reposToken: 21,
  reposRetrieval: 18,
  tasks: 90,
  hitAt5Pct: 87.8,
  baselineHitAt5Pct: 13.6,
  retrievalLiftX: 6.5,
  tokenReductionPct: 97,
  taskSuccessPct: 67.8,
  baselineTaskSuccessPct: 10,
  promptsPerTask: 1.44,
  baselinePromptsPerTask: 2.84,
  promptReductionPct: 49.2,
} as const;

/** Headline numbers — the official SigMap benchmark (matches sigmap.io). */
export const HEADLINE = [
  { value: "97%", label: "fewer tokens", sub: "official · 21 repos" },
  { value: "87.8%", label: "retrieval hit@5", sub: "vs 13.6% baseline · 6.5× lift" },
  { value: "67.8%", label: "task success", sub: "vs 10% without context" },
] as const;

/**
 * Independent extended reproduction — we ran whole-repo extraction 19× larger
 * than the official set (405 repos) to stress-test the token-reduction claim.
 * 98.7% overall is consistent with the official 97%.
 */
export const SCALE = {
  reposProcessed: 405,
  reposSupported: 321,
  reposExcluded: 84, // unsupported languages (Clojure/Lua/C/C++/Haskell)
  avgReductionPct: 95.6,
  overallReductionPct: 98.7,
  tokensBefore: 1_765_696_549,
  tokensAfter: 23_427_118,
  avgHealth: 100,
} as const;

/** Per-language average token reduction (supported languages only). */
export const BY_LANGUAGE: { lang: string; repos: number; reductionPct: number }[] =
  [
    { lang: "Python", repos: 80, reductionPct: 94.8 },
    { lang: "TypeScript", repos: 42, reductionPct: 95.4 },
    { lang: "Rust", repos: 38, reductionPct: 96.9 },
    { lang: "Go", repos: 38, reductionPct: 96.5 },
    { lang: "JavaScript", repos: 31, reductionPct: 93.9 },
    { lang: "Java", repos: 25, reductionPct: 96.6 },
    { lang: "PHP", repos: 14, reductionPct: 94.6 },
    { lang: "Ruby", repos: 13, reductionPct: 96.4 },
    { lang: "C#", repos: 10, reductionPct: 96.9 },
    { lang: "Kotlin", repos: 9, reductionPct: 95.2 },
    { lang: "Swift", repos: 8, reductionPct: 98.3 },
    { lang: "Dart", repos: 6, reductionPct: 94.1 },
    { lang: "Scala", repos: 4, reductionPct: 97.1 },
    { lang: "Svelte", repos: 2, reductionPct: 91.4 },
    { lang: "Vue", repos: 1, reductionPct: 94.9 },
  ];

/** Cost analysis — answering 51 real coding tasks with vs without SigMap. */
export const TASKS = {
  count: 51,
  repos: 17,
  reductionPct: 99.2,
  cheaperX: 96,
  tokensBefore: 5_742_562,
  tokensAfter: 45_866,
  costBefore: 1.7261,
  costAfter: 0.0179,
  retrievalPct: 62.7, // right file in top-5 on this broad set (harder than the curated 18)
} as const;

/**
 * Agent A/B — does the token saving make a real agent (Devin) faster? Honest
 * answer after a 3-rep A/B: no robust wall-clock difference (within noise). An
 * early single run looked like a big win, but that was n=1 noise.
 */
export const AGENT = {
  reps: 3,
  tasks: 5,
  completedAMin: 8.4,
  completedBMin: 8.0,
  verdict: "no robust speed difference (within noise)",
} as const;

/** Honest caveats — shown on the page so the numbers are trustworthy. */
export const CAVEATS = [
  `The headline figures are the official SigMap benchmark (${OFFICIAL.version}, ${OFFICIAL.reposToken} repos, ${OFFICIAL.tasks} tasks) — synced from the core repo, same as sigmap.io.`,
  "The 405-repo run is our own independent stress test; 84 use languages SigMap doesn't yet parse (Clojure/Lua/C/C++/Haskell) and are excluded, not hidden.",
  "Retrieval on the broad 405-repo set is lower than the official 87.8% — a wider, messier corpus is harder than the curated benchmark set.",
  "We did NOT find a reproducible agent wall-clock speedup: a 3-rep Devin A/B came out within noise (8.4 vs 8.0 min). Token/cost savings are deterministic; agent-speed is still open.",
];
