"use client";

import { useState } from "react";
import type { ContextMap } from "@/lib/types";

/** Agent targets SigMap can emit for (id → label). */
const ADAPTERS: Array<{ id: string; label: string; file: string }> = [
  { id: "copilot", label: "Copilot", file: "copilot-instructions.md" },
  { id: "claude", label: "Claude", file: "CLAUDE.md" },
  { id: "cursor", label: "Cursor", file: ".cursorrules" },
  { id: "windsurf", label: "Windsurf", file: ".windsurfrules" },
  { id: "gemini", label: "Gemini", file: "gemini-context.md" },
  { id: "codex", label: "Codex", file: "AGENTS.md" },
  { id: "opencode", label: "OpenCode", file: "opencode.md" },
];

/**
 * Shows the actual artifact SigMap generates and lets you switch the agent
 * adapter (Copilot/Claude/Cursor/…) via `adapt()` — copy/download any format.
 */
export function GeneratedOutput({ map }: { map: ContextMap }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adapter, setAdapter] = useState("copilot");
  const [content, setContent] = useState(map.output);
  const [loading, setLoading] = useState(false);

  if (!map.output) return null;

  async function pick(id: string) {
    setAdapter(id);
    if (id === "copilot") {
      setContent(map.output);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output: map.output, adapter: id }),
      });
      const data = await res.json();
      setContent(res.ok ? data.output : map.output);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function download() {
    const meta = ADAPTERS.find((a) => a.id === adapter)!;
    const blob = new Blob([content], { type: "text/markdown" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = meta.file;
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
          7 agent adapters · {open ? "hide" : "view"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-zinc-500">
            The exact file your agent reads instead of the full source. Switch
            the adapter to emit for any tool.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {ADAPTERS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pick(a.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  adapter === a.id
                    ? "bg-blue-600 text-white"
                    : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

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
              Download {ADAPTERS.find((a) => a.id === adapter)!.file}
            </button>
          </div>

          <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {loading ? "Adapting…" : content}
          </pre>

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
