/**
 * Validated benchmark results, baked as static data (no API/ACU cost to render).
 * Source: locally reproduced 2026-06 with SigMap v7.30 — full methodology and raw
 * artifacts in the open benchmark-suite repo (see METHODOLOGY_URL). These are real
 * measured numbers, not marketing estimates.
 */

export const METHODOLOGY_URL =
  "https://github.com/manojmallick/sigmap-benchmark-suite";

/** Headline numbers — deterministic, reproducible measurements. */
export const HEADLINE = [
  { value: "~99%", label: "fewer tokens", sub: "98.7% overall, 405 repos" },
  { value: "96×", label: "cheaper context", sub: "51 real coding tasks" },
  { value: "82.4%", label: "retrieval hit@5", sub: "BM25 re-ranker, +7pts" },
] as const;

/** Experiment 1 — whole-repo signature extraction at scale. */
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

/** Experiment 2 — answering 51 real coding tasks with vs without SigMap. */
export const TASKS = {
  count: 51,
  repos: 17,
  reductionPct: 99.2,
  cheaperX: 96,
  tokensBefore: 5_742_562,
  tokensAfter: 45_866,
  costBefore: 1.7261,
  costAfter: 0.0179,
  retrievalPct: 62.7, // share of tasks with the right file in top-5
} as const;

/**
 * Experiment 3 — does the token saving make a real agent (Devin) faster?
 * Honest answer after a 3-rep A/B (A = no SigMap, B = SigMap context): no robust
 * wall-clock difference. Completed sessions averaged ~the same; per-session
 * variance is high and some runs exceeded our 30-min measurement cap. We do NOT
 * claim an agent-speed number until it replicates cleanly. (An early single run
 * looked like a big win, but that was n=1 noise.)
 */
export const AGENT = {
  reps: 3,
  tasks: 5,
  completedAMin: 8.4, // mean wall-clock of completed control sessions
  completedBMin: 8.0, // mean wall-clock of completed SigMap sessions
  verdict: "no robust speed difference (within noise)",
} as const;

/** Honest caveats — shown on the page so the numbers are trustworthy. */
export const CAVEATS = [
  "84 of 405 repos use languages SigMap doesn't yet parse (Clojure/Lua/C/C++/Haskell) — excluded from the headline, not hidden.",
  "Retrieval precision is the ceiling: even the BM25 re-ranker (82.4% hit@5) sometimes surfaces a neighbour file, not the exact target.",
  "We did NOT find a reproducible agent wall-clock speedup: a 3-rep Devin A/B came out within noise (8.4 vs 8.0 min on completed runs), with high variance and some sessions exceeding our 30-min cap. The token/cost savings below are deterministic; the agent-speed question is still open.",
  "Devin's ACUs (its billing unit) aren't exposed by the API — only on its dashboard — so cost-per-task on the agent side is not yet measured.",
];
