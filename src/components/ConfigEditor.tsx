"use client";

import { useState } from "react";
import type { ContextMap, RepoConfigInput } from "@/lib/types";

const TEMPLATE: RepoConfigInput = {
  srcDirs: ["src", "lib", "app", "packages"],
  exclude: ["test", "tests", "examples", "docs"],
  coverageTarget: 0.8,
  maxTokens: 8000,
};

/**
 * Live SigMap config editor. Edit srcDirs/exclude/budget and re-run against the
 * same repo to watch coverage and tokens change. Re-running the same repo does
 * not consume the daily limit (the limiter counts distinct repos).
 */
export function ConfigEditor({
  map,
  onResult,
}: {
  map: ContextMap;
  onResult: (m: ContextMap) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() =>
    JSON.stringify(map.appliedConfig ?? TEMPLATE, null, 2)
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rerun() {
    let config: RepoConfigInput;
    try {
      config = JSON.parse(text) as RepoConfigInput;
    } catch {
      setError("That isn't valid JSON.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: map.repo.url, query: map.query, config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Re-run failed.");
      onResult(data as ContextMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold">Tune the SigMap config</span>
        <span className="text-xs text-zinc-500">
          {map.appliedConfig ? "custom config applied" : "auto-detected"} ·{" "}
          {open ? "hide" : "edit"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-zinc-500">
            Edit and re-run to see coverage and tokens change in real time. This
            is exactly the <code>gen-context.config.json</code> SigMap reads.
            Re-running the same repo is free — it doesn’t use your daily limit.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 font-mono text-xs outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={rerun}
              disabled={running}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? "Re-running…" : "Re-run with this config"}
            </button>
            <button
              type="button"
              onClick={() => setText(JSON.stringify(TEMPLATE, null, 2))}
              className="text-xs text-zinc-500 hover:underline"
            >
              reset template
            </button>
            <span className="text-xs text-zinc-400">
              fields: srcDirs · exclude · maxDepth · coverageTarget · maxTokens
            </span>
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
