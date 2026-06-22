"use client";

import { useEffect, useState } from "react";
import type { Comparison, ContextMap } from "@/lib/types";

function tok(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function secs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
function usd(n: number): string {
  return `$${n.toFixed(4)}`;
}

/**
 * Precomputed "with vs without SigMap" benchmark for the loaded repo — same
 * question answered over raw source vs the SigMap map. Loaded from cache
 * (seeded ahead of time), so it's instant and costs nothing to view.
 */
export function Comparison({ map }: { map: ContextMap }) {
  const [data, setData] = useState<Comparison | null>(null);

  useEffect(() => {
    const repo = `${map.repo.owner}/${map.repo.name}`;
    let active = true;
    fetch(`/api/comparison?repo=${encodeURIComponent(repo)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setData(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [map.repo.owner, map.repo.name]);

  if (!data) return null;

  const tokRatio = data.withSigmap.promptTokens
    ? data.withoutSigmap.promptTokens / data.withSigmap.promptTokens
    : 0;
  const speed = data.withSigmap.latencyMs
    ? data.withoutSigmap.latencyMs / data.withSigmap.latencyMs
    : 0;
  const costCut = data.withoutSigmap.cost
    ? (1 - data.withSigmap.cost / data.withoutSigmap.cost) * 100
    : 0;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="text-sm font-semibold">With vs without SigMap</h2>
        <p className="text-xs text-zinc-500">
          Same question answered over the raw repo vs the SigMap map ·{" "}
          {data.model} · precomputed
        </p>
        <p className="mt-1 text-xs italic text-zinc-500">“{data.question}”</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Side title="Without SigMap" tone="bad" s={data.withoutSigmap} note={data.rawCapped ? "raw source (capped)" : "full raw source"} />
        <Side title="With SigMap" tone="good" s={data.withSigmap} note="signature map" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Win value={`${tokRatio.toFixed(0)}×`} label="fewer tokens" />
        <Win value={`${speed.toFixed(1)}×`} label="faster" />
        <Win value={`${costCut.toFixed(0)}%`} label="cheaper" />
      </div>

      <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Comparable quality:
        </span>{" "}
        both answers verified against the real source (sigmap judge) —{" "}
        {Math.round(data.withSigmap.groundedness * 100)}% grounded with SigMap
        vs {Math.round(data.withoutSigmap.groundedness * 100)}% without — at{" "}
        {tokRatio.toFixed(0)}× fewer tokens.
      </p>
    </div>
  );

  function Side({
    title,
    tone,
    s,
    note,
  }: {
    title: string;
    tone: "good" | "bad";
    s: Comparison["withSigmap"];
    note: string;
  }) {
    return (
      <div
        className={`rounded-lg border p-3 ${
          tone === "good"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-zinc-300/40 bg-zinc-500/5"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{title}</span>
          <span className="text-[10px] text-zinc-400">{note}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-3 text-sm">
          <span className="font-bold">{tok(s.promptTokens)}</span>
          <span className="text-xs text-zinc-500">tokens</span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-3 text-sm">
          <span className="font-bold">{secs(s.latencyMs)}</span>
          <span className="text-xs text-zinc-500">· {usd(s.cost)}</span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {Math.round(s.groundedness * 100)}% grounded
        </div>
      </div>
    );
  }

  function Win({ value, label }: { value: string; label: string }) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {value}
        </div>
        <div className="text-[10px] text-zinc-500">{label}</div>
      </div>
    );
  }
}
