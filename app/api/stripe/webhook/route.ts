import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

// Disable body parsing so we can verify the raw Stripe signature
export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id ?? (session.metadata?.user_id as string | undefined);
    if (!userId) {
      console.error('[stripe/webhook] No user_id in session', session.id);
      return NextResponse.json({ error: 'No user_id' }, { status: 400 });
    }

    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const plan = (session.metadata?.plan as string | undefined) ?? 'paid';

    const { error } = await supabaseServer
      .from('user_entitlements')
      .upsert(
        {
          user_id: userId,
          plan,
          stripe_customer_id: stripeCustomerId ?? null,
          stripe_subscription_id: stripeSubscriptionId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      console.error('[stripe/webhook] Failed to upsert entitlement:', error.message);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    console.log(`[stripe/webhook] Entitlement upserted for user ${userId}, plan=${plan}`);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

    if (customerId) {
      await supabaseServer
        .from('user_entitlements')
        .update({ plan: 'free', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId);
    }
  }

  return NextResponse.json({ received: true });
}
