# Watchlists And In-App Digests

## Summary

Go Viral needs recurring value, not just one-off roasts. This PRD defines a solo-creator-first watchlist system and in-app weekly digests powered by the same trend and hook-evidence data layer.

The product should help a creator:

- track competitors and inspiration creators
- watch niche tags and topics
- receive structured weekly guidance inside the app
- avoid low-signal noise by suppressing weak digests

v1 is in-app only. Email and team workflows are out of scope.

## Goals

### Product goals

- Turn trend and hook data into recurring creator value.
- Give users a reason to return weekly even when they are not actively roasting a draft.
- Convert raw monitoring into action-oriented summaries.
- Reuse the hook corpus and trend systems instead of building a separate research product.

### Success criteria

- A user can create, edit, and view a watchlist without leaving the app.
- Daily refresh jobs create structured events tied to watchlist items.
- Weekly digests summarize the last 7 days of useful events and show concrete actions.
- Low-signal watchlists suppress useless digests instead of sending filler.

### Non-goals for v1

- Email delivery
- Team sharing and roles
- Slack or external notification delivery
- Full competitor intelligence across hiring, websites, or paid ads

## Current state and starting points

Relevant existing pieces:

- `app/api/trending/route.ts` exposes trend data.
- `app/api/crons/trending/route.ts` already models refreshable trend ingestion, though it currently uses sample data.
- `supabase/003_trending_content.sql` and `supabase/007_trending_system.sql` define trend and viral tip tables.
- PRD 1 introduces the hook-evidence corpus that this feature will consume.

Current gaps:

- no watchlist schema
- no watchlist event store
- no digest generation
- no in-app watchlist UI
- no usefulness suppression logic

## Users and jobs to be done

### Primary user

- solo creator trying to stay ahead of a niche, not an agency operator

### Jobs

- "Track a few creators and topics that matter to me."
- "Show me the hooks and formats I should study this week."
- "Do not waste my time with a digest when there is no signal."

## Shared contracts frozen by this PRD

### Watchlist contract

Watchlists are user-owned objects with item rows and digest rows.

### Event contract

Daily refresh jobs create normalized watchlist events. Weekly digests summarize events, not raw tables.

### Digest contract

Weekly digests are in-app records that can be viewed later. They are not transient notifications.

## Data model

### New table: `rmt_watchlists`

```sql
create table if not exists rmt_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  primary_niche text,
  digest_cadence text not null default 'weekly' check (digest_cadence in ('weekly')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rmt_watchlists_user on rmt_watchlists(user_id);
```

### New table: `rmt_watchlist_items`

```sql
create table if not exists rmt_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references rmt_watchlists(id) on delete cascade,
  item_type text not null check (item_type in ('competitor', 'inspiration_creator', 'niche_tag', 'topic')),
  platform text not null default 'tiktok' check (platform in ('tiktok')),
  value text not null,
  display_label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_rmt_watchlist_items_watchlist on rmt_watchlist_items(watchlist_id);
```

### New table: `rmt_watchlist_events`

```sql
create table if not exists rmt_watchlist_events (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references rmt_watchlists(id) on delete cascade,
  watchlist_item_id uuid references rmt_watchlist_items(id) on delete set null,
  event_type text not null check (event_type in ('hook_to_study', 'competitor_move', 'format_rising', 'topic_spiking', 'repeat_pattern')),
  event_score integer not null check (event_score between 0 and 100),
  event_date date not null,
  title text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_rmt_watchlist_events_watchlist_date on rmt_watchlist_events(watchlist_id, event_date desc);
```

### New table: `rmt_watchlist_digests`

```sql
create table if not exists rmt_watchlist_digests (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references rmt_watchlists(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  usefulness_score integer not null check (usefulness_score between 0 and 100),
  status text not null check (status in ('generated', 'suppressed')),
  suppression_reason text,
  sections jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);
create index if not exists idx_rmt_watchlist_digests_watchlist_period on rmt_watchlist_digests(watchlist_id, period_end desc);
```

## Watchlist UX

### Page structure

Add a new in-app page at `/watchlists`.

The page has three zones:

1. watchlist list
2. selected watchlist detail
3. digest history for the selected watchlist

### Create watchlist flow

User provides:

- watchlist name
- primary niche
- 1 to 10 watchlist items

Item types supported in v1:

- competitor TikTok handle
- inspiration creator TikTok handle
- niche tag
- freeform topic

### Editing behavior

Users can:

- rename watchlist
- add/remove/pause items
- pause the whole watchlist

Users cannot:

- create multiple cadences
- email digests
- share watchlists with others

## Event generation

### Daily refresh job

Runs once daily and creates normalized events from:

- approved hook corpus additions and approvals
- trending content changes
- trending tip changes
- future creator-specific content sources as they become available

### Matching rules

The job evaluates each watchlist item separately.

Examples:

- competitor handle matches corpus rows or trend rows with the same creator handle
- niche tag matches `niche_primary` or trend category
- topic matches normalized keyword overlap against hook text, title, summary, and metadata

### Event score

Event score is out of 100:

- relevance to watchlist item: 40
- novelty vs prior 14 days: 25
- evidence quality: 20
- actionability: 15

Only events with score 60 or higher are persisted.

## Digest generation

### Weekly digest job

Runs once per week for active watchlists and reads the past 7 days of events.

Digest sections:

- `hooks_to_study`
- `competitor_moves`
- `formats_rising`
- `try_this_this_week`

Each section contains up to 3 items.

### Usefulness scoring

Digest usefulness score is based on:

- number of distinct high-scoring events
- number of unique creators/topics represented
- presence of at least one actionable hook or format recommendation
- suppression of repetitive stale events

Formula:

- event volume quality: 35
- diversity: 25
- actionability: 25
- freshness: 15

Suppress digest when:

- usefulness score < 60
- fewer than 3 persisted events exist in the period
- all events map to one repeated low-diversity source

Suppressed digests are still stored with status `suppressed` for diagnostics, but not shown as a new digest card in the user's main watchlist feed.

## Digest output contract

```ts
interface WatchlistDigest {
  id: string;
  watchlistId: string;
  periodStart: string;
  periodEnd: string;
  usefulnessScore: number;
  status: 'generated' | 'suppressed';
  suppressionReason?: string;
  sections: {
    hooksToStudy: DigestItem[];
    competitorMoves: DigestItem[];
    formatsRising: DigestItem[];
    tryThisThisWeek: DigestActionItem[];
  };
}
```

`DigestItem` must include:

- title
- summary
- score
- evidence snippets
- optional source link

`DigestActionItem` must include:

- action
- why now
- supporting evidence references

## Evidence integration

This PRD depends on PRD 1's retrieval contract.

Rules:

- `hooks_to_study` items must be grounded in approved hook examples
- `try_this_this_week` must cite at least one event or hook example
- no digest section may rely solely on synthetic library content when approved evidence exists

Fallback:

- if evidence coverage is weak, digest can still use trend/tip signals
- if both evidence and trend signals are weak, suppress digest

## APIs

### New endpoints

- `GET /api/watchlists`
- `POST /api/watchlists`
- `PATCH /api/watchlists/:id`
- `GET /api/watchlists/:id/digests`
- `GET /api/watchlists/:id/events`

### Endpoint behavior

`GET /api/watchlists`

- returns current user's watchlists and lightweight summary counts

`POST /api/watchlists`

- creates watchlist and initial items

`PATCH /api/watchlists/:id`

- rename, pause, archive, add items, remove items, pause items

`GET /api/watchlists/:id/digests`

- returns digest history newest first

`GET /api/watchlists/:id/events`

- returns recent event feed for debugging and transparency

## UI requirements

### Watchlist list view

Each watchlist card shows:

- name
- primary niche
- active item count
- last digest status
- most recent usefulness score

### Watchlist detail view

Shows:

- tracked items
- recent events
- latest digest
- digest history

### Digest card behavior

A generated digest card shows:

- date range
- usefulness score badge
- top 1 to 2 actions preview

Suppressed digests:

- do not appear in the main digest list by default
- remain visible in admin/debug mode only

### Empty-state behavior

If a watchlist lacks coverage:

- explain whether the issue is too few items, too narrow a niche, or weak source coverage
- suggest adding 2 to 3 more items or widening the niche tag

## Background jobs

### Job 1: daily watchlist refresh

Responsibilities:

- read active watchlists
- match fresh trend and evidence records
- create scored events
- skip duplicate events already created for the same day and source

### Job 2: weekly digest builder

Responsibilities:

- read prior 7 days of events
- compute usefulness score
- generate sections
- persist generated or suppressed digest record

Jobs should be idempotent per watchlist and period.

## Analytics and monitoring

Track:

- `watchlist_created`
- `watchlist_item_added`
- `watchlist_item_paused`
- `watchlist_digest_generated`
- `watchlist_digest_suppressed`
- `watchlist_digest_viewed`
- `watchlist_event_created`

Operational dashboards:

- watchlists per active user
- median usefulness score
- suppression rate
- event creation rate by item type

## Rollout plan

### Phase 1: schema and event pipeline

- build tables and CRUD
- build daily event job
- no public digest UI yet

### Phase 2: internal digest generation

- generate digests internally
- tune usefulness scoring and suppression
- validate action quality

### Phase 3: public in-app rollout

- enable watchlists page
- show digest history and latest digest card
- keep email and external delivery off

## Acceptance criteria

- Watchlists can be created, edited, paused, and read in-app.
- Daily refresh jobs create structured events from trend and corpus signals.
- Weekly digests summarize data when useful and suppress low-signal runs.
- Digests contain actionable sections, not generic summaries.
- Users can inspect the latest digest and prior generated digests inside the product.
- No email delivery is required for v1.

## Parallel agent split

### Agent 1: schema, CRUD, and jobs

Owns:

- watchlist schema
- CRUD endpoints
- event generation and digest generation jobs

Likely touchpoints:

- `supabase/*.sql`
- `app/api/watchlists/*`
- cron/job routes

### Agent 2: digest ranking and summarization

Owns:

- usefulness scoring
- digest section assembly
- evidence integration from PRD 1

Likely touchpoints:

- digest service layer
- evidence retrieval integration

### Agent 3: in-app watchlist and digest UI

Owns:

- `/watchlists` page
- watchlist detail panels
- digest cards and empty states

Likely touchpoints:

- app routes and components
- nav integration

Dependency rule:

- Agent 1 freezes table and API response shapes first.
- Agent 2 builds against event fixtures while jobs stabilize.
- Agent 3 uses mocked digest payloads and should not block on live job scheduling.

## Open implementation defaults

These are frozen for v1:

- solo creators only
- in-app digests only
- weekly cadence only
- TikTok as the only platform surface
- suppressed digests are stored for debugging but hidden from the standard user feed
