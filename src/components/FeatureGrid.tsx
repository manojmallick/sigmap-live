interface Feature {
  name: string;
  cmd: string;
  body: string;
  /** "demo" = try it on this page, "cli" = available in the CLI/package. */
  where: "demo" | "cli";
}

const FEATURES: Feature[] = [
  {
    name: "Signature map",
    cmd: "npx sigmap",
    body: "Turns a whole repo into verified function & class signatures — ~97% fewer tokens.",
    where: "demo",
  },
  {
    name: "Ranked retrieval",
    cmd: "sigmap ask",
    body: "Ask in plain English, get the exact files that matter — TF-IDF ranked, no LLM needed.",
    where: "demo",
  },
  {
    name: "Coverage validation",
    cmd: "sigmap validate",
    body: "Confirms the right files are in scope before you trust the context.",
    where: "demo",
  },
  {
    name: "Groundedness judge",
    cmd: "sigmap judge",
    body: "Scores whether an AI's answer is actually grounded in your code — the verification layer.",
    where: "cli",
  },
  {
    name: "Local learning",
    cmd: "sigmap learn",
    body: "Reinforces the files that proved helpful, so retrieval gets sharper over time.",
    where: "cli",
  },
  {
    name: "Secret redaction",
    cmd: "built-in",
    body: "Scans signatures for AWS keys, tokens, DB strings and redacts them automatically.",
    where: "demo",
  },
  {
    name: "33+ languages",
    cmd: "auto",
    body: "TypeScript, Python, Go, Rust, Java, Kotlin, Ruby, PHP, Swift, C#, C++, Vue, Svelte…",
    where: "demo",
  },
  {
    name: "7 agent adapters",
    cmd: "--adapter",
    body: "Emits for Claude Code, Cursor, Windsurf, Copilot, Codex, OpenCode and Gemini CLI.",
    where: "demo",
  },
  {
    name: "MCP server",
    cmd: "sigmap --mcp",
    body: "Model Context Protocol ready — agents pull ranked context on demand.",
    where: "cli",
  },
];

/** Overview of SigMap's full capability set, so visitors grasp the whole product. */
export function FeatureGrid() {
  return (
    <section className="mt-16 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight">
          Everything SigMap does
        </h2>
        <a
          href="https://sigmap.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          full docs ↗
        </a>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.name}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{f.name}</h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  f.where === "demo"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-zinc-500/15 text-zinc-500"
                }`}
              >
                {f.where === "demo" ? "try above" : "in CLI"}
              </span>
            </div>
            <code className="mt-1 block text-xs text-blue-600 dark:text-blue-400">
              {f.cmd}
            </code>
            <p className="mt-1.5 text-xs text-zinc-500">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
