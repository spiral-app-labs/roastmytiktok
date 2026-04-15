import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server.js';
import type { UsagePlan } from '@/lib/rate-limit';

export type AiProtectedEndpoint =
  | 'generate_script'
  | 'improve_script'
  | 'niche_analyze';

interface AiEndpointRateLimit {
  maxRequests: number;
  windowSeconds: number;
}

interface AiEndpointAccess {
  plan: UsagePlan;
  user: User;
}

const DAY_IN_SECONDS = 24 * 60 * 60;

const AI_ENDPOINT_RATE_LIMITS: Record<AiProtectedEndpoint, Record<UsagePlan, AiEndpointRateLimit>> = {
  generate_script: {
    free: { maxRequests: 12, windowSeconds: DAY_IN_SECONDS },
    paid: { maxRequests: 150, windowSeconds: DAY_IN_SECONDS },
  },
  improve_script: {
    free: { maxRequests: 12, windowSeconds: DAY_IN_SECONDS },
    paid: { maxRequests: 150, windowSeconds: DAY_IN_SECONDS },
  },
  niche_analyze: {
    free: { maxRequests: 3, windowSeconds: DAY_IN_SECONDS },
    paid: { maxRequests: 25, windowSeconds: DAY_IN_SECONDS },
  },
};

export function getAiEndpointRateLimit(endpoint: AiProtectedEndpoint, plan: UsagePlan): AiEndpointRateLimit {
  return AI_ENDPOINT_RATE_LIMITS[endpoint][plan];
}

function buildRateLimitExceededResponse(
  endpoint: AiProtectedEndpoint,
  plan: UsagePlan,
  retryAfterSeconds: number | null
) {
  const limit = getAiEndpointRateLimit(endpoint, plan);
  const retryAfter = retryAfterSeconds && retryAfterSeconds > 0 ? retryAfterSeconds : undefined;

  return NextResponse.json(
    {
      error: 'Rate limit reached for this feature. Try again later or upgrade for a higher limit.',
      upgradeUrl: '/pricing',
      limit: {
        endpoint,
        maxRequests: limit.maxRequests,
        plan,
        windowSeconds: limit.windowSeconds,
      },
      retryAfterSeconds: retryAfter ?? null,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter ?? 60),
        'X-RateLimit-Limit': String(limit.maxRequests),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

async function consumeAiRateLimitSlot(access: AiEndpointAccess, endpoint: AiProtectedEndpoint) {
  const limit = getAiEndpointRateLimit(endpoint, access.plan);
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase.rpc('consume_rmt_ai_rate_limit_slot', {
    p_endpoint: endpoint,
    p_max_events: limit.maxRequests,
    p_plan: access.plan,
    p_user_id: access.user.id,
    p_window_seconds: limit.windowSeconds,
  });

  if (error) {
    throw new Error(error.message);
  }

  const outcome = Array.isArray(data) ? data[0] : data;
  if (!outcome?.allowed) {
    return buildRateLimitExceededResponse(endpoint, access.plan, outcome?.retry_after_seconds ?? null);
  }

  return null;
}

export async function requireAuthenticatedAiAccess(endpoint: AiProtectedEndpoint) {
  const [{ requireAuthenticatedUser }, { getSubscriptionSnapshotForUserId }] = await Promise.all([
    import('@/lib/settings-server'),
    import('@/lib/entitlements'),
  ]);
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) {
    return { error: auth.error } as const;
  }

  const subscription = await getSubscriptionSnapshotForUserId(auth.user.id);
  const plan: UsagePlan = subscription.isSubscribed ? 'paid' : 'free';

  try {
    const rateLimitError = await consumeAiRateLimitSlot({ plan, user: auth.user }, endpoint);
    if (rateLimitError) {
      return { error: rateLimitError } as const;
    }
  } catch (error) {
    console.error(`[ai-access] Failed to enforce limit for ${endpoint}:`, error);
    return {
      error: Response.json({ error: 'Failed to validate feature usage' }, { status: 500 }),
    } as const;
  }

  return {
    plan,
    user: auth.user,
  } as const;
}
