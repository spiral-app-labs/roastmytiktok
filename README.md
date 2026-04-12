This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## QA Happy Path

Run the install once, then use the same commands locally and in CI:

```bash
npm ci
npm run lint
npm test
```

`npm test` is intentionally pinned to the deterministic Node test runner with explicit files. That keeps boot clean in local/CI, avoids `npx` bootstrap noise, and guarantees at least one analysis-pipeline smoke path via `tests/hook-analysis-pipeline.test.mjs`.

## Secret handling

Run `npm run verify:secrets` before launch work that touches credentials. It verifies that `.env.local` and `.vercel/.env.development.local` are not tracked by git.

Launch secret-handling and rotation steps are documented in [docs/launch-secret-handling.md](docs/launch-secret-handling.md).

## Production Deploy Contract

Production builds are intentionally enabled again.

- `npm run build` still runs `scripts/block-deploy.mjs`, but that script is now a neutral validator instead of a localhost-only blocker.
- The validator fails only when build-critical public Supabase env vars are missing.
- It warns when optional shipped features are not configured or when native runtime binaries are absent.

### Build-critical env

These must exist for any production build:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Runtime env by shipped feature

`Core app auth, storage, roast session persistence`

- Required: `SUPABASE_SERVICE_ROLE_KEY`
- Optional override: `SUPABASE_URL` if the server-side URL should differ from `NEXT_PUBLIC_SUPABASE_URL`

`Video roast analysis API`

- Required: `ANTHROPIC_API_KEY`
- Required: `GOOGLE_GEMINI_API_KEY`
- Required native binaries at runtime: `ffmpeg`, `ffprobe`
- Optional but strongly recommended transcription keys: at least one of `ASSEMBLYAI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`
- Behavior if binaries are missing: `GET /api/analyze/[id]` now returns `503` instead of silently attempting a partially broken analysis

`Script generation / script improvement / niche analysis`

- Required: `ANTHROPIC_API_KEY`

`Trending data + cron ingestion`

- Required for `/api/crons/trending`: `CRON_SECRET`
- Required for DB writes: `SUPABASE_SERVICE_ROLE_KEY`
- Supabase edge function `supabase/functions/tiktok-trend-scraper` also requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Supabase function secret store

`Billing portal`

- Required only if billing is live: `STRIPE_SECRET_KEY`
- Current behavior when absent: `/api/settings/billing-portal` returns `503`

`Password-gated bypass routes`

- Required only if those routes remain exposed: `BYPASS_PASSWORD`

`Waitlist counter / tuning knobs`

- Optional: `NEXT_PUBLIC_SLOTS_REMAINING`
- Optional: `HOOK_EXTENSION_THRESHOLD`
- Optional: `HOOK_FULL_VIDEO_THRESHOLD`

### Native runtime dependencies

`Shipped web app`

- `ffmpeg`
- `ffprobe`

`Local-only helper script`

- `scripts/analyze_tiktok.py` additionally requires `yt-dlp`
- That script is not part of the shipped Next.js app and should not be treated as a production web dependency unless you plan to run it separately

### Secret handling and rotation status

Code and repo state after this change:

- `.env.example` is the canonical contract and contains placeholders only
- `.env.local` remains untracked and should never be committed
- hardcoded fallback coupling to a specific Supabase project URL was removed from `lib/supabase/env.ts`

Manual follow-up still required before launch:

1. Rotate every production secret that has ever been pasted into chat, issue text, or other non-secret channels.
2. At minimum, rotate the current Supabase service-role style secret, then update Vercel/Supabase/local secret stores with the replacement.
3. Review and rotate `ANTHROPIC_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `CRON_SECRET`, and `BYPASS_PASSWORD` if any of them were previously shared outside a secret manager.
4. Verify the old secret values are invalidated before reopening production traffic.

### Deploy checklist

1. Set all required env vars from `.env.example` in the deployment platform.
2. Ensure the runtime image or host includes `ffmpeg` and `ffprobe`.
3. Run `npm ci`, `npm run verify:secrets`, `npm run lint`, `npm test`, and `npm run build`.
4. Confirm any optional feature without its env secret is intentionally disabled before launch.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
