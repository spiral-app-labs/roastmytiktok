import type { User } from '@supabase/supabase-js';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
]);

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readMetadata(user: User): Record<string, unknown> {
  return (user.user_metadata ?? {}) as Record<string, unknown>;
}

export interface SubscriptionSnapshot {
  stripeCustomerId: string | null;
  status: string | null;
  isSubscribed: boolean;
  planLabel: string;
  renewalDate: string | null;
}

export function getSubscriptionSnapshot(user: User): SubscriptionSnapshot {
  const metadata = readMetadata(user);
  const status = readString(metadata.subscription_status) ?? readString(metadata.stripe_subscription_status);
  const stripeCustomerId = readString(metadata.stripe_customer_id) ?? readString(metadata.billing_customer_id);
  const planLabel =
    readString(metadata.subscription_plan_name) ??
    readString(metadata.subscription_plan) ??
    readString(metadata.plan_name) ??
    (status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? 'Pro' : 'Free');
  const renewalDate =
    readString(metadata.subscription_current_period_end) ??
    readString(metadata.current_period_end) ??
    readString(metadata.renewal_date);

  return {
    stripeCustomerId,
    status,
    isSubscribed: Boolean(stripeCustomerId && status && ACTIVE_SUBSCRIPTION_STATUSES.has(status)),
    planLabel,
    renewalDate,
  };
}

export function buildAccountExport(user: User, options: {
  roastSessions: Array<Record<string, unknown>>;
  nicheProfile: Record<string, unknown> | null;
  nichePatterns: Array<Record<string, unknown>>;
}) {
  const metadata = readMetadata(user);
  const subscription = getSubscriptionSnapshot(user);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      debugLevel: readString(metadata.debug_level),
      nicheCategory: readString(metadata.niche_category),
      inspirationCreators: readArray(metadata.inspiration_creators),
      subscription: {
        plan: subscription.planLabel,
        status: subscription.status,
        renewalDate: subscription.renewalDate,
      },
    },
    roastSessions: options.roastSessions,
    nicheProfile: options.nicheProfile,
    nichePatterns: options.nichePatterns,
  };
}
