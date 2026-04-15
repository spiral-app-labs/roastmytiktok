import crypto from 'node:crypto';

const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2026-02-25.clover';
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

interface StripeListPrice {
  id?: string;
  product?: string | { id?: string };
}

interface StripeSubscriptionItem {
  price?: StripeListPrice;
}

interface StripeSubscriptionResponse {
  id?: string;
  status?: string;
  customer?: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, unknown>;
  items?: {
    data?: StripeSubscriptionItem[];
  };
}

interface StripeCheckoutSessionResponse {
  id?: string;
  url?: string;
  customer?: string;
  subscription?: string;
  metadata?: Record<string, unknown>;
  client_reference_id?: string | null;
  mode?: string;
}

interface StripePortalSessionResponse {
  url?: string;
}

export interface StripeWebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  data: {
    object: T;
  };
}

export interface StripeSubscriptionDetails {
  subscriptionId: string;
  status: string | null;
  customerId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  productId: string | null;
  userId: string | null;
}

function getStripeSecretKey(): string {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) {
    throw new Error('Stripe billing is not configured on this deployment.');
  }

  return value;
}

export function getStripeCheckoutPriceId(): string {
  const value = process.env.STRIPE_PRICE_ID?.trim();
  if (!value) {
    throw new Error('Stripe checkout is missing STRIPE_PRICE_ID.');
  }

  return value;
}

function getStripeWebhookSecret(): string {
  const value = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!value) {
    throw new Error('Stripe webhook is missing STRIPE_WEBHOOK_SECRET.');
  }

  return value;
}

function toUrlEncodedForm(params: Record<string, string | number | boolean | null | undefined>): string {
  const form = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }

    form.append(key, String(value));
  }

  return form.toString();
}

async function stripeFormPost<T>(path: string, params: Record<string, string | number | boolean | null | undefined>): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_API_VERSION,
    },
    body: toUrlEncodedForm(params),
  });

  const data = await response.json().catch(() => null) as { error?: { message?: string } } & T | null;

  if (!response.ok || !data) {
    throw new Error(data?.error?.message ?? `Stripe request failed for ${path}`);
  }

  return data;
}

async function stripeGet<T>(path: string): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Stripe-Version': STRIPE_API_VERSION,
    },
  });

  const data = await response.json().catch(() => null) as { error?: { message?: string } } & T | null;

  if (!response.ok || !data) {
    throw new Error(data?.error?.message ?? `Stripe request failed for ${path}`);
  }

  return data;
}

export async function createStripeCustomer(input: {
  email: string | null | undefined;
  userId: string;
}): Promise<string> {
  const customer = await stripeFormPost<{ id: string }>('/customers', {
    email: input.email ?? undefined,
    'metadata[supabase_user_id]': input.userId,
  });

  return customer.id;
}

export async function createCheckoutSession(input: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const session = await stripeFormPost<StripeCheckoutSessionResponse>('/checkout/sessions', {
    mode: 'subscription',
    customer: input.customerId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.userId,
    allow_promotion_codes: true,
    'line_items[0][price]': input.priceId,
    'line_items[0][quantity]': 1,
    'metadata[supabase_user_id]': input.userId,
    'subscription_data[metadata][supabase_user_id]': input.userId,
  });

  if (!session.url || !session.id) {
    throw new Error('Stripe checkout did not return a session URL.');
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

export async function createBillingPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await stripeFormPost<StripePortalSessionResponse>('/billing_portal/sessions', {
    customer: input.customerId,
    return_url: input.returnUrl,
  });

  if (!session.url) {
    throw new Error('Stripe billing portal did not return a URL.');
  }

  return session.url;
}

function readProductId(price: StripeListPrice | undefined): string | null {
  if (!price?.product) {
    return null;
  }

  if (typeof price.product === 'string') {
    return price.product;
  }

  return price.product.id ?? null;
}

function unixToIso(value: number | undefined): string | null {
  return typeof value === 'number' ? new Date(value * 1000).toISOString() : null;
}

export function extractSubscriptionDetails(subscription: StripeSubscriptionResponse): StripeSubscriptionDetails {
  const firstItem = subscription.items?.data?.[0];

  return {
    subscriptionId: subscription.id ?? '',
    status: subscription.status ?? null,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
    currentPeriodStart: unixToIso(subscription.current_period_start),
    currentPeriodEnd: unixToIso(subscription.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    priceId: firstItem?.price?.id ?? null,
    productId: readProductId(firstItem?.price),
    userId:
      typeof subscription.metadata?.supabase_user_id === 'string'
        ? subscription.metadata.supabase_user_id
        : null,
  };
}

export async function fetchStripeSubscription(subscriptionId: string): Promise<StripeSubscriptionDetails> {
  const subscription = await stripeGet<StripeSubscriptionResponse>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price.product`
  );

  return extractSubscriptionDetails(subscription);
}

function secureCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const timestampPart = signatureHeader
    .split(',')
    .find((part) => part.startsWith('t='));
  const signatures = signatureHeader
    .split(',')
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));

  if (!timestampPart || signatures.length === 0) {
    return false;
  }

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (Math.abs(nowSeconds - timestamp) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', getStripeWebhookSecret())
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');

  return signatures.some((candidate) => secureCompare(candidate, expected));
}
