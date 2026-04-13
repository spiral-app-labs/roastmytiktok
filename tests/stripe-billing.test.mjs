import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

const {
  buildSubscriptionSnapshot,
  getFreeSubscriptionSnapshot,
  isActiveSubscriptionStatus,
} = await import('../lib/billing-shared.ts');
const {
  extractSubscriptionDetails,
  verifyStripeWebhookSignature,
} = await import('../lib/stripe.ts');

test('active Stripe statuses map to paid access', () => {
  assert.equal(isActiveSubscriptionStatus('active'), true);
  assert.equal(isActiveSubscriptionStatus('trialing'), true);
  assert.equal(isActiveSubscriptionStatus('canceled'), false);

  const free = getFreeSubscriptionSnapshot();
  assert.equal(free.plan, 'free');
  assert.equal(free.isSubscribed, false);

  const paid = buildSubscriptionSnapshot({
    user_id: 'user_123',
    plan: 'pro',
    entitlement_status: 'active',
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    stripe_price_id: 'price_123',
    current_period_end: '2026-04-30T00:00:00.000Z',
    cancel_at_period_end: false,
  });

  assert.equal(paid.plan, 'paid');
  assert.equal(paid.planLabel, 'Pro');
  assert.equal(paid.isSubscribed, true);
  assert.equal(paid.stripeCustomerId, 'cus_123');
});

test('Stripe subscription payloads are normalized into entitlement details', () => {
  const details = extractSubscriptionDetails({
    id: 'sub_123',
    status: 'active',
    customer: 'cus_123',
    current_period_start: 1_776_988_800,
    current_period_end: 1_779_580_800,
    cancel_at_period_end: true,
    metadata: { supabase_user_id: 'user_123' },
    items: {
      data: [
        {
          price: {
            id: 'price_123',
            product: { id: 'prod_123' },
          },
        },
      ],
    },
  });

  assert.equal(details.subscriptionId, 'sub_123');
  assert.equal(details.customerId, 'cus_123');
  assert.equal(details.priceId, 'price_123');
  assert.equal(details.productId, 'prod_123');
  assert.equal(details.userId, 'user_123');
  assert.equal(details.cancelAtPeriodEnd, true);
});

test('Stripe webhook signatures are verified with timestamp tolerance', () => {
  const payload = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed' });
  const timestamp = 1_776_988_800;
  const signature = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');

  assert.equal(
    verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`, timestamp + 60),
    true,
  );
  assert.equal(
    verifyStripeWebhookSignature(payload, `t=${timestamp},v1=bad`, timestamp + 60),
    false,
  );
  assert.equal(
    verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`, timestamp + 600),
    false,
  );
});
