# Launch Secret Handling

This repo must not ship with hardcoded secrets or tracked local env files.

## Current status

- No Brave fallback API key is present in the current tracked codebase.
- `.env.local` and `.vercel/.env.development.local` are treated as local-only files and must never be added to git.
- `npm run verify:secrets` fails if either of those secret-bearing files becomes tracked.

## Local secret flow

1. Keep real credentials in `.env.local` only.
2. Use `.env.example` for placeholders and onboarding.
3. Configure Vercel project secrets in the Vercel dashboard instead of storing them in repo-local `.vercel` env files.
4. If a secret is ever exposed in a local env file or commit, rotate it immediately before launch.

## Rotation follow-up

Rotate any credential that was previously exposed outside the approved secret store. Based on the task brief, that includes:

- The previously hardcoded Brave API key, if it was active.
- Any real secrets that were present in `.env.local`.
- Any real secrets that were present in `.vercel/.env.development.local`.

Record the new values only in approved secret stores:

- Local development: `.env.local`
- Hosted runtime: Vercel project environment variables

Do not commit rotated values back into the repository.
