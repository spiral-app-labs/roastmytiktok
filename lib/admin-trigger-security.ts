import crypto from 'node:crypto';
import net from 'node:net';

export const ADMIN_SCRAPE_TRENDS_SECRET_HEADER = 'x-admin-trigger-secret';
export const ADMIN_SCRAPE_TRENDS_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
} as const;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type AdminScrapeTriggerOperator =
  | { type: 'admin'; id: string }
  | { type: 'secret'; id: 'shared-secret' };

const attempts = new Map<string, RateLimitEntry>();

function normalizeIpAddress(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutBrackets = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;
  const ipv4PortMatch = withoutBrackets.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  const candidate = ipv4PortMatch ? ipv4PortMatch[1] : withoutBrackets;

  return net.isIP(candidate) ? candidate : null;
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminTriggerSharedSecretCandidate(headers: Headers): string | null {
  const directHeader = headers.get(ADMIN_SCRAPE_TRENDS_SECRET_HEADER)?.trim();
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

export function isValidAdminTriggerSharedSecret(candidate: string | null | undefined): boolean {
  const configured = process.env.ADMIN_SCRAPE_TRENDS_SECRET?.trim();
  if (!configured || !candidate) {
    return false;
  }

  return timingSafeEqual(candidate, configured);
}

export function resolveAdminScrapeTriggerOperator(params: {
  headers: Headers;
  adminUserEmail?: string | null;
}): AdminScrapeTriggerOperator | null {
  if (isValidAdminTriggerSharedSecret(getAdminTriggerSharedSecretCandidate(params.headers))) {
    return { type: 'secret', id: 'shared-secret' };
  }

  const adminUserEmail = params.adminUserEmail?.trim().toLowerCase();
  if (adminUserEmail) {
    return { type: 'admin', id: adminUserEmail };
  }

  return null;
}

export function getAdminTriggerClientIp(headers: Headers): string {
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

export function getAdminTriggerRateLimitKey(
  headers: Headers,
  operator: AdminScrapeTriggerOperator,
): string {
  return `${operator.type}:${operator.id}:${getAdminTriggerClientIp(headers)}`;
}

export function consumeAdminTriggerRateLimit(
  key: string,
  now = Date.now(),
): { limited: boolean; remaining: number; retryAfterMs: number; limit: number } {
  for (const [entryKey, entry] of attempts) {
    if (entry.resetAt <= now) {
      attempts.delete(entryKey);
    }
  }

  const existing = attempts.get(key);
  if (!existing || existing.resetAt <= now) {
    attempts.set(key, {
      count: 1,
      resetAt: now + ADMIN_SCRAPE_TRENDS_RATE_LIMIT.windowMs,
    });

    return {
      limited: false,
      remaining: ADMIN_SCRAPE_TRENDS_RATE_LIMIT.maxRequests - 1,
      retryAfterMs: ADMIN_SCRAPE_TRENDS_RATE_LIMIT.windowMs,
      limit: ADMIN_SCRAPE_TRENDS_RATE_LIMIT.maxRequests,
    };
  }

  if (existing.count >= ADMIN_SCRAPE_TRENDS_RATE_LIMIT.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
      limit: ADMIN_SCRAPE_TRENDS_RATE_LIMIT.maxRequests,
    };
  }

  existing.count += 1;
  attempts.set(key, existing);

  return {
    limited: false,
    remaining: Math.max(0, ADMIN_SCRAPE_TRENDS_RATE_LIMIT.maxRequests - existing.count),
    retryAfterMs: existing.resetAt - now,
    limit: ADMIN_SCRAPE_TRENDS_RATE_LIMIT.maxRequests,
  };
}

export function clearAdminTriggerRateLimit(key: string) {
  attempts.delete(key);
}

export function resetAdminTriggerRateLimitStore() {
  attempts.clear();
}
