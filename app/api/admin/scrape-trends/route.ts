import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import {
  clearAdminTriggerRateLimit,
  consumeAdminTriggerRateLimit,
  getAdminTriggerClientIp,
  getAdminTriggerRateLimitKey,
  resolveAdminScrapeTriggerOperator,
} from '@/lib/admin-trigger-security';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseServiceEnv } from '@/lib/supabase/env';

async function authorizeAdminScrapeTrigger(req: NextRequest) {
  const secretOperator = resolveAdminScrapeTriggerOperator({
    headers: req.headers,
  });
  if (secretOperator) {
    return {
      authorized: true as const,
      operator: secretOperator,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    const operator = resolveAdminScrapeTriggerOperator({
      headers: req.headers,
      adminUserEmail: !error && isAdminUser(user) ? user.email ?? null : null,
    });

    if (!operator) {
      return {
        authorized: false as const,
        operator: null,
      };
    }

    return {
      authorized: true as const,
      operator,
    };
  } catch (error) {
    console.error('[scrape-trends] Failed to verify admin auth:', error);
    return {
      authorized: false as const,
      operator: null,
    };
  }
}

function logScrapeTrigger(event: string, details: Record<string, unknown>) {
  console.info('[scrape-trends]', {
    event,
    ...details,
  });
}

export async function POST(req: NextRequest) {
  const clientIp = getAdminTriggerClientIp(req.headers);
  const auth = await authorizeAdminScrapeTrigger(req);

  if (!auth.authorized) {
    logScrapeTrigger('unauthorized', {
      clientIp,
      hasAuthorizationHeader: !!req.headers.get('authorization'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitKey = getAdminTriggerRateLimitKey(req.headers, auth.operator);
  const rateLimit = consumeAdminTriggerRateLimit(rateLimitKey);
  if (rateLimit.limited) {
    logScrapeTrigger('rate_limited', {
      clientIp,
      operatorId: auth.operator.id,
      operatorType: auth.operator.type,
      retryAfterMs: rateLimit.retryAfterMs,
    });
    return NextResponse.json(
      {
        error: 'Too many scrape trigger requests. Please wait and try again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      },
    );
  }

  logScrapeTrigger('invoked', {
    clientIp,
    operatorId: auth.operator.id,
    operatorType: auth.operator.type,
    remaining: rateLimit.remaining,
  });

  try {
    const { url, serviceRoleKey } = getSupabaseServiceEnv();
    const functionUrl = `${url}/functions/v1/tiktok-trend-scraper`;
    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    const responseText = await resp.text();
    let data: unknown = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { detail: responseText };
      }
    }

    if (!resp.ok) {
      console.error('[scrape-trends] Edge function returned error:', {
        status: resp.status,
        data,
      });
    }

    logScrapeTrigger('completed', {
      clientIp,
      operatorId: auth.operator.id,
      operatorType: auth.operator.type,
      status: resp.status,
    });

    return NextResponse.json(data, {
      status: resp.ok ? 200 : resp.status,
      headers: {
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (err) {
    clearAdminTriggerRateLimit(rateLimitKey);
    console.error('[scrape-trends] Error invoking edge function:', err);
    return NextResponse.json(
      { error: 'Failed to invoke trend scraper', detail: String(err) },
      { status: 500 },
    );
  }
}
