import type { ContextFile, ContextMap } from "@/lib/types";
import { TokenStats } from "@/components/TokenStats";

const confidenceStyles: Record<ContextFile["confidence"], string> = {
  high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
};

/** Renders the verified context map: stats + ranked, signature-only files. */
export function ContextMapView({ map }: { map: ContextMap }) {
  return (
    <div className="space-y-6">
      <TokenStats stats={map.stats} />

      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {map.repo.owner}/{map.repo.name}
        </span>
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
          {map.repo.branch}
        </span>
        {map.redacted && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-600 dark:text-red-400">
            secrets redacted
          </span>
        )}
        <span className="text-xs">intent: “{map.query}”</span>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Detected source folders
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              map.config.source === "gemini"
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                : "bg-zinc-500/15 text-zinc-500"
            }`}
          >
            {map.config.source === "gemini" ? "Gemini-tailored" : "defaults"}
          </span>
          {map.config.srcDirs.slice(0, 12).map((d) => (
            <code
              key={d}
              className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800"
            >
              {d}
            </code>
          ))}
        </div>
        {map.config.reasoning && (
          <p className="mt-2 text-xs text-zinc-500">{map.config.reasoning}</p>
        )}
      </div>

      <ul className="space-y-3">
        {map.files.map((file) => (
          <li
            key={file.path}
            className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <code className="truncate text-sm font-medium">{file.path}</code>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    confidenceStyles[file.confidence]
                  }`}
                >
                  {file.confidence}
                </span>
                <span className="text-zinc-500">{file.tokens} tok</span>
              </div>
            </div>
            <pre className="overflow-x-auto bg-white px-4 py-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
              {file.signatures.join("\n")}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
