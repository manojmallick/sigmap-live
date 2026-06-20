"use client";

import { useEffect, useState } from "react";
import type {
  AskResult,
  ContextMap,
  DevinMessage,
  DevinSessionResult,
  DevinSessionStatus,
} from "@/lib/types";
import { ContextMapView } from "@/components/ContextMapView";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const EXAMPLE_REPO = "https://github.com/manojmallick/sigmap";

export function DemoClient() {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [map, setMap] = useState<ContextMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [devin, setDevin] = useState<DevinSessionResult | null>(null);
  const [sending, setSending] = useState(false);
  const [devinError, setDevinError] = useState<string | null>(null);
  const [devinStatus, setDevinStatus] = useState<DevinSessionStatus | null>(
    null
  );
  const [devinPolling, setDevinPolling] = useState(false);

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
    setDevin(null);
    setDevinError(null);
    setDevinStatus(null);
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

  async function sendToDevin() {
    if (!map || !prompt.trim() || sending) return;
    setSending(true);
    setDevinError(null);
    setDevin(null);
    setDevinStatus(null);
    try {
      const res = await fetch("/api/devin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextMap: map, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Devin request failed.");
      setDevin(data as DevinSessionResult);
    } catch (err) {
      setDevinError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSending(false);
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

  // Poll Devin for status + messages once a session exists.
  const sessionId = devin?.sessionId;
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    const MAX_POLLS = 60; // ~3 min at 3s

    setDevinPolling(true);
    const poll = async () => {
      if (!active) return;
      polls += 1;
      try {
        const res = await fetch(`/api/devin?sessionId=${sessionId}`);
        const data = (await res.json()) as DevinSessionStatus;
        if (!active) return;
        if (res.ok) setDevinStatus(data);
        if (res.ok && data.done) {
          setDevinPolling(false);
          return;
        }
      } catch {
        // transient — keep polling
      }
      if (active && polls < MAX_POLLS) {
        timer = setTimeout(poll, 3000);
      } else {
        setDevinPolling(false);
      }
    };
    poll();

    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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

          <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Send to Devin</h2>
            <p className="text-xs text-zinc-500">
              Devin receives the verified context map above — not raw files.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the task for Devin…"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={sendToDevin}
                disabled={sending || !prompt.trim()}
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {sending ? "Starting session…" : "Send to Devin"}
              </button>
              {devin && (
                <a
                  href={devin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Open session ↗
                </a>
              )}
            </div>
            {devinError && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400"
              >
                {devinError}
              </div>
            )}

            {devin && (
              <DevinResponse status={devinStatus} polling={devinPolling} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DevinResponse({
  status,
  polling,
}: {
  status: DevinSessionStatus | null;
  polling: boolean;
}) {
  const messages: DevinMessage[] = status?.messages ?? [];
  const working = polling && messages.length === 0;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            polling ? "animate-pulse bg-amber-500" : "bg-emerald-500"
          }`}
        />
        <span>
          Devin · {status?.statusEnum ?? status?.status ?? "starting"}
          {polling ? " (working…)" : ""}
        </span>
      </div>

      {working && (
        <p className="text-sm text-zinc-500">
          Devin is spinning up and reading the verified context. Responses
          appear here as they arrive — this can take a minute.
        </p>
      )}

      {messages.map((m, i) => (
        <div
          key={i}
          className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-950"
        >
          {m.message}
        </div>
      ))}

      {!polling && messages.length === 0 && (
        <p className="text-sm text-zinc-500">
          No response yet — open the session to follow along.
        </p>
      )}
    </div>
  );
}
