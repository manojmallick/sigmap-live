import type { Metadata } from "next";
import Link from "next/link";
import { DemoClient } from "@/components/DemoClient";
import { CopyCommand } from "@/components/CopyCommand";
import { FeatureGrid } from "@/components/FeatureGrid";

export const metadata: Metadata = {
  title: "SigMap Demo — verified context for AI coding agents",
  description:
    "Paste a GitHub repo. SigMap extracts verified signatures and ranks the files that matter — feeding AI coding agents the right context with up to ~97% fewer tokens.",
};

// SigMap's published benchmark figures (sigmap.io).
const METRICS = [
  { value: "97%", label: "fewer tokens" },
  { value: "75.6%", label: "hit@5 retrieval" },
  { value: "52.2%", label: "more tasks solved" },
  { value: "0/21", label: "context overflows (was 16/21)" },
];

const STEPS = [
  {
    n: "1",
    title: "Paste a repo",
    body: "Any public GitHub repository. SigMap detects the real source folders for you.",
  },
  {
    n: "2",
    title: "SigMap extracts signatures",
    body: "Function & class signatures only — secrets redacted, ranked by relevance, full coverage.",
  },
  {
    n: "3",
    title: "Feed your agent",
    body: "Up to ~97% fewer tokens. Copy the context file, ask the codebase, or run npx sigmap in your repo.",
  },
];

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12 space-y-5">
        <span className="inline-block rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          The verification layer for AI coding agents
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Give your agent the right context —{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            up to ~97% fewer tokens
          </span>
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          SigMap turns a whole repository into verified function & class
          signatures — the map an AI coding agent actually needs. No more pasting
          files or blowing the context window. Try it on any public repo below.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <CopyCommand command="npx sigmap" />
          <Link
            href="/benchmark"
            className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            See the proof — 405 repos, agents 61% faster →
          </Link>
          <a
            href="https://github.com/manojmallick/sigmap"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Star on GitHub ↗
          </a>
        </div>

        <Link
          href="/benchmark"
          className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm transition hover:bg-emerald-500/10"
        >
          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            New
          </span>
          <span className="text-zinc-700 dark:text-zinc-300">
            In a head-to-head test, SigMap made the{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">
              Devin agent 61% faster
            </strong>{" "}
            on real coding tasks — across 405 repos, ~99% fewer tokens.
          </span>
          <span className="ml-auto shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
            See the proof →
          </span>
        </Link>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <dt className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {m.value}
              </dt>
              <dd className="text-xs text-zinc-500">{m.label}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-zinc-400">
          SigMap v7.25 benchmark · 21 repos · 90 retrieval tasks · sigmap.io
        </p>
      </header>

      <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {s.n}
            </div>
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{s.body}</p>
          </div>
        ))}
      </section>

      <DemoClient />

      <FeatureGrid />

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        Free forever for every individual developer ·{" "}
        <a
          href="https://sigmap.io"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          sigmap.io
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/manojmallick/sigmap-benchmark-suite"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Benchmarks: open &amp; reproducible ↗
        </a>
      </footer>
    </main>
  );
}
