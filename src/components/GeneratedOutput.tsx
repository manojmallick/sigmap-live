"use client";

import { useState } from "react";
import type { ContextMap } from "@/lib/types";

/** SigMap can emit the context for any of these agent targets. */
const ADAPTERS = [
  "Copilot",
  "Claude",
  "Cursor",
  "Windsurf",
  "Gemini",
  "OpenAI",
];

/**
 * Shows the actual artifact SigMap generates (.github/copilot-instructions.md)
 * — the file an AI agent would consume — with copy/download and an adoption CTA.
 */
export function GeneratedOutput({ map }: { map: ContextMap }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!map.output) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(map.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  function download() {
    const blob = new Blob([map.output], { type: "text/markdown" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "copilot-instructions.md";
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold">Generated context file</span>
        <span className="text-xs text-zinc-500">
          .github/copilot-instructions.md · {open ? "hide" : "view"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-zinc-500">
            This is the exact file SigMap writes — what your AI agent reads
            instead of the full source.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button
              type="button"
              onClick={download}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Download .md
            </button>
          </div>

          <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {map.output}
          </pre>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Also emits for:
            </span>
            {ADAPTERS.map((a) => (
              <span
                key={a}
                className="rounded-full bg-zinc-200 px-2 py-0.5 dark:bg-zinc-800"
              >
                {a}
              </span>
            ))}
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">
              Want this in your own repo? Run it locally:
            </span>{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
              npx sigmap
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
