# Go Viral Launch Status

Audit date: April 8, 2026
Target launch window: Monday, April 13, 2026 or Wednesday, April 15, 2026
Confidence score: 7/10

## What Is Done

- Removed the in-app password gate and bypass middleware path. The product landing page is now public and the workspace is auth-gated by app session only.
- Deleted the legacy bypass endpoints and cookie-based paid bypass path from source.
- Rebuilt the homepage around public product positioning, sample diagnosis output, and a sign-in CTA that leads into the real workspace.
- Cleaned nav and auth flow copy so the marketing surface no longer routes users through `/bypass`.
- Folded the important frame-analysis grounding ideas from PR #128 into the current codebase:
  - literal-observation guardrails in the frame prompt
  - `lightingSource` added to structured vision output
  - `attractivenessSignal` and `attractivenessReason` added for hook evidence
  - hook-zone summaries now surface lighting source and on-camera presence
- Tightened the hook evidence summaries inside `app/api/analyze/[id]/route.ts` so downstream agent prompts carry the new frame signals.
- Removed the results-page dependency on the old `rmt_paid_bypass` cookie.
- Cleaned launch-facing pricing and login copy to avoid “beta/fake checkout” language while keeping the current onboarding flow intact.
- Fixed the error page and skip-link navigation to use proper Next.js links.

## PR Review Ledger

- PR #126: not safe to merge as-is. It is stale and superseded by the newer landing-page work shipped in this launch branch.
- PR #127: already merged before this audit.
- PR #128: relevant and worth shipping. Its core changes were manually carried into the current branch because `main` moved and the launch branch needed broader coordinated cleanup.
- PR #129: not worth merging separately. Current `main` already has newer prompt-bundle plumbing that wires hook-zone context differently, so this PR is effectively superseded.
- PR #130: not safe to merge as-is. It was stacked on an older base and still assumed bypassed users/workspace copy that this audit intentionally removed.
- PR #131: not safe to merge as-is before launch. Large UX rewrite, stale base, conflict risk, and too much surface area for the current launch window.

## Open Issues

- `npm run lint` still fails on pre-existing repo debt outside this launch patch set.
- Current remaining lint errors:
  - `app/scripts/page.tsx`
  - `components/AccountCTA.tsx`
  - `components/AnalyzingPreview.tsx`
  - `components/ContentCalendar.tsx`
  - `components/CookieConsent.tsx`
  - `lib/hook-help.ts`
- `app/api/roast/route.ts` still returns `501 NOT_IMPLEMENTED` for TikTok URL analysis. If any public UI still points users at URL analysis, that should stay hidden until implemented.
- Paid entitlements are not actually verified server-side in code right now. For launch safety, legacy bypass trust was removed; real paid access needs founder-side billing/entitlement wiring.
- Settings still presents subscription/billing scaffolding that does not appear fully wired to live product state.

## Founder-Blocked

- Environment variables and provider credentials for production analysis.
- Real billing / entitlement activation flow.
- Decision on whether TikTok URL analysis should launch now or stay hidden.
- Final go/no-go on large prelaunch UX changes from PR #131.

## Recommendation

Launch is viable if the goal is:

- public marketing site
- authenticated upload-and-analysis flow
- AI roast results for uploaded videos

Launch is not fully clean if the goal is:

- live paid subscriptions with verified entitlements
- URL-based TikTok analysis
- a lint-clean repo

My read: this can launch in the April 13-15 window if founder-side infra is ready and launch messaging stays focused on uploaded video diagnosis, not billing sophistication or TikTok URL ingestion.
