create table if not exists rmt_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'pro',
  entitlement_status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  stripe_product_id text,
  checkout_session_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists rmt_stripe_webhook_events (
  stripe_event_id text primary key,
  stripe_event_type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

create or replace function set_rmt_entitlements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_rmt_entitlements_updated_at on rmt_entitlements;
create trigger trg_rmt_entitlements_updated_at
before update on rmt_entitlements
for each row
execute function set_rmt_entitlements_updated_at();

create index if not exists idx_rmt_entitlements_status
  on rmt_entitlements(entitlement_status);

create index if not exists idx_rmt_entitlements_current_period_end
  on rmt_entitlements(current_period_end desc);

alter table rmt_entitlements enable row level security;

create policy "users_can_read_own_entitlements" on rmt_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
