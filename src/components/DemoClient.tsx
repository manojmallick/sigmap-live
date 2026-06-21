"use client";

import { useState } from "react";
import type { AskResult, ContextMap } from "@/lib/types";
import { ContextMapView } from "@/components/ContextMapView";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const EXAMPLE_REPO = "https://github.com/manojmallick/sigmap";

export function DemoClient() {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [map, setMap] = useState<ContextMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setMap(null);
    setAnswer(null);
    setAskError(null);
    setQuestion("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, query: query || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      setMap(data as ContextMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function ask() {
    if (!map || !question.trim() || asking) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextMap: map, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Question failed.");
      setAnswer(data as AskResult);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={analyze} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Optional: what are you working on? (ranks the most relevant files)"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setUrl(EXAMPLE_REPO)}
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Try an example: {EXAMPLE_REPO.replace("https://github.com/", "")}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {loading && <LoadingSkeleton />}

      {map && !loading && (
        <div className="space-y-6">
          <ContextMapView map={map} />

          <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Ask the codebase</h2>
            <p className="text-xs text-zinc-500">
              Gemini answers using only the verified context map above — grounded
              in real signatures, not the full source.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ask();
                }}
                placeholder="e.g. Where is the public API defined?"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={ask}
                disabled={asking || !question.trim()}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {asking ? "Thinking…" : "Ask"}
              </button>
            </div>
            {askError && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400"
              >
                {askError}
              </div>
            )}
            {answer && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {answer.answer}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{answer.model}</span>
                  {answer.citedFiles.map((f) => (
                    <code
                      key={f}
                      className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800"
                    >
                      {f}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
