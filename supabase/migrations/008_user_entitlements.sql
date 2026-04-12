-- Migration: 008_user_entitlements
-- Creates the user_entitlements table that stores Stripe-backed plan state.
-- Run this against your Supabase project before enabling Stripe webhooks.

create table if not exists public.user_entitlements (
  user_id               uuid        primary key references auth.users(id) on delete cascade,
  plan                  text        not null default 'free',
  stripe_customer_id    text,
  stripe_subscription_id text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Index for webhook lookups by customer id
create index if not exists user_entitlements_stripe_customer_id_idx
  on public.user_entitlements (stripe_customer_id);

-- RLS: only the owning user can read their own entitlement row.
-- Server-side code uses the service role key, which bypasses RLS.
alter table public.user_entitlements enable row level security;

create policy "Users can read own entitlement"
  on public.user_entitlements
  for select
  using (auth.uid() = user_id);
