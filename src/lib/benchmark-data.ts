/**
 * Benchmark results, baked as static data (no API cost to render).
 *
 * The OFFICIAL numbers are pulled at build/ISR time from the SigMap core repo's
 * `benchmarks/latest.json` (the same source sigmap.io renders from), so the demo
 * stays in sync automatically. The hardcoded OFFICIAL below is the fallback if
 * the fetch fails. SCALE / TASKS / AGENT are our own independent reproductions.
 */

export const METHODOLOGY_URL =
  "https://github.com/manojmallick/sigmap-benchmark-suite";
export const OFFICIAL_URL = "https://sigmap.io/guide/benchmark.html";
const RAW_LATEST_URL =
  "https://raw.githubusercontent.com/manojmallick/sigmap/main/benchmarks/latest.json";

export interface Official {
  version: string;
  reposToken: number;
  reposRetrieval: number;
  tasks: number;
  hitAt5Pct: number;
  baselineHitAt5Pct: number;
  retrievalLiftX: number;
  tokenReductionPct: number;
  taskSuccessPct: number;
  baselineTaskSuccessPct: number;
  promptsPerTask: number;
  baselinePromptsPerTask: number;
  promptReductionPct: number;
}

/** Fallback / default — mirrors sigmap-v8.9-main; overridden by the live fetch. */
export const OFFICIAL: Official = {
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
};

const round1 = (n: number) => Math.round(n * 10) / 10;
/** Accept a fraction (0.878) or an already-percent value (97). */
const asPct = (x: unknown, fallback: number) =>
  typeof x === "number" ? round1(x <= 1 ? x * 100 : x) : fallback;
const num = (x: unknown, fallback: number) =>
  typeof x === "number" ? x : fallback;

interface LatestJson {
  benchmark_id?: string;
  repos_token?: number;
  repos_retrieval?: number;
  tasks?: number;
  metrics?: {
    hit_at_5?: number;
    baseline_hit_at_5?: number;
    retrieval_lift?: number;
    overall_token_reduction_pct?: number;
    task_success_proxy_pct?: number;
    prompts_per_task?: number;
    baseline_prompts_per_task?: number;
    prompt_reduction_pct?: number;
  };
}

/**
 * Fetch the official numbers from the core repo (ISR-cached ~daily). Falls back
 * to the hardcoded OFFICIAL on any error, so the page never breaks.
 */
export async function fetchOfficial(): Promise<Official> {
  try {
    const res = await fetch(RAW_LATEST_URL, { next: { revalidate: 86_400 } });
    if (!res.ok) return OFFICIAL;
    const j = (await res.json()) as LatestJson;
    const m = j.metrics ?? {};
    const ver = String(j.benchmark_id ?? "").match(/v[\d.]+/)?.[0];
    return {
      version: ver ?? OFFICIAL.version,
      reposToken: num(j.repos_token, OFFICIAL.reposToken),
      reposRetrieval: num(j.repos_retrieval, OFFICIAL.reposRetrieval),
      tasks: num(j.tasks, OFFICIAL.tasks),
      hitAt5Pct: asPct(m.hit_at_5, OFFICIAL.hitAt5Pct),
      baselineHitAt5Pct: asPct(m.baseline_hit_at_5, OFFICIAL.baselineHitAt5Pct),
      retrievalLiftX: num(m.retrieval_lift, OFFICIAL.retrievalLiftX),
      tokenReductionPct: asPct(m.overall_token_reduction_pct, OFFICIAL.tokenReductionPct),
      taskSuccessPct: asPct(m.task_success_proxy_pct, OFFICIAL.taskSuccessPct),
      baselineTaskSuccessPct: OFFICIAL.baselineTaskSuccessPct,
      promptsPerTask: num(m.prompts_per_task, OFFICIAL.promptsPerTask),
      baselinePromptsPerTask: num(m.baseline_prompts_per_task, OFFICIAL.baselinePromptsPerTask),
      promptReductionPct: asPct(m.prompt_reduction_pct, OFFICIAL.promptReductionPct),
    };
  } catch {
    return OFFICIAL;
  }
}

/** Headline cards from the official numbers (matches sigmap.io). */
export function headlineFrom(o: Official) {
  return [
    { value: `${o.tokenReductionPct}%`, label: "fewer tokens", sub: `official · ${o.reposToken} repos` },
    { value: `${o.hitAt5Pct}%`, label: "retrieval hit@5", sub: `vs ${o.baselineHitAt5Pct}% baseline · ${o.retrievalLiftX}× lift` },
    { value: `${o.taskSuccessPct}%`, label: "task success", sub: `vs ${o.baselineTaskSuccessPct}% without context` },
  ];
}

/** Static headline from the fallback — used by the OG card (build-time only). */
export const HEADLINE = headlineFrom(OFFICIAL);

/**
 * Independent extended reproduction — whole-repo extraction 19× larger than the
 * official set (405 repos). 98.7% overall is consistent with the official 97%.
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
  retrievalPct: 62.7,
} as const;

/**
 * Agent A/B — does the token saving make a real agent (Devin) faster? Honest
 * answer after a 3-rep A/B: no robust wall-clock difference (within noise).
 */
export const AGENT = {
  reps: 3,
  tasks: 5,
  completedAMin: 8.4,
  completedBMin: 8.0,
  verdict: "no robust speed difference (within noise)",
} as const;

/** Honest caveats — shown on the page so the numbers are trustworthy. */
export function caveatsFrom(o: Official): string[] {
  return [
    `The headline figures are the official SigMap benchmark (${o.version}, ${o.reposToken} repos, ${o.tasks} tasks) — pulled live from the core repo, same as sigmap.io.`,
    "The 405-repo run is our own independent stress test; 84 use languages SigMap doesn't yet parse (Clojure/Lua/C/C++/Haskell) and are excluded, not hidden.",
    `Retrieval on the broad 405-repo set is lower than the official ${o.hitAt5Pct}% — a wider, messier corpus is harder than the curated benchmark set.`,
    "We did NOT find a reproducible agent wall-clock speedup: a 3-rep Devin A/B came out within noise (8.4 vs 8.0 min). Token/cost savings are deterministic; agent-speed is still open.",
  ];
}
