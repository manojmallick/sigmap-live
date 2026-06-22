"use client";

import { useState } from "react";
import type { ContextMap, RankedFile } from "@/lib/types";

const confStyle: Record<RankedFile["confidence"], string> = {
  high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-zinc-500/15 text-zinc-500",
};

/**
 * Native SigMap ranked retrieval (`sigmap ask`). Plain-English query → ranked
 * files, TF-IDF, no LLM — free and unlimited.
 */
export function FileFinder({ map }: { map: ContextMap }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RankedFile[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!query.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextMap: map, query }),
      });
      const data = await res.json();
      if (res.ok) setResults(data.results as RankedFile[]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">
        Find files <span className="text-xs font-normal text-zinc-500">· sigmap ask · ranked, no LLM, free</span>
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="e.g. where is authentication handled?"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || !query.trim()}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Ranking…" : "Rank files"}
        </button>
      </div>
      {results && (
        <ul className="space-y-1">
          {results.map((r, i) => (
            <li
              key={r.path}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-800"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="text-zinc-400">{i + 1}</span>
                <code className="truncate">{r.path}</code>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 ${confStyle[r.confidence]}`}>
                  {r.confidence}
                </span>
                <span className="text-zinc-500">score {r.score.toFixed(2)}</span>
              </span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="text-xs text-zinc-500">No matching files.</li>
          )}
        </ul>
      )}
    </div>
  );
}
