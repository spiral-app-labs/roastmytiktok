# Launch Secret Handling

This repo must not ship with hardcoded secrets or tracked local env files.

## Current status

- No Brave fallback API key is present in the current tracked codebase.
- `.env.local` and `.vercel/.env.development.local` are treated as incident-only leak artifacts for this repo and must not exist under the repo root.
- `npm run verify:secrets` fails if either of those secret-bearing files exists on disk, becomes tracked, or remains visible in reachable git history.
- `.env.example` is the checked-in source of truth for required env names and placeholders.
- The production build path is open again, so secret rotation now matters before launch rather than later.

## Local secret flow

1. Keep `.env.example` as the only env file in the repo tree.
2. Inject real local credentials outside the repo root, for example through shell exports, `direnv`, or a local secret manager that does not materialize a secret-bearing file in this checkout.
3. Configure Vercel project secrets in the Vercel dashboard instead of storing them in repo-local `.vercel` env files.
4. If a secret is ever exposed in a local env file or commit, rotate it immediately before launch and remove the file entirely from the working tree.

## Rotation follow-up

Rotate any credential that was previously exposed outside the approved secret store. Based on the current deploy task, that includes at minimum:

- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_OIDC_TOKEN`
- `BYPASS_PASSWORD`
- `BRAVE_SEARCH_API_KEY`
- Any active `ANTHROPIC_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `CRON_SECRET`, or `BYPASS_PASSWORD` value that was shared outside the secret manager.

Record the new values only in approved secret stores:

- Local development: shell-level or secret-manager injection outside the repo root
- Hosted runtime: Vercel project environment variables
- Supabase runtime: Supabase project/function secret stores

Historical exposure follow-up:

1. If the historical Brave key commit is still reachable from any branch or tag, purge it or obtain explicit sign-off that the history will remain.
2. After rotation, verify the old Brave key, Supabase service-role key, bypass password, and Vercel OIDC token are invalidated.
3. Do not commit rotated values back into the repository.
