# Evidence Rail And Hook Corpus

## Summary

Go Viral needs a real hook-evidence system, not just a synthetic pattern library. This PRD defines the shared platform for ingesting, reviewing, ranking, and presenting real hook examples so the product can:

- improve prompt quality with actual market evidence
- show creators concrete examples instead of generic advice
- support future post-post audits and watchlist digests with the same corpus

This feature is the shared platform lane for the other two roadmap items. It should ship in phases:

1. Internal alpha at 500 approved hooks
2. Limited beta at 500 to 1,999 approved hooks
3. Public beta at 2,000 approved hooks
4. Scale target at 10,000 approved hooks

The 10,000-hook target is not a hard blocker for starting product integration, but public evidence rails should not launch with a tiny dataset.

## Goals

### Product goals

- Give the roast and script surfaces a trustworthy "here are real examples" layer.
- Replace generic evidence-free hook rewrites with grounded examples and rationale.
- Build an ingestion path that supports curated hooks today and high-volume imports later.
- Keep prompt inputs safe by only surfacing reviewed examples.

### Success criteria

- Evidence retrieval returns 2 to 5 relevant approved examples for at least 80 percent of hook-first roasts once the corpus reaches 2,000 approved hooks.
- Hook rewrite prompts can consume grounded examples without increasing malformed output rate.
- Internal reviewers can import, review, and approve at least 250 hooks per hour from a clean CSV or founder-supplied batch.
- Roast pages render evidence cards with no empty-state breakage when matching data is sparse.

### Non-goals for v1

- Training or fine-tuning new models from the corpus
- Full autonomous scraping as the only ingestion path
- Public community submission workflows
- Team collaboration features or per-seat permissions

## Current state and starting points

Current assets already in the repo:

- `rmt_viral_patterns` stores synthetic taxonomy and example lines, not a real reviewed corpus.
- `lib/viral-hooks.ts` contains a hardcoded library and matching heuristics.
- `lib/hook-analysis.ts` and the roast page already produce structured hook diagnoses that can drive retrieval.
- `app/api/trending/route.ts`, `lib/trending-context.ts`, and the trend scraper provide adjacent signal sources that should enrich the corpus later.

Current constraints:

- The product has no reviewed hook example table.
- There is no import or review workflow.
- There is no shared retrieval contract that UI, prompts, and digests can reuse.

## Users and jobs to be done

### Primary users

- Internal operator curating and reviewing hook data
- Creator receiving evidence-backed feedback on a roast
- Future background jobs that need a reusable corpus for ranking and summaries

### Core jobs

- "Import 100 to 1,000 hooks from a source without polluting prompts."
- "Review a batch fast, merge duplicates, and keep only safe examples."
- "Show me 3 real examples that match this creator's niche and hook failure."
- "Ground a rewrite prompt with real evidence instead of generic pattern filler."

## Shared contracts frozen by this PRD

This PRD owns the shared data and retrieval contracts used by all three roadmap items.

### Corpus contract

The real evidence store is `rmt_hook_examples`. `rmt_viral_patterns` remains taxonomy/reference data only.

### Review safety contract

Only rows with `review_status = 'approved'` can be used in prompts or shown to non-admin users.

### Retrieval contract

All product surfaces consume the same retrieval response type:

```ts
interface HookCorpusMatch {
  example: HookEvidenceExample;
  matchScore: number;
  matchReasons: string[];
  matchedOn: {
    niche: string[];
    mechanisms: string[];
    weaknesses: string[];
  };
}
```

### Rollout contract

- Under 500 approved hooks: internal-only retrieval and UI
- 500 to 1,999 approved hooks: staff and flagged cohort only
- 2,000 or more approved hooks: public evidence rail enabled

## Data model

### New table: `rmt_hook_examples`

This is the canonical reviewed hook corpus.

```sql
create table if not exists rmt_hook_examples (
  id uuid primary key default gen_random_uuid(),
  dedupe_fingerprint text not null,
  source_kind text not null check (source_kind in ('manual', 'founder', 'csv', 'url', 'scrape')),
  source_label text,
  source_url text,
  platform text not null default 'tiktok' check (platform in ('tiktok', 'instagram', 'youtube', 'unknown')),
  platform_post_url text,
  creator_handle text,
  creator_display_name text,
  hook_text text not null,
  normalized_hook_text text not null,
  hook_start_seconds numeric(5,2) not null default 0,
  language_code text not null default 'en',
  niche_primary text not null,
  niche_secondary text[] not null default '{}',
  mechanism_primary text not null,
  mechanism_secondary text[] not null default '{}',
  weakness_tags text[] not null default '{}',
  evidence_type text not null check (evidence_type in ('spoken', 'text_overlay', 'visual', 'mixed')),
  performance_band text not null default 'unknown' check (performance_band in ('unknown', 'baseline', 'strong', 'breakout')),
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  share_count bigint,
  save_count bigint,
  duration_seconds numeric(6,2),
  on_screen_text text,
  why_it_worked text,
  review_status text not null default 'candidate' check (review_status in ('candidate', 'approved', 'rejected', 'archived')),
  review_notes text,
  imported_by text,
  approved_by text,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_rmt_hook_examples_fingerprint on rmt_hook_examples(dedupe_fingerprint);
create index if not exists idx_rmt_hook_examples_review on rmt_hook_examples(review_status);
create index if not exists idx_rmt_hook_examples_niche on rmt_hook_examples(niche_primary);
create index if not exists idx_rmt_hook_examples_mechanism on rmt_hook_examples(mechanism_primary);
```

Field behavior:

- `dedupe_fingerprint` is a normalized hash of `platform_post_url` when available, else `normalized_hook_text + creator_handle`.
- `weakness_tags` maps examples to failure modes the product already uses, such as `clarity_gap`, `payoff_delay`, and `text_overload`.
- `why_it_worked` is required before approval.
- `review_status = 'candidate'` is the default for every import path, including founder imports.

### New table: `rmt_hook_import_jobs`

Tracks batch imports.

```sql
create table if not exists rmt_hook_import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('manual', 'founder', 'csv', 'url', 'scrape')),
  input_type text not null check (input_type in ('form', 'csv', 'urls', 'json')),
  status text not null check (status in ('queued', 'processing', 'completed', 'failed', 'partially_completed')),
  source_label text,
  input_uri text,
  totals jsonb not null default '{}'::jsonb,
  error_summary text,
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
```

`totals` must include:

- `rows_received`
- `rows_parsed`
- `rows_created`
- `rows_deduped`
- `rows_rejected`

### New table: `rmt_hook_import_items`

Stores row-level import results so reviewers can inspect failures without rerunning the job.

```sql
create table if not exists rmt_hook_import_items (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references rmt_hook_import_jobs(id) on delete cascade,
  source_row_key text,
  parse_status text not null check (parse_status in ('parsed', 'deduped', 'rejected', 'failed')),
  hook_example_id uuid references rmt_hook_examples(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);
```

## Import flows

All import flows write `candidate` rows first. There is no direct-to-approved path.

### 1. Manual entry

Admin enters:

- hook text
- creator handle
- source label
- platform post URL if known
- niche
- primary mechanism
- weakness tags
- why it worked

System behavior:

- creates a one-row import job
- normalizes text and dedupe fingerprint
- writes one candidate row

### 2. Founder-supplied hooks

Input:

- pasted list, JSON, or CSV from the founder's own collection

System behavior:

- each line becomes an import item
- inferred fields can be auto-filled, but all rows remain candidates
- reviewers can bulk-approve after audit

### 3. CSV import

Required CSV columns:

- `hook_text`
- `niche_primary`
- `mechanism_primary`
- `why_it_worked`

Optional columns:

- `creator_handle`
- `platform_post_url`
- `performance_band`
- `view_count`
- `like_count`
- `comment_count`
- `share_count`
- `save_count`
- `weakness_tags`
- `on_screen_text`

System behavior:

- reject file-level import if required columns are missing
- row-level failures do not fail the full job
- malformed rows get `parse_status = 'failed'`

### 4. URL import

This flow supports one or more public post URLs.

Behavior:

- fetch metadata and media transcript when available
- extract first spoken line, on-screen text, and creator handle
- propose inferred niche and mechanism
- create candidates for review

This flow can be used manually first and automated later.

## Review and dedupe workflow

### Review queue

Internal review UI must provide:

- filters by import job, source kind, niche, and parse status
- bulk actions for approve, reject, archive, merge duplicate
- side-by-side view of duplicate candidates
- quick preview of source URL when available

### Approval rules

A row can only be approved when:

- `hook_text` is present and legible
- `niche_primary` is set
- `mechanism_primary` is set
- `why_it_worked` is filled
- `dedupe_fingerprint` is unique after merge decisions

### Deduping rules

Deduping happens in two passes:

1. Hard dedupe by exact `dedupe_fingerprint`
2. Soft dedupe by normalized hook text similarity over 0.92 cosine or token overlap threshold

Reviewer actions:

- keep primary row and archive duplicate
- merge metadata into primary row
- reject both if neither is trustworthy

## Retrieval contract

### Request

Every surface calls the same internal retrieval layer.

```ts
interface HookEvidenceQuery {
  nichePrimary: string;
  nicheSecondary?: string[];
  primaryFail?: string;
  mechanismHints?: string[];
  contextSurface: 'roast' | 'script' | 'digest' | 'admin';
  count: number;
}
```

### Response

```ts
interface HookEvidenceExample {
  id: string;
  hookText: string;
  creatorHandle?: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'unknown';
  platformPostUrl?: string;
  nichePrimary: string;
  mechanismPrimary: string;
  weaknessTags: string[];
  performanceBand: 'unknown' | 'baseline' | 'strong' | 'breakout';
  whyItWorked: string;
  onScreenText?: string;
}
```

Retrieval must return:

- only approved rows
- max 2 rows per creator handle
- max 5 results
- fallback to niche-only match when mechanism/failure data is sparse

### Ranking

Final `matchScore` is out of 100:

- niche match: 40 points
- mechanism match: 25 points
- weakness tag match: 20 points
- performance band quality: 10 points
- freshness/source confidence: 5 points

Tie-breakers:

1. approved rows with richer metadata
2. stronger performance band
3. newer approval date

## Prompt grounding changes

### Hook analysis prompt

When evidence exists, add an `EVIDENCE EXAMPLES` block containing up to 3 approved matches with:

- exact hook text
- niche
- mechanism
- why it worked
- matched because

Prompt rule:

- examples inform rewrites and diagnosis
- the model may not claim the creator should copy the hook verbatim
- the model should reference the strategic pattern and make a niche-specific adaptation

### Script generation prompt

When evidence exists, pass the top 3 matches and ask for:

- one hook inspired by example 1
- one hook inspired by example 2
- one higher-variance hook that borrows the mechanism but not the language

### Fallback behavior

If retrieval returns zero approved examples:

- use current `VIRAL_HOOK_LIBRARY` fallback
- do not render an empty evidence rail card group
- log a coverage miss

## UI surfaces

### Roast page evidence rail

Location:

- below Hook Spotlight
- above secondary fixes

Card requirements:

- hook text
- creator/source label
- mechanism tag
- performance tag
- matched because explanation
- optional source link when safe to show

Display rules:

- show 3 cards on desktop, 1 to 2 stacked cards on mobile
- if fewer than 3 results exist, show the available cards only
- if no results exist, hide the rail entirely outside admin

### Hook/script surfaces

Add a smaller "Hooks Like This" panel to script generation/history surfaces with:

- 2 to 3 examples
- copyable strategic note, not a raw "steal this"

## APIs and internal interfaces

### New endpoints

- `POST /api/hook-corpus/import`
- `GET /api/hook-corpus/review`
- `POST /api/hook-corpus/review`
- `POST /api/hook-corpus/retrieve`

### Endpoint behavior

`POST /api/hook-corpus/import`

- accepts manual, CSV, and URL batch payloads
- creates import job
- returns job id and parsed totals

`GET /api/hook-corpus/review`

- admin-only
- returns candidate rows and review queue metadata

`POST /api/hook-corpus/review`

- admin-only
- supports approve, reject, archive, merge_duplicate

`POST /api/hook-corpus/retrieve`

- internal app use
- returns ordered `HookCorpusMatch[]`

## Analytics and monitoring

Track:

- `hook_import_job_created`
- `hook_import_job_completed`
- `hook_example_reviewed`
- `hook_example_approved`
- `hook_example_deduped`
- `hook_evidence_requested`
- `hook_evidence_served`
- `hook_evidence_coverage_miss`

Operational dashboards:

- approved hooks by niche
- approval rate by source kind
- coverage miss rate by hook failure type
- duplicate rate by import path

## Rollout plan

### Phase 1: internal alpha

- ship schema, imports, review queue, retrieval API
- hide public UI
- begin with curated hooks and founder imports

### Phase 2: limited beta

- enable evidence rail for internal/staff cohort
- require 500 approved hooks and at least 10 covered primary niches
- compare grounded prompts vs fallback prompts

### Phase 3: public beta

- enable public evidence rail once 2,000 approved hooks exist
- enable script-surface evidence panels
- keep retrieval quality guardrails and coverage logging active

## Acceptance criteria

- Corpus imports dedupe correctly and preserve source metadata.
- Candidate rows never leak into prompts or public UI.
- Retrieval returns relevant examples without malformed cards.
- Roast pages render evidence-backed cards without breaking existing hook-first flows.
- Script generation can use grounded examples and still return valid output.
- Coverage misses degrade gracefully to existing synthetic libraries.

## Parallel agent split

### Agent 1: data model and import/review tooling

Owns:

- Supabase schema and migrations
- import job APIs
- review queue APIs and admin UI

Files likely touched:

- `supabase/*.sql`
- `app/api/hook-corpus/*`

### Agent 2: retrieval and prompt grounding

Owns:

- retrieval service
- ranking logic
- hook/script prompt integration

Files likely touched:

- `lib/viral-hooks.ts`
- `lib/hook-analysis.ts`
- script generation routes

### Agent 3: evidence UI surfaces

Owns:

- roast evidence rail
- script surface evidence panels
- analytics wiring for served coverage

Files likely touched:

- `app/roast/[id]/*`
- script-related UI surfaces

Dependency rule:

- Agent 1 freezes schema and response shapes first.
- Agent 2 builds against mocked approved-row fixtures if Agent 1 is still migrating.
- Agent 3 builds against the retrieval contract, not direct table reads.

## Open implementation defaults

These are frozen for v1 so implementers do not need to decide later:

- Founder imports are not trusted by default. They still start as candidates.
- Public evidence UI is hidden until 2,000 approved hooks.
- Retrieval count defaults to 3 for roast pages and 2 for script panels.
- TikTok is the only platform expected to have meaningful early coverage, but the schema remains platform-aware.
