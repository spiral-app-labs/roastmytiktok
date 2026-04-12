# Launch Secret Handling

This repo must not ship with hardcoded secrets or tracked local env files.

## Current status

- `.env.local` and `.vercel/.env.development.local` are treated as local-only files and must never be added to git.
- `npm run verify:secrets` fails if either of those secret-bearing files becomes tracked.
- `.env.example` is the checked-in source of truth for required env names and placeholders.
- The production build path is open again, so secret rotation now matters before launch rather than later.

## Local secret flow

1. Keep real credentials in `.env.local` only.
2. Use `.env.example` for placeholders and onboarding.
3. Configure Vercel project secrets in the Vercel dashboard instead of storing them in repo-local `.vercel` env files.
4. If a secret is ever exposed in a local env file or commit, rotate it immediately before launch.

## Rotation follow-up

Rotate any credential that was previously exposed outside the approved secret store. Based on the current deploy task, that includes at minimum:

- The current Supabase service-role style secret if it was pasted into chat, issue text, or other non-secret channels.
- Any real secrets that were present in `.env.local`.
- Any real secrets that were present in `.vercel/.env.development.local`.
- Any active `ANTHROPIC_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `CRON_SECRET`, or `BYPASS_PASSWORD` value that was shared outside the secret manager.

Record the new values only in approved secret stores:

- Local development: `.env.local`
- Hosted runtime: Vercel project environment variables

Do not commit rotated values back into the repository.
