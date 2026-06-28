import type { Metadata } from "next";
import Link from "next/link";
import {
  HEADLINE,
  SCALE,
  BY_LANGUAGE,
  TASKS,
  AGENT,
  CAVEATS,
  METHODOLOGY_URL,
} from "@/lib/benchmark-data";

export const metadata: Metadata = {
  title: "SigMap Benchmark — the proof (405 repos · ~99% fewer tokens · 96× cheaper)",
  description:
    "Real, reproducible numbers: SigMap cuts AI coding context by ~99% across 405 repositories, makes task context 96× cheaper, and lifts retrieval hit@5 to 82.4% with a BM25 re-ranker.",
};

const nf = new Intl.NumberFormat("en-US");

export default function BenchmarkPage() {
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
          {HEADLINE.map((m) => (
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

      {/* Experiment 1 — scale */}
      <section className="mb-14 space-y-4">
        <h2 className="text-lg font-bold tracking-tight">
          1 · Token reduction at scale — {SCALE.reposSupported} repositories
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {nf.format(SCALE.tokensBefore)} → {nf.format(SCALE.tokensAfter)} tokens
          — an <strong>{SCALE.overallReductionPct}%</strong> overall reduction
          ({SCALE.avgReductionPct}% average per repo). {SCALE.reposExcluded} of{" "}
          {SCALE.reposProcessed} repos use languages SigMap doesn&apos;t yet
          parse and are excluded from the headline.
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
          2 · Real coding tasks — {TASKS.count} tasks, with vs without SigMap
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
          3 · Does it make a real agent faster? — honest answer: not yet proven
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We A/B-tested a real autonomous agent (Devin) on the same tasks —{" "}
          <strong>A</strong> = task only, <strong>B</strong> = SigMap context
          injected first — at <strong>{AGENT.reps} reps</strong> per task. The
          deterministic token and cost savings above are real; the wall-clock
          speedup is <strong>not</strong>.
        </p>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {AGENT.completedAMin.toFixed(1)}m
              </div>
              <div className="text-xs text-zinc-500">no SigMap (completed runs)</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {AGENT.completedBMin.toFixed(1)}m
              </div>
              <div className="text-xs text-zinc-500">SigMap (completed runs)</div>
            </div>
            <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
              → {AGENT.verdict}
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          A single early run looked like a large win, but it didn&apos;t hold up:
          across {AGENT.reps} reps the agent&apos;s variance is high and some
          sessions exceeded our 30-minute measurement cap. We&apos;d rather show
          you this than a cherry-picked number. SigMap&apos;s value here is proven
          in tokens and cost; the agent-speed question stays open until it
          replicates cleanly.
        </p>
      </section>

      {/* Honesty */}
      <section className="mb-14 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-bold tracking-tight">
          What these numbers don&apos;t say
        </h2>
        <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          {CAVEATS.map((c) => (
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
