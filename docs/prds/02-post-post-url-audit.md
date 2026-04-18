# Post-Post URL Audit

## Summary

Go Viral currently helps before posting. This PRD adds the first post-post feedback loop by allowing a creator to paste a public TikTok URL and get an audit of what actually happened in the posted video.

This feature should answer:

- what worked in the posted version
- what missed
- what to do next
- whether the creator followed the original advice, when linked to a previous roast
- what evidence supports the audit, and how confident the system is
- what the creator should change if they want to ask follow-up questions about the same video

v1 is TikTok-only and URL-first. It should reuse the existing analysis pipeline as much as possible rather than inventing a second analysis stack. It must also be able to ship before the full hook corpus from PRD 1 is finished, which means the audit has to be grounded first in the creator's own video evidence and only optionally enriched with market evidence.

## Goals

### Product goals

- Close the loop between pre-post advice and real posted outcomes.
- Let creators paste a TikTok URL with lower friction than re-uploading the asset.
- Reuse the current analysis pipeline and roast session model where possible.
- Support comparison against a prior roast when the creator links one.
- Create a grounded audit surface that can later power follow-up chat without rebuilding the evidence model.

### Success criteria

- A valid public TikTok URL can create an analysis session and complete an audit end-to-end.
- The audit returns a structured result with `what worked`, `what missed`, and `what to do next`.
- Linked audits can classify whether the creator followed original advice for the prior roast's top 3 action items.
- Failure states are explicit and user-readable for invalid, private, removed, or download-blocked URLs.
- The audit can ship with only session evidence and linked-roast evidence, without depending on the full external hook corpus.
- Every generated audit section can cite at least one concrete evidence item from the posted video, linked roast, or optional market evidence packet.

### Non-goals for v1

- Instagram Reels support
- Bulk URL audits
- Team review workflows
- Social publishing or scheduling
- A standalone generic chat product detached from the video and its evidence

## Current state and starting points

Relevant existing pieces:

- `rmt_roast_sessions` already supports `source in ('upload', 'url')`.
- `components/upload/UnifiedUploadFlow.tsx` is the current upload-first entrypoint.
- `app/api/analyze/route.ts` creates upload sessions.
- `app/api/analyze/[id]/route.ts` runs the core analysis pipeline.
- `app/api/roast/[id]/route.ts` already serves roast results.

Missing today:

- URL intake route
- public TikTok fetch/download flow for app sessions
- audit result model
- linked-roast comparison logic
- URL-specific analysis progress and error handling
- a reusable audit evidence packet for UI and future chat

## Evidence strategy and dependency on PRD 1

This feature should not wait on the full evidence corpus to become useful. The audit uses a layered evidence model:

1. `session evidence` from the posted video itself. Required.
2. `linked roast evidence` from the original pre-post roast and its action plan. Optional.
3. `market evidence` from PRD 1's hook corpus. Optional enhancement.

Shipping rule:

- v1 URL audit must ship with layers 1 and 2 only.
- Market evidence is additive and should plug in later when PRD 1 reaches stable retrieval quality.
- If market evidence is absent, the audit still completes and the UI does not show an empty market-evidence rail.

This keeps PRD 2 decoupled from PRD 1 while still reserving a clean integration path.

## Shared contracts frozen by this PRD

### Roast session contract changes

Extend `rmt_roast_sessions` with:

```sql
alter table rmt_roast_sessions
  add column if not exists analysis_intent text not null default 'pre_post' check (analysis_intent in ('pre_post', 'post_post')),
  add column if not exists platform text check (platform in ('tiktok')),
  add column if not exists platform_url text,
  add column if not exists platform_metrics jsonb not null default '{}'::jsonb,
  add column if not exists linked_roast_id text references rmt_roast_sessions(id) on delete set null;
```

Contract rules:

- `source = 'upload' | 'url'` describes how media entered the system.
- `analysis_intent = 'pre_post' | 'post_post'` describes the product workflow.
- v1 URL audits always create sessions with `source = 'url'` and `analysis_intent = 'post_post'`.

### Result contract

Audit responses append a `postAudit` payload into `result_json`.

```ts
interface EvidenceCitation {
  id: string;
  sourceType: 'session' | 'linked_roast' | 'market';
  label: string;
  detail: string;
  timestampLabel?: string;
  sourceRef?: string;
}

interface MarketEvidenceMatch {
  exampleId: string;
  hookText: string;
  creatorHandle?: string;
  reason: string;
  matchScore: number;
}

interface PostAuditResult {
  platform: 'tiktok';
  platformUrl: string;
  metricsAvailable: boolean;
  confidence: 'low' | 'medium' | 'high';
  evidenceSummary: {
    strongestSignals: string[];
    citations: EvidenceCitation[];
    marketEvidence?: MarketEvidenceMatch[];
  };
  whatWorked: string[];
  whatMissed: string[];
  nextMoves: string[];
  adviceFollowThrough?: {
    linkedRoastId: string;
    overallVerdict: 'mostly_followed' | 'partially_followed' | 'not_followed';
    items: Array<{
      priority: 'P1' | 'P2' | 'P3';
      dimension: string;
      status: 'followed' | 'partially_followed' | 'not_followed' | 'not_evaluable';
      reason: string;
    }>;
  };
  chatEligible: boolean;
}
```

Contract rules:

- `citations` must always contain at least 3 items for completed audits, unless the session is explicitly marked low-confidence.
- `marketEvidence` is omitted entirely when PRD 1 retrieval is unavailable or low-confidence.
- `chatEligible = true` only when the audit completed successfully and a reusable evidence packet exists.

## User experience

### Entry point

Add a second input mode next to upload:

- tab 1: Upload video
- tab 2: Paste TikTok URL

The URL path asks for:

- public TikTok URL
- optional linked prior roast

The prior roast selector should show the user's recent roast history and allow skipping.

### Flow

1. User pastes TikTok URL.
2. Client validates URL shape before submit.
3. Client sends `POST /api/analyze/url`.
4. Server creates session with `source = 'url'`, `analysis_intent = 'post_post'`, and `platform = 'tiktok'`.
5. Server fetches metadata and downloads media.
6. Existing analysis pipeline runs on the fetched asset.
7. Verdict layer generates normal roast output plus `postAudit`.
8. Roast page renders audit-specific sections when `analysis_intent = 'post_post'`.

### Audit page sections

For post-post sessions, the roast detail page must render these sections above secondary fixes:

- `What worked`
- `What missed`
- `What to do next`
- `Did you follow the original advice?` when `linked_roast_id` exists

The standard hook-first diagnostics still render. The audit layer is additive.

### Evidence display behavior

The audit page should show evidence in this order:

1. strongest evidence from the posted video
2. linked roast evidence, when available
3. market evidence examples, only when PRD 1 retrieval returns confident matches

This is important product behavior, not just UI ordering. The product should first prove what it saw in the creator's own video before reaching for external examples.

## URL intake and validation

### New endpoint

- `POST /api/analyze/url`

Request:

```json
{
  "platformUrl": "https://www.tiktok.com/@handle/video/123",
  "linkedRoastId": "optional-session-id"
}
```

Behavior:

- validate host is TikTok
- normalize URL
- reject unsupported domains and malformed video URLs with `400`
- create pending roast session row before fetch begins

Response:

```json
{
  "id": "session-id",
  "platform": "tiktok",
  "platformUrl": "normalized-url"
}
```

### Validation rules

Reject when:

- URL is not TikTok
- video id cannot be parsed
- linked roast does not belong to the current user

Allow when:

- query params are present but removable
- mobile TikTok hostnames normalize to a valid canonical video URL

## Download and media acquisition

### Download strategy

Use `yt-dlp` as the primary server-side downloader for public TikTok URLs. This becomes a runtime dependency for URL audit only.

Behavior:

- fetch metadata first
- attempt media download to a temp file
- upload downloaded asset into existing `roast-videos` storage
- persist the storage path into `video_url`
- persist metadata and any extracted metrics into `platform_metrics`

### Runtime contract

If `yt-dlp` is unavailable:

- `POST /api/analyze/url` returns `503`
- error message explains that public URL analysis is unavailable on this deployment

This mirrors the existing dependency-gated behavior used elsewhere in the app.

## Analysis pipeline behavior

The URL audit reuses the existing core analysis stack. Differences from upload sessions:

- source media is acquired server-side, not client-uploaded
- `analysis_intent = 'post_post'` triggers audit sections in the verdict prompt
- metrics and prior roast data are optionally injected into the final synthesis stage
- the verdict layer must produce a reusable evidence packet for UI and future chat

### Evidence packet assembly

Before the final synthesis step, the pipeline must assemble a normalized audit evidence packet from:

- hook analysis findings and timestamps
- transcript or on-screen text evidence when reliable
- agent findings and action-plan evidence from the current posted video
- linked roast action plan and prior evidence, when available
- optional market evidence from PRD 1's retrieval layer

Rules:

- market evidence must never be the only evidence source
- if transcript reliability is weak, the packet should lean on visual and timing evidence instead of guessing
- every citation in the packet should be short enough to render in UI and reuse in chat

### Verdict prompt additions

When `analysis_intent = 'post_post'`, the verdict layer receives:

- normal hook-first analysis outputs
- platform metrics when available
- linked prior roast action plan when available
- optional market evidence matches when retrieval is available and confident

It must produce:

- `whatWorked`
- `whatMissed`
- `nextMoves`
- `adviceFollowThrough` if a linked roast exists
- `evidenceSummary`
- `confidence`
- `chatEligible`

### Metrics handling

Platform metrics are optional. Missing metrics must not block the audit.

Behavior:

- if metrics exist, use them as supporting evidence
- if metrics do not exist, set `metricsAvailable = false`
- UI must state that the audit is based on content analysis without platform metrics

### Market evidence integration

When PRD 1 is available, the post-post audit may request 2 to 3 market matches using the posted video's:

- primary niche
- detected mechanism
- primary failure or strength pattern

Usage rules:

- only approved market evidence may be used
- market evidence should enrich `whatWorked`, `whatMissed`, or `nextMoves`, not replace direct video evidence
- if fewer than 2 high-confidence matches exist, omit market evidence from the response entirely
- the audit should describe market evidence as "examples like this" rather than pretending causal certainty

## Linked roast comparison

### Input contract

`linked_roast_id` is optional and must reference a prior session owned by the current user.

### Comparison rules

Compare the linked roast's top 3 action-plan items only.

For each item, the audit must classify:

- `followed`
- `partially_followed`
- `not_followed`
- `not_evaluable`

Rules:

- `followed`: the posted video clearly implements the action's core instruction
- `partially_followed`: some evidence of change, but incomplete execution
- `not_followed`: no material evidence that the advice was applied
- `not_evaluable`: source evidence is too weak to judge honestly

Overall verdict:

- `mostly_followed` when P1 is followed or partially followed and at least 2 of 3 items are not `not_followed`
- `partially_followed` when P1 is partially followed or exactly 1 of 3 items is followed
- `not_followed` otherwise

## UI requirements

### Input UI

Add a URL input mode to the existing analysis entry surface.

Requirements:

- paste field
- TikTok-only helper copy
- recent roast selector for optional link
- URL-specific validation message

### Progress UI

URL audit progress should show stages tailored to server-side fetch:

1. validating public URL
2. fetching metadata
3. downloading posted video
4. analyzing hook and media
5. comparing against prior advice
6. building audit

### Roast detail UI

When `analysis_intent = 'post_post'`, render:

- post-post audit summary block near the top
- evidence summary strip with 3 to 5 citations
- linked roast follow-through panel if present
- market evidence cards if present
- `Ask follow-up` entrypoint when `chatEligible = true`
- regular hook and fix panels below

This keeps one result page with conditional sections instead of building a separate standalone audit page.

### Audit evidence strip

The evidence strip should summarize:

- strongest quote or on-screen cue
- strongest timing clue
- strongest linked-roast or pattern clue

This is the compact proof layer that makes the audit feel earned before the user reads the longer analysis.

## Audit copilot chat

This is an extension lane for PRD 2 and should be designed now so the audit result model does not have to change later.

### Product position

This is not a generic chatbot. It is a follow-up copilot for one analyzed video.

The user should be able to ask:

- "is this okay?"
- "would this work?"
- "why did you say the hook missed?"
- "which of these 2 lines is stronger?"
- "rewrite the first line with the same idea"
- "if I keep the edit but change the opening text, is that enough?"

### Scope decision

- v1 URL audit launch does not require chat to ship
- the PRD must still define the chat contract now so the audit stores the right evidence packet
- chat is phase 2 of this same initiative, not a separate generic AI feature

### New endpoint for phase 2

- `POST /api/roast/[id]/chat`

Request:

```json
{
  "message": "would this new opener work: if your videos stall at 300 views, this is probably why",
  "candidateText": "optional alternate hook or line",
  "candidateType": "hook"
}
```

Response:

```ts
interface RoastChatReply {
  answer: string;
  confidence: 'low' | 'medium' | 'high';
  citations: EvidenceCitation[];
  suggestedFollowUps: string[];
}
```

### Chat behavior

The chat layer must:

- only answer from the roast result, audit evidence packet, linked roast context, and optional market evidence
- cite its answer with 1 to 3 citations
- explicitly say when it is uncertain
- avoid turning into broad "how do I go viral" strategy chat

### Candidate evaluation behavior

If the user provides candidate text, the chat may:

- compare it against the current opener
- explain what improved
- explain what still misses
- recommend one tighter revision

It may not:

- pretend it ran a full new analysis on unretrieved media
- claim performance certainty from hypothetical text alone

## APIs and types

### New or updated public interfaces

- `POST /api/analyze/url`
- session types updated with `analysis_intent`, `platform`, `platform_url`, `platform_metrics`, `linked_roast_id`
- result types updated with `postAudit?: PostAuditResult`
- phase 2: `POST /api/roast/[id]/chat`

### Internal helper additions

- URL parser/normalizer
- TikTok metadata fetcher
- server-side downloader wrapper
- linked roast comparator
- audit evidence packet builder
- phase 2: roast chat responder grounded in stored audit context

## Failure states

### Hard failures

- invalid URL
- unsupported platform
- private or removed video
- download failure
- downloader unavailable

Behavior:

- analysis session moves to `failed`
- UI shows explicit reason
- no half-empty result page is rendered

### Soft failures

- metrics unavailable
- transcript weak
- linked roast cannot be evaluated fully

Behavior:

- audit still completes
- result states uncertainty explicitly

## Analytics and monitoring

Track:

- `url_audit_started`
- `url_audit_download_succeeded`
- `url_audit_download_failed`
- `url_audit_completed`
- `url_audit_linked_roast_used`
- `url_audit_follow_through_generated`
- `url_audit_market_evidence_attached`
- phase 2: `roast_chat_opened`
- phase 2: `roast_chat_replied`
- phase 2: `roast_chat_candidate_evaluated`

Operational metrics:

- completion rate by URL audit session
- download failure rate
- private/removed URL rate
- linked roast usage rate

## Rollout plan

### Phase 1: internal validation

- TikTok-only
- no Reels support
- verify downloader dependency and storage flow
- test with 20 known public URLs

### Phase 2: private beta

- enable audit evidence strip
- validate session-evidence quality without depending on PRD 1
- plug in market evidence only when confident retrieval is available

### Phase 3: follow-up chat beta

- enable `Ask follow-up` on completed post-post audits
- support citation-backed Q&A and candidate hook checks
- refine answer guardrails and uncertainty behavior

### Phase 4: public rollout

- enable TikTok URL audits broadly
- keep Reels out of scope until reliability is proven

## Acceptance criteria

- Public TikTok URL audits succeed end-to-end for valid videos.
- Invalid/private/deleted URLs fail cleanly with explicit reasons.
- The analysis pipeline reuses existing roast logic rather than forking a second stack.
- Linked roast comparisons classify top 3 action items consistently.
- Post-post sessions render `what worked`, `what missed`, and `what to do next`.
- Missing platform metrics do not break the audit.
- Completed audits always expose a reusable evidence packet.
- Market evidence is additive and can be omitted without breaking the feature.
- Phase 2 chat replies stay grounded in stored citations and can evaluate candidate opener text without pretending certainty.

## Parallel agent split

### Agent 1: URL ingestion and session plumbing

Owns:

- schema updates
- `POST /api/analyze/url`
- metadata and downloader wrapper

Likely touchpoints:

- `app/api/analyze/route.ts`
- new URL route
- session migrations

### Agent 2: audit result model and linked roast comparison

Owns:

- `PostAuditResult` types
- verdict prompt additions
- prior-roast comparison logic
- audit evidence packet assembly
- phase 2 chat response contract and prompt

Likely touchpoints:

- `app/api/analyze/[id]/route.ts`
- result types

### Agent 3: URL input and audit UI

Owns:

- URL-first input mode
- URL-specific progress states
- roast page audit sections
- evidence summary strip and optional market evidence cards
- phase 2 `Ask follow-up` UI

Likely touchpoints:

- `components/upload/UnifiedUploadFlow.tsx`
- roast detail UI

Dependency rule:

- Agent 1 freezes session and route contracts first.
- Agent 2 can build against fixture data once the `PostAuditResult` shape is frozen.
- Agent 3 should not block on real downloader availability and can render from mocked post-post results.

## Open implementation defaults

These are frozen for v1:

- TikTok is the only supported platform.
- URL input is the primary path; upload-plus-metrics is not required in v1.
- Result rendering stays on the existing roast detail page.
- Metrics are optional, not required for completion.
- `yt-dlp` is the primary downloader and a required dependency for URL audit environments.
- PRD 1 evidence integration is optional and non-blocking for v1.
- Follow-up chat is part of the same initiative, but it ships after the URL audit result model and evidence packet are stable.
