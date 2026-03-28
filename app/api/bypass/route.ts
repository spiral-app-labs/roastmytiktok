import { NextRequest, NextResponse } from 'next/server';
import { BYPASS_COOKIE_NAME } from '@/lib/bypass';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent}`;
}

function consumeAttempt(key: string) {
  const now = Date.now();

  for (const [entryKey, entry] of attempts) {
    if (entry.resetAt <= now) {
      attempts.delete(entryKey);
    }
  }

  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: MAX_ATTEMPTS - 1, retryAfter: WINDOW_MS };
  }

  if (current.count >= MAX_ATTEMPTS) {
    return { limited: true, remaining: 0, retryAfter: current.resetAt - now };
  }

  current.count += 1;
  attempts.set(key, current);
  return {
    limited: false,
    remaining: Math.max(0, MAX_ATTEMPTS - current.count),
    retryAfter: current.resetAt - now,
  };
}

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);
  const rateLimit = consumeAttempt(clientKey);
  if (rateLimit.limited) {
    return NextResponse.json(
      {
        error: 'Too many password attempts. Please wait a few minutes and try again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfter / 1000)),
        },
      },
    );
  }

  const { password } = await req.json();

  if (password !== process.env.BYPASS_PASSWORD) {
    return NextResponse.json(
      { error: 'Invalid password', remainingAttempts: rateLimit.remaining },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(BYPASS_COOKIE_NAME, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
  res.cookies.set('rmt_paid_bypass', '1', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  attempts.delete(clientKey);

  return res;
}
