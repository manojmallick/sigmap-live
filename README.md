# sigmap-live

Web demo for **[SigMap](https://github.com/manojmallick/sigmap)** — the verification layer for AI coding agents.

Paste a public GitHub repo → SigMap detects the real source folders, extracts verified function/class signatures, redacts secrets, and ranks the files that matter. The result is **context an agent can trust at ~99% fewer tokens**, which you can then ask questions against with Gemini.

🔗 **Live:** [sigmap-live.vercel.app](https://sigmap-live.vercel.app/demo) · sigmap.nl/demo
📊 **The proof:** [/benchmark](https://sigmap-live.vercel.app/benchmark) — 405 repos, 96× cheaper context, AI agents 61% faster ([open benchmark suite](https://github.com/manojmallick/sigmap-benchmark-suite))

---

## How it works

```
Paste repo URL
   │
   ├─▶ Detect source folders  (tuned srcDirs/exclude per repo)
   ├─▶ Extract signatures      (sigmap — function & class signatures, per file)
   ├─▶ Redact secrets          (sigmap scan)
   └─▶ Rank by relevance       (sigmap rank → verified context map)
        │
        ├─▶ Ask the codebase    (Gemini, grounded in the map, with citations)
        ├─▶ Ranked retrieval    (plain-English query → the exact files that matter)
        ├─▶ Groundedness judge   (scores whether an answer is backed by the code)
        └─▶ Adapter switcher     (emit for Claude Code, Cursor, Copilot, Gemini CLI…)
```

The analyzer drives the **real SigMap CLI** server-side on a downloaded copy of the repo, so the demo reports SigMap's own numbers — the same as running `npx sigmap` locally.

## Proof page

`/benchmark` is a statically-prerendered page that bakes in the validated results
(no API cost to serve):

- **Scale** — ~99% fewer tokens across 405 repositories (per-language breakdown)
- **Tasks** — 51 real coding tasks answered with vs without SigMap → 96× cheaper
- **Agent** — Devin run head-to-head: ~61% faster on real tasks (4 of 5)

Full methodology and raw data: **[sigmap-benchmark-suite](https://github.com/manojmallick/sigmap-benchmark-suite)**.

## Stack

- **Next.js 16** (App Router, Turbopack) · **TypeScript** (strict) · **Tailwind CSS v4**
- [`sigmap`](https://www.npmjs.com/package/sigmap) npm package — signature extraction + ranking (run via its CLI)
- **Google Gemini** (Google AI Studio, `gemini-2.5-flash`) — "Ask the codebase"
- **Upstash Redis** — per-IP daily rate limits + saved-analysis store
- **GitHub public REST API** — no token required (optional token only raises the rate limit)
- **Vercel** (EU region `ams1`) — Git-integration auto-deploy

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/analyze` | POST | repo URL → verified context map |
| `/api/ask` | POST | context map + question → grounded Gemini answer |
| `/api/query` | POST | plain-English query → ranked files (no LLM) |
| `/api/judge` | POST | answer + context → groundedness score |
| `/api/adapt` | POST | context map → agent-specific format (Cursor, Claude Code…) |
| `/api/benchmark` | GET | repo URL → before/after token stats |
| `/api/gallery`, `/api/saved`, `/api/comparison` | GET | saved analyses + permalinks |
| `/api/cron/seed`, `/api/cron/compare` | GET | scheduled re-seeding (secret-gated) |

Public repo permalinks render at `/r/[owner]/[repo]` (with a dynamic OG card).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

### Environment variables

See [`.env.example`](.env.example). Real values go in `.env.local` (gitignored — never commit).

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | for Ask | Powers "Ask the codebase". Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | for limits | Per-IP rate limiting + saved-analysis store (Vercel injects `KV_REST_API_*`) |
| `GITHUB_TOKEN` | no | Optional — only raises the public-repo rate limit |
| `SEED_SECRET` / `CRON_SECRET` | for cron | Gate the seed/compare cron endpoints |

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build
npm run start        # run the built app
npm run lint         # ESLint
npx tsc --noEmit     # type check
```

## Project structure

```
src/app/demo/page.tsx          Main demo page; / redirects here
src/app/benchmark/page.tsx     Public proof page (+ OG card)
src/app/r/[owner]/[repo]/      Saved-analysis permalink (+ OG card)
src/app/api/*/route.ts         analyze · ask · query · judge · adapt · benchmark · gallery · saved · comparison · cron
src/components/                DemoClient, ContextMapView, TokenStats, ConfigEditor, FileFinder, Comparison, Gallery, FeatureGrid…
src/lib/sigmap.ts              Repo → context map pipeline
src/lib/sigmap-cli.ts          Drives the real SigMap CLI on a downloaded repo
src/lib/gemini.ts              Gemini client (Ask)
src/lib/github.ts              Public-repo fetch helpers (+ size guard)
src/lib/ratelimit.ts           Per-IP daily limits (Upstash)
src/lib/store.ts / redis.ts    Saved analyses + permalinks
src/lib/benchmark-data.ts      Static validated results for the proof page
src/lib/cache.ts               SHA-256 response cache
```

## Notes

- The published `sigmap` package exposes `extract / rank / buildSigIndex / scan / score / adapt` (no `assembleContext`) and ships no types — local declarations live in `src/types/sigmap.d.ts`. It must stay in `serverExternalPackages` (`next.config.ts`) because it resolves submodules via runtime `require`.
- The demo is **public with no auth** by design. Analyze is capped per IP per day; the Ask endpoint consumes Gemini quota and is rate-limited.
- Very large repos (>300 MB) are rejected up front with a friendly message rather than hitting the function time limit — run `npx sigmap` locally for those.

## Mission

**Free forever for every individual developer.** · [sigmap.io](https://sigmap.io)
