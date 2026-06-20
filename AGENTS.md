<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# sigmap-live

Web demo for SigMap — the verification layer for AI coding agents. Paste a
public GitHub repo → SigMap extracts verified signatures, redacts secrets, and
ranks the files that matter. The result is trustworthy context at ~99% fewer
tokens, which can then be sent to Gemini ("Ask the codebase") or to Devin.

The core SigMap npm package is published at https://github.com/manojmallick/sigmap
and consumed via `npm install sigmap`. Do NOT modify it from this repo.

## Stack

- Next.js 16 (App Router, Turbopack) · TypeScript (strict) · Tailwind CSS v4
- `sigmap` npm package (signature extraction + ranking)
- Google Gemini API via Google AI Studio (`gemini-2.5-flash`) — "Ask the codebase"
- Devin API (app.devin.ai) — send verified context to a Devin session
- GitHub public REST API (no token required; optional token only raises rate limit)
- Deploy: Vercel (EU region ams1)

## The real `sigmap` API (important)

The package exports `extract / rank / buildSigIndex / scan / score / adapt` —
there is NO `assembleContext()`. It ships no TypeScript types (local decls in
`src/types/sigmap.d.ts`). It resolves submodules via runtime `require(...)`, so
it MUST stay in `serverExternalPackages` in `next.config.ts` or the build fails.
`/api/analyze` bridges a GitHub URL to this API: fetch source → `extract` →
`scan` (redact) → `rank`.

## Project structure

    src/app/demo/page.tsx        Main demo page (centrepiece); `/` redirects here
    src/app/api/analyze/         POST: repo URL → context map
    src/app/api/ask/             POST: context map + question → Gemini answer
    src/app/api/devin/           POST: context map + prompt → Devin session
    src/app/api/benchmark/       GET:  url → before/after token stats
    src/components/              DemoClient, ContextMapView, TokenStats, LoadingSkeleton
    src/lib/sigmap.ts            Repo → context map pipeline
    src/lib/gemini.ts            Gemini (Google AI Studio) client
    src/lib/devin.ts             Devin API client
    src/lib/github.ts            Public-repo fetch helpers
    src/lib/cache.ts             SHA-256 in-memory response cache
    src/lib/types.ts             Shared types

## Commands

    npm run dev          Dev server (localhost:3000)
    npm run build        Production build
    npm run start        Run the built app
    npm run lint         ESLint
    npx tsc --noEmit     Type check

## Environment

See `.env.example`. Real values go in `.env.local` (gitignored — never commit).
`GEMINI_API_KEY` powers Ask; `DEVIN_API_KEY` powers Send to Devin; `GITHUB_TOKEN`
is optional. Never read or log secret values.

## Conventions

- TypeScript strict — no `any`. Tailwind only — no inline styles / CSS modules.
- Server Components by default; `"use client"` only when needed.
- All external API calls go through `src/lib/` wrappers.
- Errors handled gracefully — never surface a stack trace to the client.
- Loading uses `LoadingSkeleton`, never a bare spinner.
- No auth, no database, no localStorage/sessionStorage. Public repos only.

## Mission

Free forever for every individual developer. sigmap.io · sigmap.nl/demo
