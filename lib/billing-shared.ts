export const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
]);

export interface SubscriptionSnapshot {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string | null;
  isSubscribed: boolean;
  plan: 'free' | 'paid';
  planLabel: string;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
}

export interface EntitlementRowSnapshot {
  user_id: string;
  plan: string | null;
  entitlement_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return typeof status === 'string' && ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

export function getFreeSubscriptionSnapshot(): SubscriptionSnapshot {
  return {
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    status: null,
    isSubscribed: false,
    plan: 'free',
    planLabel: 'Free',
    renewalDate: null,
    cancelAtPeriodEnd: false,
    priceId: null,
  };
}

export function buildSubscriptionSnapshot(row: EntitlementRowSnapshot | null): SubscriptionSnapshot {
  if (!row) {
    return getFreeSubscriptionSnapshot();
  }

  const status = row.entitlement_status?.trim() || null;
  const isSubscribed = isActiveSubscriptionStatus(status);

  return {
    stripeCustomerId: row.stripe_customer_id?.trim() || null,
    stripeSubscriptionId: row.stripe_subscription_id?.trim() || null,
    status,
    isSubscribed,
    plan: isSubscribed ? 'paid' : 'free',
    planLabel: isSubscribed ? 'Pro' : 'Free',
    renewalDate: row.current_period_end?.trim() || null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    priceId: row.stripe_price_id?.trim() || null,
  };
}
