import { NextRequest } from 'next/server';
import { getSubscriptionSnapshot } from '@/lib/settings';
import { requireAuthenticatedUser } from '@/lib/settings-server';

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const subscription = getSubscriptionSnapshot(auth.user);
    if (!subscription.isSubscribed || !subscription.stripeCustomerId) {
      return Response.json(
        { error: 'No active subscription is attached to this account.' },
        { status: 409 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return Response.json(
        { error: 'Stripe billing is not configured on this deployment.' },
        { status: 503 }
      );
    }

    const origin = request.nextUrl.origin;
    const form = new URLSearchParams({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/settings`,
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await stripeResponse.json().catch(() => null) as { error?: { message?: string }; url?: string } | null;
    if (!stripeResponse.ok || !data?.url) {
      return Response.json(
        { error: data?.error?.message ?? 'Failed to open the billing portal.' },
        { status: 502 }
      );
    }

    return Response.json({ url: data.url });
  } catch (error) {
    console.error('[settings/billing-portal] Error:', error);
    return Response.json({ error: 'Failed to open the billing portal' }, { status: 500 });
  }
}
