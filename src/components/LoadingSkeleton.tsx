/** Shared loading skeleton — per CLAUDE.md, never a bare spinner. */
export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex gap-4">
        <div className="h-20 flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-20 flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-20 flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
      <span className="sr-only">Analyzing repository…</span>
    </div>
  );
}
