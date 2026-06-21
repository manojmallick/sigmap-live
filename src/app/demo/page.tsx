import type { Metadata } from "next";
import { DemoClient } from "@/components/DemoClient";
import { CopyCommand } from "@/components/CopyCommand";

export const metadata: Metadata = {
  title: "SigMap Demo — verified context for AI coding agents",
  description:
    "Paste a GitHub repo. SigMap extracts verified signatures and ranks the files that matter — feeding AI coding agents the right context with ~93% fewer tokens.",
};

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
    body: "~93% fewer tokens. Copy the context file, ask the codebase, or run npx sigmap in your repo.",
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
            ~93% fewer tokens
          </span>
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          SigMap turns a whole repository into verified function & class
          signatures — the map an AI coding agent actually needs. No more pasting
          files or blowing the context window. Try it on any public repo below.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <CopyCommand command="npx sigmap" />
          <a
            href="https://github.com/manojmallick/sigmap"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Star on GitHub ↗
          </a>
        </div>
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

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        Free forever for every individual developer ·{" "}
        <a
          href="https://sigmap.io"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          sigmap.io
        </a>
      </footer>
    </main>
  );
}
