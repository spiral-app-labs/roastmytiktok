import { createServiceClient } from './supabase/server';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  buildSubscriptionSnapshot,
  type EntitlementRowSnapshot,
  getFreeSubscriptionSnapshot,
  isActiveSubscriptionStatus,
  type SubscriptionSnapshot,
} from './billing-shared';

export {
  ACTIVE_SUBSCRIPTION_STATUSES,
  buildSubscriptionSnapshot,
  getFreeSubscriptionSnapshot,
  isActiveSubscriptionStatus,
};

export interface StripeEntitlementUpsert {
  userId: string;
  plan?: string | null;
  status?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  checkoutSessionId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, unknown>;
}

export async function getSubscriptionSnapshotForUserId(userId: string): Promise<SubscriptionSnapshot> {
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from('rmt_entitlements')
    .select('user_id, plan, entitlement_status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return buildSubscriptionSnapshot((data ?? null) as EntitlementRowSnapshot | null);
}

export async function getUserIdForStripeCustomer(customerId: string): Promise<string | null> {
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from('rmt_entitlements')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? null) as { user_id?: string } | null)?.user_id ?? null;
}

export async function upsertStripeEntitlement(input: StripeEntitlementUpsert): Promise<void> {
  const serviceSupabase = createServiceClient();
  const payload = {
    user_id: input.userId,
    plan: input.plan ?? 'pro',
    entitlement_status: input.status ?? 'inactive',
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    stripe_price_id: input.stripePriceId ?? null,
    stripe_product_id: input.stripeProductId ?? null,
    checkout_session_id: input.checkoutSessionId ?? null,
    current_period_start: input.currentPeriodStart ?? null,
    current_period_end: input.currentPeriodEnd ?? null,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    metadata: input.metadata ?? {},
  };

  const { error } = await serviceSupabase
    .from('rmt_entitlements')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }
}

export async function recordProcessedStripeEvent(eventId: string, eventType: string): Promise<boolean> {
  const serviceSupabase = createServiceClient();
  const { error } = await serviceSupabase
    .from('rmt_stripe_webhook_events')
    .insert({ stripe_event_id: eventId, stripe_event_type: eventType });

  if (!error) {
    return true;
  }

  if (error.code === '23505') {
    return false;
  }

  throw new Error(error.message);
}
