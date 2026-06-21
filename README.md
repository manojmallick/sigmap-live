# sigmap-live

Web demo for **[SigMap](https://github.com/manojmallick/sigmap)** — the verification layer for AI coding agents.

Paste a public GitHub repo → SigMap detects the real source folders, extracts verified function/class signatures, redacts secrets, and ranks the files that matter. The result is **context an agent can trust at ~99% fewer tokens**, which you can then send to Gemini ("Ask the codebase") or to Devin.

🔗 **Live:** [sigmap-live.vercel.app](https://sigmap-live.vercel.app/demo) · sigmap.nl/demo

---

## How it works

```
Paste repo URL
   │
   ├─▶ Detect source folders  (Gemini tailors SigMap's srcDirs/exclude to the repo)
   ├─▶ Extract signatures      (sigmap extract — per file)
   ├─▶ Redact secrets          (sigmap scan)
   └─▶ Rank by relevance       (sigmap rank → verified context map)
        │
        ├─▶ Ask the codebase   (Gemini, grounded in the context map, with citations)
        └─▶ Send to Devin      (verified context as the session payload; replies shown inline)
```

The analyzer scans **only the detected source folders** — not "the largest files anywhere" — so a repo's real code (e.g. `src/`, `packages/core`) is what gets mapped. Gemini tailors the folder config per repo, with a SigMap-defaults fallback if it's unavailable.

## Stack

- **Next.js 16** (App Router, Turbopack) · **TypeScript** (strict) · **Tailwind CSS v4**
- [`sigmap`](https://www.npmjs.com/package/sigmap) npm package — signature extraction + ranking
- **Google Gemini** (Google AI Studio, `gemini-2.5-flash`) — folder detection + "Ask the codebase"
- **Devin API** (app.devin.ai) — send verified context to a Devin session
- **GitHub public REST API** — no token required (optional token only raises the rate limit)
- **Vercel** (EU region `ams1`)

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/analyze` | POST | repo URL → verified context map |
| `/api/ask` | POST | context map + question → grounded Gemini answer |
| `/api/devin` | POST | context map + prompt → Devin session |
| `/api/devin?sessionId=` | GET | session status + Devin's messages |
| `/api/benchmark` | GET | repo URL → before/after token stats |

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
| `GEMINI_API_KEY` | yes | Folder detection + Ask. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| `DEVIN_API_KEY` | for Devin | Required only for "Send to Devin" |
| `GITHUB_TOKEN` | no | Optional — only raises the public-repo rate limit |

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
src/app/demo/page.tsx        Main demo page; / redirects here
src/app/api/*/route.ts       analyze · ask · devin · benchmark
src/components/              DemoClient, ContextMapView, TokenStats, LoadingSkeleton
src/lib/sigmap.ts            Repo → context map pipeline
src/lib/repo-config.ts       Source-folder detection (Gemini + defaults)
src/lib/gemini.ts            Gemini client (Ask + config)
src/lib/devin.ts             Devin API client
src/lib/github.ts            Public-repo fetch helpers
src/lib/cache.ts             SHA-256 in-memory response cache
```

## Notes

- The published `sigmap` package exposes `extract / rank / buildSigIndex / scan / score / adapt` (no `assembleContext`) and ships no types — local declarations live in `src/types/sigmap.d.ts`. It must stay in `serverExternalPackages` (`next.config.ts`) because it resolves submodules via runtime `require`.
- The demo is **public with no auth** by design. The `/api/ask` and `/api/devin` endpoints are open and consume API quota — add rate limiting before promoting widely.

## Mission

**Free forever for every individual developer.** · [sigmap.io](https://sigmap.io)
