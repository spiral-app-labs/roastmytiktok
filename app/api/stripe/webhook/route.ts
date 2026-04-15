import { getUserIdForStripeCustomer, recordProcessedStripeEvent, upsertStripeEntitlement } from '@/lib/entitlements';
import {
  extractSubscriptionDetails,
  fetchStripeSubscription,
  verifyStripeWebhookSignature,
  type StripeWebhookEvent,
} from '@/lib/stripe';

export const runtime = 'nodejs';

interface StripeCheckoutSessionObject {
  id?: string;
  customer?: string;
  subscription?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, unknown>;
  mode?: string;
}

interface StripeSubscriptionObject {
  id?: string;
  status?: string;
  customer?: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, unknown>;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
        product?: string | { id?: string };
      };
    }>;
  };
}

function readUserId(input: {
  userIdHint?: string | null;
  metadata?: Record<string, unknown>;
  clientReferenceId?: string | null;
}): string | null {
  if (input.userIdHint) {
    return input.userIdHint;
  }

  const metadataUserId = input.metadata?.supabase_user_id;
  if (typeof metadataUserId === 'string' && metadataUserId.trim().length > 0) {
    return metadataUserId;
  }

  if (typeof input.clientReferenceId === 'string' && input.clientReferenceId.trim().length > 0) {
    return input.clientReferenceId;
  }

  return null;
}

async function syncSubscriptionEntitlement(input: {
  subscription: StripeSubscriptionObject;
  userIdHint?: string | null;
  checkoutSessionId?: string | null;
}) {
  const details = extractSubscriptionDetails(input.subscription);
  const userId =
    readUserId({
      userIdHint: input.userIdHint,
      metadata: input.subscription.metadata,
    })
    ?? (details.customerId ? await getUserIdForStripeCustomer(details.customerId) : null);

  if (!userId) {
    throw new Error('Unable to map Stripe subscription to a Supabase user.');
  }

  await upsertStripeEntitlement({
    userId,
    plan: 'pro',
    status: details.status ?? 'inactive',
    stripeCustomerId: details.customerId,
    stripeSubscriptionId: details.subscriptionId,
    stripePriceId: details.priceId,
    stripeProductId: details.productId,
    checkoutSessionId: input.checkoutSessionId ?? null,
    currentPeriodStart: details.currentPeriodStart,
    currentPeriodEnd: details.currentPeriodEnd,
    cancelAtPeriodEnd: details.cancelAtPeriodEnd,
    metadata: {
      source: 'stripe_webhook',
    },
  });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');

  if (!signatureHeader || !verifyStripeWebhookSignature(payload, signatureHeader)) {
    return Response.json({ error: 'Invalid Stripe webhook signature' }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeWebhookEvent;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCheckoutSessionObject;
        if (session.mode !== 'subscription' || typeof session.subscription !== 'string') {
          break;
        }

        const subscription = await fetchStripeSubscription(session.subscription);
        const userId = readUserId({
          metadata: session.metadata,
          clientReferenceId: session.client_reference_id,
          userIdHint: subscription.userId,
        });

        if (!userId) {
          throw new Error('Unable to map Stripe checkout session to a Supabase user.');
        }

        await upsertStripeEntitlement({
          userId,
          plan: 'pro',
          status: subscription.status ?? 'inactive',
          stripeCustomerId: subscription.customerId,
          stripeSubscriptionId: subscription.subscriptionId,
          stripePriceId: subscription.priceId,
          stripeProductId: subscription.productId,
          checkoutSessionId: session.id ?? null,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          metadata: {
            source: 'stripe_checkout_completed',
          },
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscriptionEntitlement({
          subscription: event.data.object as StripeSubscriptionObject,
        });
        break;
      }

      default:
        break;
    }

    const recorded = await recordProcessedStripeEvent(event.id, event.type);
    if (!recorded) {
      return Response.json({ received: true, duplicate: true });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripe/webhook] Error:', error);
    return Response.json({ error: 'Failed to process Stripe webhook' }, { status: 500 });
  }
}
