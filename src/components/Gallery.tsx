"use client";

import { useEffect, useState } from "react";
import type { ContextMap } from "@/lib/types";
import type { GalleryEntry } from "@/app/api/gallery/route";

/**
 * Multi-language gallery of pre-analyzed repos. Loading one is instant and
 * doesn't touch the daily limit (served from the saved cache).
 */
export function Gallery({ onLoad }: { onLoad: (m: ContextMap) => void }) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data: GalleryEntry[]) =>
        setEntries(data.filter((e) => e.summary))
      )
      .catch(() => {});
  }, []);

  async function load(repoId: string) {
    setLoadingId(repoId);
    setError(null);
    try {
      const res = await fetch(`/api/saved?repo=${encodeURIComponent(repoId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load.");
      onLoad(data as ContextMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    } finally {
      setLoadingId(null);
    }
  }

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Explore a saved analysis</h2>
        <span className="text-xs text-zinc-500">
          instant · doesn’t use your daily limit
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <button
            key={e.repoId}
            type="button"
            onClick={() => load(e.repoId)}
            disabled={loadingId !== null}
            className="rounded-lg border border-zinc-200 p-3 text-left transition hover:border-blue-500 hover:bg-blue-500/5 disabled:opacity-50 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between gap-2">
              <code className="truncate text-sm font-medium">{e.repoId}</code>
              <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {e.language}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{e.description}</p>
            {e.summary && (
              <p className="mt-2 text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {(e.summary.reduction * 100).toFixed(1)}% fewer tokens
                </span>
                <span className="text-zinc-500">
                  {" "}
                  · {e.summary.filesIncluded}/{e.summary.filesTotal} files
                </span>
              </p>
            )}
            {loadingId === e.repoId && (
              <p className="mt-1 text-xs text-blue-500">loading…</p>
            )}
          </button>
        ))}
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
  );
}
