/**
 * Validated benchmark results, baked as static data (no API/ACU cost to render).
 * Source: locally reproduced 2026-06 with SigMap v7.30 — full methodology and raw
 * artifacts in the open benchmark-suite repo (see METHODOLOGY_URL). These are real
 * measured numbers, not marketing estimates.
 */

export const METHODOLOGY_URL =
  "https://github.com/manojmallick/sigmap-benchmark-suite";

/** Headline numbers across the three experiments. */
export const HEADLINE = [
  { value: "~99%", label: "fewer tokens", sub: "98.7% overall, 405 repos" },
  { value: "96×", label: "cheaper context", sub: "51 real coding tasks" },
  { value: "61%", label: "faster AI agent", sub: "Devin A/B, 4 of 5 tasks" },
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

/** Experiment 3 — same task through Devin twice (A = no SigMap, B = SigMap). */
export const DEVIN: {
  task: string;
  repo: string;
  size: string;
  aMin: number;
  bMin: number;
}[] = [
  { task: "Cluster reachability API", repo: "akka", size: "huge", aMin: 12.5, bMin: 3.2 },
  { task: "Emit-not-declared warning", repo: "vue-core", size: "large", aMin: 30.6, bMin: 8.9 },
  { task: "Redact logging header", repo: "okhttp", size: "large", aMin: 7.0, bMin: 3.8 },
  { task: "Cache-Control decorator", repo: "flask", size: "small", aMin: 4.5, bMin: 3.9 },
  { task: "AST expression range", repo: "rust-analyzer", size: "huge", aMin: 2.1, bMin: 2.4 },
];

export const DEVIN_SUMMARY = {
  avgABefore: 11.3,
  avgBAfter: 4.5,
  avgSavedPct: 61,
} as const;

/** Honest caveats — shown on the page so the numbers are trustworthy. */
export const CAVEATS = [
  "84 of 405 repos use languages SigMap doesn't yet parse (Clojure/Lua/C/C++/Haskell) — excluded from the headline, not hidden.",
  "Retrieval precision (62.7% hit@5) is the ceiling: a lexical ranker sometimes surfaces a neighbour file, not the exact target.",
  "Devin numbers are a single run per task (the agent is stochastic) and exclude ACUs, which Devin only reports on its dashboard.",
  "Token & cost figures are model-reported and deterministic; agent wall-clock is a softer signal that grows with repo size.",
];
