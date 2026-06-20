import type { Metadata } from "next";
import { DemoClient } from "@/components/DemoClient";

export const metadata: Metadata = {
  title: "SigMap Demo — verified context for AI coding agents",
  description:
    "Paste a GitHub repo. SigMap extracts verified signatures and ranks the files that matter — feeding agents like Devin the right context with ~97% fewer tokens.",
};

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          See what your agent actually needs
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          SigMap is the verification layer for AI coding agents. Paste a public
          GitHub repository — SigMap extracts verified function and class
          signatures, redacts secrets, and ranks the files that matter. The
          result is context an agent can trust, with a fraction of the tokens.
        </p>
      </header>

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
