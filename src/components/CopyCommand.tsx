"use client";

import { useState } from "react";

/** A copyable shell command chip (e.g. `npx sigmap`). */
export function CopyCommand({ command = "npx sigmap" }: { command?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      className="group inline-flex items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-mono text-sm transition hover:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <span className="text-zinc-400 select-none">$</span>
      <span>{command}</span>
      <span className="text-xs text-zinc-400 group-hover:text-blue-500">
        {copied ? "copied ✓" : "copy"}
      </span>
    </button>
  );
}
