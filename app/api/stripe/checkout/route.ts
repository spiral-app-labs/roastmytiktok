import { requireAuthenticatedUser } from '@/lib/settings-server';
import { getSubscriptionSnapshotForUserId, upsertStripeEntitlement } from '@/lib/entitlements';
import { createCheckoutSession, createStripeCustomer, getStripeCheckoutPriceId } from '@/lib/stripe';

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const subscription = await getSubscriptionSnapshotForUserId(auth.user.id);

    if (subscription.isSubscribed && subscription.stripeCustomerId) {
      return Response.json(
        { error: 'This account already has active paid access.', redirectTo: '/settings' },
        { status: 409 }
      );
    }

    const customerId =
      subscription.stripeCustomerId
      ?? await createStripeCustomer({
        email: auth.user.email,
        userId: auth.user.id,
      });

    const origin = new URL(request.url).origin;
    const priceId = getStripeCheckoutPriceId();
    const checkout = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${origin}/settings?checkout=success`,
      cancelUrl: `${origin}/pricing?checkout=cancelled`,
      userId: auth.user.id,
    });

    await upsertStripeEntitlement({
      userId: auth.user.id,
      plan: 'pro',
      status: subscription.status ?? 'checkout_created',
      stripeCustomerId: customerId,
      checkoutSessionId: checkout.sessionId,
      metadata: {
        checkout_state: 'created',
      },
    });

    return Response.json({ url: checkout.checkoutUrl });
  } catch (error) {
    console.error('[stripe/checkout] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
