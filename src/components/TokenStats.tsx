import type { TokenStats as TokenStatsType } from "@/lib/types";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** Before/after token comparison with the headline reduction figure. */
export function TokenStats({ stats }: { stats: TokenStatsType }) {
  const pct = (stats.reduction * 100).toFixed(1);
  const barWidth = Math.max(2, Math.min(100, (1 - stats.reduction) * 100));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Stat label="Raw source tokens" value={formatTokens(stats.rawTokens)} />
      <Stat
        label="SigMap context tokens"
        value={formatTokens(stats.mappedTokens)}
        accent
      />
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
          {pct}%
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          token reduction
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {stats.filesReturned} of {stats.filesScanned} files kept
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div
        className={`text-3xl font-bold ${
          accent ? "text-blue-600 dark:text-blue-400" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
    </div>
  );
}
