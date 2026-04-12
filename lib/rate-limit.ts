import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Map<string, RateLimitEntry>>();

function getBucket(name: string) {
  let bucket = buckets.get(name);
  if (!bucket) {
    bucket = new Map();
    buckets.set(name, bucket);
  }
  return bucket;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

interface RateLimitOptions {
  /** Unique name for this limiter bucket */
  name: string;
  /** Max requests in the window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429 Response if limited.
 */
export function checkRateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
  const bucket = getBucket(opts.name);
  const ip = getClientIp(req);
  const now = Date.now();

  // Cleanup expired entries periodically
  if (bucket.size > 500) {
    for (const [key, entry] of bucket) {
      if (entry.resetAt <= now) bucket.delete(key);
    }
  }

  const current = bucket.get(ip);

  if (!current || current.resetAt <= now) {
    bucket.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (current.count >= opts.max) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: 'Free limit reached. You\'ve used your 3 free roasts today.',
        upgradeUrl: '/pricing',
        retryAfterSeconds: retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(opts.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(current.resetAt),
        },
      },
    );
  }

  current.count += 1;
  bucket.set(ip, current);
  return null;
}

/**
 * Check Supabase user_entitlements table to determine if the authenticated
 * user has a paid plan. Falls back to false on any error so gating is
 * always conservative.
 */
export async function isPaidUser(req: NextRequest): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabaseServer
      .from('user_entitlements')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return false;
    return ['paid', 'monthly', 'yearly'].includes(data.plan);
  } catch (err) {
    console.warn('[rate-limit] isPaidUser check failed, defaulting to free:', err);
    void req;
    return false;
  }
}
