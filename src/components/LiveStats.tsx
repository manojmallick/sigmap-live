"use client";

import { useEffect, useState } from "react";

interface Stats {
  active: number;
  total: number;
}

/**
 * Live "active now / total visitors" pill. Pings /api/presence on mount, then
 * every 60s and whenever the tab is refocused. Renders nothing until it has
 * real numbers (so it stays invisible when analytics is unconfigured).
 */
export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const ping = (first: boolean) =>
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (alive && typeof d?.active === "number") setStats(d as Stats);
        })
        .catch(() => {});

    ping(true);
    const iv = setInterval(() => ping(false), 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") ping(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!stats) return null;

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white/60 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
          {stats.active.toLocaleString()}
        </strong>{" "}
        active now
      </span>
      <span className="text-zinc-300 dark:text-zinc-700">·</span>
      <span>
        <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
          {stats.total.toLocaleString()}
        </strong>{" "}
        total visitors
      </span>
    </div>
  );
}
