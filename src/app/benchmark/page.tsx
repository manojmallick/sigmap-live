import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchOfficial,
  headlineFrom,
  caveatsFrom,
  OFFICIAL_URL,
  SCALE,
  BY_LANGUAGE,
  TASKS,
  AGENT,
  METHODOLOGY_URL,
} from "@/lib/benchmark-data";

export const metadata: Metadata = {
  title: "SigMap Benchmark — the proof (87.8% hit@5 · 97% fewer tokens · 67.8% task success)",
  description:
    "The official SigMap benchmark: 87.8% retrieval hit@5 (vs 13.6% baseline), 97% token reduction, 67.8% task success across 21 repos / 90 tasks — plus an independent 405-repo reproduction. Reproducible, no LLM API.",
};

// Re-pull the official numbers from the core repo about once a day (ISR).
export const revalidate = 86_400;

const nf = new Intl.NumberFormat("en-US");

export default async function BenchmarkPage() {
  const official = await fetchOfficial();
  const headline = headlineFrom(official);
  const caveats = caveatsFrom(official);
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* Hero */}
      <header className="mb-12 space-y-5">
        <Link
          href="/demo"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to the demo
        </Link>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          The proof, not the pitch —{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            measured, not estimated
          </span>
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Reproduced locally on SigMap v7.30: whole-repo extraction across 405
          repositories, 51 real coding tasks answered with vs without SigMap, and
          a BM25 re-ranker that lifts retrieval. We also A/B-tested a real agent
          (Devin) — and report that result honestly below, win or not. Every
          figure is a real measurement; the full method and raw data are open.
        </p>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {headline.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <dt className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {m.value}
              </dt>
              <dd className="text-sm font-medium">{m.label}</dd>
              <dd className="text-xs text-zinc-500">{m.sub}</dd>
            </div>
          ))}
        </dl>
        <a
          href={METHODOLOGY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Methodology &amp; raw data (open repo) ↗
        </a>
      </header>

      {/* Official benchmark — the canonical sigmap.io numbers */}
      <section className="mb-14 space-y-4">
        <h2 className="text-lg font-bold tracking-tight">
          1 · The official SigMap benchmark ({official.reposToken} repos,{" "}
          {official.tasks} tasks)
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          These are the canonical numbers from the SigMap core repo
          (<code>benchmarks/latest.json</code>, {official.version}) — the same
          figures published on{" "}
          <a
            href={OFFICIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            sigmap.io
          </a>
          . Generated from the benchmark suite, never hand-typed.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: `${official.hitAt5Pct}%`, l: `hit@5 (vs ${official.baselineHitAt5Pct}% baseline)` },
            { v: `${official.retrievalLiftX}×`, l: "retrieval lift" },
            { v: `${official.tokenReductionPct}%`, l: "token reduction" },
            { v: `${official.taskSuccessPct}%`, l: `task success (vs ${official.baselineTaskSuccessPct}%)` },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {s.v}
              </div>
              <div className="text-xs text-zinc-500">{s.l}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Also: {official.promptReductionPct}% fewer prompts per task (
          {official.baselinePromptsPerTask} → {official.promptsPerTask}). No LLM
          API in the measurement — fully reproducible.
        </p>
      </section>

      {/* Extended reproduction — scale */}
      <section className="mb-14 space-y-4">
        <h2 className="text-lg font-bold tracking-tight">
          2 · We reproduced it at scale — {SCALE.reposSupported} repositories
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Independently, we ran whole-repo extraction on {SCALE.reposProcessed}{" "}
          repos ({SCALE.reposSupported} supported) — {nf.format(SCALE.tokensBefore)}{" "}
          → {nf.format(SCALE.tokensAfter)} tokens, a{" "}
          <strong>{SCALE.overallReductionPct}%</strong> overall reduction
          ({SCALE.avgReductionPct}% average per repo). That&apos;s consistent with
          the official {official.tokenReductionPct}% at ~19× the scale.{" "}
          {SCALE.reposExcluded} repos use languages SigMap doesn&apos;t yet parse
          and are excluded.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: `${SCALE.reposSupported}`, l: "repos supported" },
            { v: `${SCALE.avgReductionPct}%`, l: "avg reduction" },
            { v: `${SCALE.overallReductionPct}%`, l: "overall reduction" },
            { v: `${SCALE.avgHealth}/100`, l: "avg health" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {s.v}
              </div>
              <div className="text-xs text-zinc-500">{s.l}</div>
            </div>
          ))}
        </div>

        {/* per-language bars */}
        <div className="space-y-1.5 pt-2">
          {BY_LANGUAGE.map((row) => (
            <div key={row.lang} className="flex items-center gap-3 text-xs">
              <span className="w-24 shrink-0 text-zinc-600 dark:text-zinc-400">
                {row.lang}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded bg-emerald-500/70"
                  style={{ width: `${row.reductionPct}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-medium tabular-nums">
                {row.reductionPct}%
              </span>
              <span className="w-14 shrink-0 text-right text-zinc-400 tabular-nums">
                {row.repos} repo{row.repos > 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Experiment 2 — tasks */}
      <section className="mb-14 space-y-4">
        <h2 className="text-lg font-bold tracking-tight">
          3 · Real coding tasks — {TASKS.count} tasks, with vs without SigMap
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          For each task we measured the tokens an LLM needs to answer using the
          whole repo versus only the files SigMap ranks. Tokens are
          model-reported; cost is derived.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: `${TASKS.reductionPct}%`, l: "fewer tokens" },
            { v: `${TASKS.cheaperX}×`, l: "cheaper" },
            {
              v: `$${TASKS.costBefore.toFixed(2)}→$${TASKS.costAfter.toFixed(3)}`,
              l: "cost (51 tasks)",
            },
            { v: `${TASKS.retrievalPct}%`, l: "right file in top-5" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {s.v}
              </div>
              <div className="text-xs text-zinc-500">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Experiment 3 — Devin (honest, open result) */}
      <section className="mb-14 space-y-4">
        <h2 className="text-lg font-bold tracking-tight">
          4 · Does it also make a real agent faster? — we tested it honestly
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The savings above are about <strong>context size and cost</strong>, and
          they&apos;re deterministic. A separate question is whether smaller
          context also makes an autonomous agent finish <em>faster</em>. We
          A/B-tested one (Devin) on these tasks — <strong>A</strong> = task only,{" "}
          <strong>B</strong> = SigMap context first — at{" "}
          <strong>{AGENT.reps} reps</strong> each. The honest result:{" "}
          <strong>too close to call.</strong>
        </p>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {AGENT.completedAMin.toFixed(1)}m
              </div>
              <div className="text-xs text-zinc-500">no SigMap (avg, completed)</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {AGENT.completedBMin.toFixed(1)}m
              </div>
              <div className="text-xs text-zinc-500">with SigMap (avg, completed)</div>
            </div>
            <div className="rounded-md bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
              ≈ Tie — within measurement noise
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          <strong>What this means:</strong> this is <em>not</em> evidence SigMap
          slows an agent down — the two are statistically even. The agent&apos;s
          run-to-run variance is simply large (some runs exceeded our 30-min
          measurement cap), so we can&apos;t yet claim a speedup either way. An
          early single run looked like a big win (~61%) but didn&apos;t hold up
          across {AGENT.reps} reps — so we&apos;re showing you the real result,
          not that number. <strong>SigMap&apos;s proven value is the ~99% smaller,
          96× cheaper, better-retrieved context above</strong> — what your agent
          does with that head start is the open question we&apos;re still measuring.
        </p>
      </section>

      {/* Honesty */}
      <section className="mb-14 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-bold tracking-tight">
          What these numbers don&apos;t say
        </h2>
        <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          {caveats.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-zinc-400">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        <span>
          Reproduce it yourself —{" "}
          <a
            href={METHODOLOGY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            open benchmark suite ↗
          </a>
        </span>
        <Link
          href="/demo"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Try the demo →
        </Link>
      </footer>
    </main>
  );
}
