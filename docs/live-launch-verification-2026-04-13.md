# Live Launch Verification - 2026-04-13

Scope: verify the real production launch path for Anthropic-backed roast analysis, Stripe checkout/webhooks/portal, Supabase-backed subscription state, Resend-backed welcome email, and CRON-protected production routes.

Verification timestamp: 2026-04-13 21:30 CDT / 2026-04-14 02:30 UTC

Production target:

- App: `https://roastmytiktok.vercel.app`
- Supabase: `https://eayiazyiotnkggnsvhto.supabase.co`

## Result

Launch path verification did not pass.

The current production deployment and the supplied Supabase project do not satisfy the ship gate. Several acceptance criteria are currently impossible to verify end to end because the required routes are either blocked by the global bypass layer, not present in `origin/main`, or backed by a production database that does not yet contain the Stripe entitlement schema.

## Production Findings

### 1. Production app is still globally bypass-gated

Observed on 2026-04-13:

- `GET /` returns `307` to `/bypass?next=%2F`
- `GET /api/crons/trending` returns `307` to `/bypass?next=%2Fapi%2Fcrons%2Ftrending`
- `GET /api/stripe/webhook` returns `307` to `/bypass?next=%2Fapi%2Fstripe%2Fwebhook`
- `GET /api/stripe/checkout` returns `307` to `/bypass?next=%2Fapi%2Fstripe%2Fcheckout`
- `GET /api/subscription` returns `307` to `/bypass?next=%2Fapi%2Fsubscription`
- `GET /api/welcome-email` returns `307` to `/bypass?next=%2Fapi%2Fwelcome-email`
- `GET /api/roast` returns `307` to `/bypass?next=%2Fapi%2Froast`

Impact:

- `CRON_SECRET` cannot be exercised through the deployed cron route because the request is intercepted before the route handler runs.
- Stripe cannot deliver webhooks to the deployed webhook route while this bypass layer is in front of `/api/stripe/webhook`.
- Public launch-path testing is blocked before any app-specific verification can occur.

### 2. Production Supabase is missing the billing entitlement schema

Observed on 2026-04-13 against the supplied Supabase project:

- `GET /rest/v1/rmt_entitlements?...` returns `PGRST205` with `Could not find the table 'public.rmt_entitlements' in the schema cache`
- `GET /rest/v1/rmt_roast_sessions?...` succeeds, confirming the supplied project is live and not empty, but the billing schema is absent

Impact:

- Stripe checkout and webhook reconciliation cannot persist subscription state to the database the current repo expects.
- `/api/stripe/webhook` cannot satisfy the acceptance criterion `webhook reconciliation works` until `supabase/012_stripe_paid_entitlements.sql` is applied to the correct production project.

### 3. The task-referenced welcome-email path is not implemented in `origin/main`

Repository check against `origin/main` on 2026-04-13:

- `app/api/welcome-email/route.ts` is absent
- no tracked `resend` dependency exists in `package.json`
- no tracked `welcome-email` or `resend` integration exists under `app/` or `lib/`

Impact:

- The acceptance criterion `welcome email path is verified` cannot pass from the current `main` branch because that route and provider integration are not shipped here.

### 4. The task-referenced route names do not match the current repo in multiple places

Repository check against `origin/main`:

- `app/api/roast/route.ts` is absent; the current upload flow posts to `/api/analyze`
- `app/api/subscription/route.ts` is absent
- `lib/demo-mode.ts` is absent

Current code paths:

- roast upload starts from `components/upload/UnifiedUploadFlow.tsx`
- live roast analysis is served from `app/api/analyze/route.ts` and `app/api/analyze/[id]/route.ts`
- billing routes are `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, and `app/api/settings/billing-portal/route.ts`

Impact:

- The verification target in the task is partly stale relative to the current repository state.
- Anthropic presence should be validated against the actual analysis and script routes rather than a non-existent `lib/demo-mode.ts`.

## Repo State Findings

### Anthropic wiring exists in code, but live verification is blocked

`origin/main` contains Anthropic usage in:

- `app/api/analyze/[id]/route.ts`
- `app/api/generate-script/route.ts`
- `app/api/improve-script/route.ts`
- `app/api/niche/analyze/route.ts`
- `lib/whisper-transcribe.ts`

What could not be verified:

- whether production Vercel env actually has `ANTHROPIC_API_KEY`
- whether the live deployment can complete one real roast end to end

Reason:

- the production app is still bypass-gated
- no Vercel env access was available in this session

### Stripe billing code exists, but production deploy and schema are not aligned

`origin/main` contains:

- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/settings/billing-portal/route.ts`
- `lib/stripe.ts`

Open GitHub PRs relevant to launch:

- `#151 feat: ship real stripe checkout and server-side paid entitlements`
- `#138 launch: remove bypass gates and harden launch surface`

Impact:

- live billing verification requires both deploy-state alignment and database migration alignment
- current production evidence shows neither is true yet

## Ship Gate Status

### Failed or blocked

- `Verify Anthropic is present so lib/demo-mode.ts does not force demo mode`
  - blocked: `lib/demo-mode.ts` does not exist in `origin/main`; production env access unavailable
- `Verify Stripe checkout, webhook, and portal flows with live production config`
  - failed: webhook and checkout paths are bypass-redirected in production; billing schema is missing in the supplied Supabase project
- `Verify Resend and CRON_SECRET backed routes needed for launch are configured`
  - failed/blocked: no tracked Resend integration exists; cron route is bypass-redirected before `CRON_SECRET` can be checked
- `one real roast completes`
  - blocked by bypass-gated production and unavailable production env access
- `one real checkout completes`
  - blocked by bypass-gated production and missing billing schema
- `webhook reconciliation works`
  - failed because the production webhook path is bypass-redirected and the database table is missing
- `subscription state resolves`
  - failed because the entitlement table is missing
- `welcome email path is verified`
  - blocked because the route/provider integration is not present in `origin/main`

## Required Next Actions

1. Merge and deploy a bypass-removal or route-exemption fix before attempting production verification again.
2. Apply `supabase/012_stripe_paid_entitlements.sql` to the actual production Supabase project used by the deployment.
3. Merge and deploy the Stripe entitlement work before attempting live checkout verification.
4. Provide Vercel production env access or another authoritative source of deployed env state for `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, and any Resend credentials.
5. Either add a real `welcome-email` route plus Resend integration or remove that requirement from the launch gate until the feature exists in the repo.
