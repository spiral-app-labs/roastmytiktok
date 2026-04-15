import { NextRequest } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import {
  consumeScrapeTriggerRateLimit,
  getScrapeTriggerClientIp,
  getScrapeTriggerRateLimitKey,
  resolveScrapeTriggerOperator,
} from '@/lib/admin-scrape-trigger';
import { requireAuthenticatedUser } from '@/lib/settings-server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

const { url, anonKey } = getSupabasePublicEnv();

export async function POST(request: NextRequest) {
  try {
    let adminUserEmail: string | null = null;
    const auth = await requireAuthenticatedUser();
    if (!('error' in auth) && isAdminUser(auth.user)) {
      adminUserEmail = auth.user.email ?? null;
    }

    const operator = resolveScrapeTriggerOperator({
      headers: request.headers,
      adminUserEmail,
    });
    const clientIp = getScrapeTriggerClientIp(request.headers);

    if (!operator) {
      console.warn('[scrape-trends] Unauthorized trigger rejected', {
        clientIp,
        hasAuthHeader: !!request.headers.get('authorization'),
      });
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const rateLimit = consumeScrapeTriggerRateLimit(
      getScrapeTriggerRateLimitKey(request.headers, operator),
    );
    if (rateLimit.limited) {
      console.warn('[scrape-trends] Trigger rate limited', {
        clientIp,
        operatorId: operator.id,
        operatorType: operator.type,
      });
      return Response.json(
        { error: 'Too many scrape trigger attempts. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          },
        },
      );
    }

    console.info('[scrape-trends] Trigger authorized', {
      clientIp,
      operatorId: operator.id,
      operatorType: operator.type,
      remaining: rateLimit.remaining,
    });

    const functionUrl = `${url}/functions/v1/tiktok-trend-scraper`;

    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
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

    console.info('[scrape-trends] Trigger completed', {
      clientIp,
      operatorId: operator.id,
      operatorType: operator.type,
      status: resp.status,
    });

    return Response.json(data, { status: resp.status });
  } catch (err) {
    console.error('[scrape-trends] Error invoking edge function:', err);
    return Response.json(
      { error: 'Failed to invoke trend scraper', detail: String(err) },
      { status: 500 },
    );
  }
}
