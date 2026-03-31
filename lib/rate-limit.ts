import { NextRequest, NextResponse } from 'next/server';

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
      { error: 'Rate limit exceeded. Please try again later.' },
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
 * Check if a request has a paid bypass cookie (indicating paid user).
 */
export function isPaidUser(req: NextRequest): boolean {
  return req.cookies.get('rmt_paid_bypass')?.value === '1';
}
