import { getSubscriptionSnapshotForUserId } from '@/lib/entitlements';
import { requireAuthenticatedUser } from '@/lib/settings-server';
import { createBillingPortalSession } from '@/lib/stripe';

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const subscription = await getSubscriptionSnapshotForUserId(auth.user.id);
    if (!subscription.isSubscribed || !subscription.stripeCustomerId) {
      return Response.json(
        { error: 'No active subscription is attached to this account.' },
        { status: 409 }
      );
    }

    const origin = new URL(request.url).origin;
    const url = await createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${origin}/settings`,
    });

    return Response.json({ url });
  } catch (error) {
    console.error('[settings/billing-portal] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to open the billing portal' },
      { status: 500 }
    );
  }
}
