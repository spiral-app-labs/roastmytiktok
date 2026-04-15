import crypto from 'node:crypto';
import net from 'node:net';

export const SCRAPE_TRENDS_SECRET_HEADER = 'x-admin-trigger-secret';
export const SCRAPE_TRENDS_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
} as const;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type ScrapeTriggerOperator =
  | { type: 'admin'; id: string }
  | { type: 'secret'; id: 'shared-secret' };

const triggerAttempts = new Map<string, RateLimitEntry>();

function normalizeIpAddress(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutBrackets = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;
  const ipv4PortMatch = withoutBrackets.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  const candidate = ipv4PortMatch ? ipv4PortMatch[1] : withoutBrackets;

  if (net.isIP(candidate)) {
    return candidate;
  }

  return null;
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getScrapeTrendsSharedSecret(): string | null {
  const value = process.env.ADMIN_SCRAPE_TRENDS_SECRET?.trim();
  return value ? value : null;
}

export function getScrapeTrendsSecretCandidate(headers: Headers): string | null {
  const directHeader = headers.get(SCRAPE_TRENDS_SECRET_HEADER)?.trim();
  if (directHeader) {
    return directHeader;
  }

  const authorization = headers.get('authorization')?.trim();
  if (!authorization) {
    return null;
  }

  const bearerPrefix = 'Bearer ';
  return authorization.startsWith(bearerPrefix)
    ? authorization.slice(bearerPrefix.length).trim() || null
    : null;
}

export function isValidScrapeTrendsSecret(candidate: string | null | undefined): boolean {
  const secret = getScrapeTrendsSharedSecret();
  if (!secret || !candidate) {
    return false;
  }

  return timingSafeEqual(candidate, secret);
}

export function resolveScrapeTriggerOperator(params: {
  headers: Headers;
  adminUserEmail?: string | null;
}): ScrapeTriggerOperator | null {
  if (isValidScrapeTrendsSecret(getScrapeTrendsSecretCandidate(params.headers))) {
    return { type: 'secret', id: 'shared-secret' };
  }

  const adminUserEmail = params.adminUserEmail?.trim().toLowerCase();
  if (adminUserEmail) {
    return { type: 'admin', id: adminUserEmail };
  }

  return null;
}

export function getScrapeTriggerClientIp(headers: Headers): string {
  const headerCandidates = [
    headers.get('x-vercel-forwarded-for'),
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for'),
  ];

  for (const value of headerCandidates) {
    if (!value) continue;

    const normalized = value
      .split(',')
      .map((entry) => normalizeIpAddress(entry))
      .find((entry): entry is string => !!entry);

    if (normalized) {
      return normalized;
    }
  }

  return 'unknown';
}

export function getScrapeTriggerRateLimitKey(
  headers: Headers,
  operator: ScrapeTriggerOperator,
): string {
  return `${operator.type}:${operator.id}:${getScrapeTriggerClientIp(headers)}`;
}

export function consumeScrapeTriggerRateLimit(
  key: string,
  now = Date.now(),
): { limited: boolean; remaining: number; retryAfterMs: number } {
  for (const [entryKey, entry] of triggerAttempts) {
    if (entry.resetAt <= now) {
      triggerAttempts.delete(entryKey);
    }
  }

  const existing = triggerAttempts.get(key);
  if (!existing || existing.resetAt <= now) {
    triggerAttempts.set(key, {
      count: 1,
      resetAt: now + SCRAPE_TRENDS_RATE_LIMIT.windowMs,
    });

    return {
      limited: false,
      remaining: SCRAPE_TRENDS_RATE_LIMIT.maxRequests - 1,
      retryAfterMs: SCRAPE_TRENDS_RATE_LIMIT.windowMs,
    };
  }

  if (existing.count >= SCRAPE_TRENDS_RATE_LIMIT.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  triggerAttempts.set(key, existing);

  return {
    limited: false,
    remaining: Math.max(0, SCRAPE_TRENDS_RATE_LIMIT.maxRequests - existing.count),
    retryAfterMs: existing.resetAt - now,
  };
}

export function resetScrapeTriggerRateLimitStore(): void {
  triggerAttempts.clear();
}
