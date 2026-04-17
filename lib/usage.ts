import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server.js';
import crypto from 'node:crypto';
import net from 'node:net';

export type UsagePlan = 'free' | 'paid';
const USAGE_COOKIE_NAME = 'rmt_usage';
const USAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const DEV_FALLBACK_USAGE_SECRET = 'dev-usage-secret-change-me';

export type UsageSubject =
  | { type: 'account'; id: string }
  | { type: 'session'; id: string }
  | { type: 'ip'; id: string };

export interface UsageContext {
  anonymousSessionId: string | null;
  clientIp: string;
  clientSessionId: string | null;
  plan: UsagePlan;
  subject: UsageSubject;
  userId: string | null;
  usageCookieValue: string | null;
}

export interface UsageSnapshot {
  subject: UsageSubject;
  plan: UsagePlan;
  window: {
    start: string;
    end: string;
  };
  totals: {
    roastsAllTime: number;
    roastsInWindow: number;
    minutesProcessedAllTime: number;
    minutesProcessedInWindow: number;
  };
  caps: {
    roastLimit: number | null;
  };
}

interface UsageRow {
  id?: string | null;
  analysis_status?: string | null;
  anonymous_session_id?: string | null;
  client_ip?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  overall_score?: number | null;
  processed_seconds?: number | null;
}

export const FREE_USAGE_CAP = {
  roastsPerWindow: 3,
  windowMs: 24 * 60 * 60 * 1000,
} as const;

export function normalizeIpAddress(value?: string | null): string | null {
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

function getUsageSigningSecret(): string {
  const configured = process.env.USAGE_SIGNING_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEV_FALLBACK_USAGE_SECRET;
  }

  throw new Error('Missing usage signing secret');
}

function signUsageValue(value: string): string {
  return crypto
    .createHmac('sha256', getUsageSigningSecret())
    .update(value)
    .digest('base64url');
}

function encodeUsageCookiePayload(sessionId: string, expiresAt: number): string {
  return Buffer.from(JSON.stringify({ sessionId, expiresAt }), 'utf8').toString('base64url');
}

function decodeUsageCookiePayload(value: string): { expiresAt: number; sessionId: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      expiresAt?: unknown;
      sessionId?: unknown;
    };
    if (typeof parsed.sessionId !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function verifySignedUsageCookie(rawCookie?: string | null): string | null {
  if (!rawCookie) return null;
  const [payload, signature] = rawCookie.split('.');
  if (!payload || !signature) return null;

  const expected = signUsageValue(payload);
  const left = Buffer.from(signature, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  const decoded = decodeUsageCookiePayload(payload);
  if (!decoded || decoded.expiresAt <= Date.now()) {
    return null;
  }

  return normalizeSessionId(decoded.sessionId);
}

function createSignedUsageCookie(sessionId: string): string {
  const payload = encodeUsageCookiePayload(sessionId, Date.now() + (USAGE_COOKIE_MAX_AGE_SECONDS * 1000));
  return `${payload}.${signUsageValue(payload)}`;
}

function getAnonymousUsageIdentity(req: NextRequest): { cookieValue: string | null; sessionId: string } {
  const existing = verifySignedUsageCookie(req.cookies.get(USAGE_COOKIE_NAME)?.value);
  if (existing) {
    return { sessionId: existing, cookieValue: null };
  }

  const sessionId = `rmt_srv_${crypto.randomUUID()}`;
  return {
    sessionId,
    cookieValue: createSignedUsageCookie(sessionId),
  };
}

export function getClientIp(req: NextRequest): string {
  const headerCandidates = [
    req.headers.get('x-vercel-forwarded-for'),
    req.headers.get('cf-connecting-ip'),
    req.headers.get('x-real-ip'),
    req.headers.get('x-forwarded-for'),
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

async function getSupabaseServer() {
  const modulePath = './supabase-server.ts';
  const importedModule = await import(modulePath);
  return importedModule.supabaseServer;
}

async function getResolveRequestEntitlement() {
  const modulePath = './rate-limit.ts';
  const importedModule = await import(modulePath);
  return importedModule.resolveRequestEntitlement;
}

function normalizeSessionId(sessionId?: string | null): string | null {
  if (!sessionId) return null;
  const trimmed = sessionId.trim();
  return trimmed.length >= 5 ? trimmed : null;
}

export function resolveUsageSubjectFromIds(params: {
  anonymousSessionId?: string | null;
  clientIp: string;
  userId?: string | null;
}): UsageSubject {
  if (params.userId) {
    return { type: 'account', id: params.userId };
  }

  const sessionId = normalizeSessionId(params.anonymousSessionId);
  if (sessionId) {
    return { type: 'session', id: sessionId };
  }

  return { type: 'ip', id: params.clientIp };
}

export function getUsageSubject(
  req: NextRequest,
  anonymousSessionId?: string | null,
  userId?: string | null
): UsageSubject {
  return resolveUsageSubjectFromIds({
    anonymousSessionId,
    clientIp: getClientIp(req),
    userId,
  });
}

export async function resolveUsageContext(req: NextRequest, clientSessionId?: string | null): Promise<UsageContext> {
  const resolveRequestEntitlement = await getResolveRequestEntitlement();
  const { plan, userId } = await resolveRequestEntitlement(req);
  const clientIp = getClientIp(req);
  const normalizedClientSessionId = normalizeSessionId(clientSessionId);
  const anonymousIdentity = userId ? null : getAnonymousUsageIdentity(req);
  const anonymousSessionId = anonymousIdentity?.sessionId ?? null;

  return {
    anonymousSessionId,
    clientIp,
    clientSessionId: normalizedClientSessionId,
    plan,
    subject: resolveUsageSubjectFromIds({
      anonymousSessionId,
      clientIp,
      userId,
    }),
    userId,
    usageCookieValue: anonymousIdentity?.cookieValue ?? null,
  };
}

function buildSubjectFilter(subject: UsageSubject) {
  if (subject.type === 'account') {
    return { column: 'user_id', value: subject.id } as const;
  }

  if (subject.type === 'session') {
    return { column: 'anonymous_session_id', value: subject.id } as const;
  }

  return { column: 'client_ip', value: subject.id } as const;
}

function isCountableUsageRow(row: UsageRow): boolean {
  if (row.analysis_status === 'failed') {
    return false;
  }

  return row.analysis_status === 'completed'
    || !!row.completed_at
    || Number(row.overall_score ?? 0) > 0;
}

function getUsageTimestamp(row: UsageRow): Date | null {
  const raw = row.completed_at ?? row.created_at ?? null;
  return raw ? new Date(raw) : null;
}

export function buildUsageSnapshotFromRows(
  subject: UsageSubject,
  rows: UsageRow[],
  plan: UsagePlan = 'free',
  now = new Date()
): UsageSnapshot {
  const windowStart = new Date(now.getTime() - FREE_USAGE_CAP.windowMs);
  const completedRows = rows.filter(isCountableUsageRow);

  const totals = completedRows.reduce(
    (acc, row) => {
      const processedSeconds = Number(row.processed_seconds ?? 0);
      const usageAt = getUsageTimestamp(row);
      const inWindow = usageAt ? usageAt >= windowStart : false;

      acc.roastsAllTime += 1;
      acc.minutesProcessedAllTime += processedSeconds / 60;

      if (inWindow) {
        acc.roastsInWindow += 1;
        acc.minutesProcessedInWindow += processedSeconds / 60;
      }

      return acc;
    },
    {
      roastsAllTime: 0,
      roastsInWindow: 0,
      minutesProcessedAllTime: 0,
      minutesProcessedInWindow: 0,
    }
  );

  return {
    subject,
    plan,
    window: {
      start: windowStart.toISOString(),
      end: now.toISOString(),
    },
    totals: {
      roastsAllTime: totals.roastsAllTime,
      roastsInWindow: totals.roastsInWindow,
      minutesProcessedAllTime: roundUsageNumber(totals.minutesProcessedAllTime),
      minutesProcessedInWindow: roundUsageNumber(totals.minutesProcessedInWindow),
    },
    caps: {
      roastLimit: null,
    },
  };
}

async function getUsageRowsForSubject(subject: UsageSubject): Promise<UsageRow[]> {
  const filter = buildSubjectFilter(subject);
  const supabaseServer = await getSupabaseServer();

  const { data, error } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('id, analysis_status, anonymous_session_id, client_ip, completed_at, created_at, overall_score, processed_seconds')
    .eq(filter.column, filter.value);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UsageRow[];
}

export async function getUsageSnapshot(subject: UsageSubject, plan: UsagePlan = 'free'): Promise<UsageSnapshot> {
  const rows = await getUsageRowsForSubject(subject);
  return buildUsageSnapshotFromRows(subject, rows, plan);
}

function mergeUsageRows(rows: UsageRow[]): UsageRow[] {
  const merged = new Map<string, UsageRow>();

  for (const row of rows) {
    const key = row.id ?? JSON.stringify(row);
    if (!merged.has(key)) {
      merged.set(key, row);
    }
  }

  return [...merged.values()];
}

export async function getUsageSnapshotForContext(context: UsageContext): Promise<UsageSnapshot> {
  const primaryRows = await getUsageRowsForSubject(context.subject);

  if (context.subject.type !== 'session' || context.clientIp === 'unknown') {
    return buildUsageSnapshotFromRows(context.subject, primaryRows, context.plan);
  }

  const ipRows = await getUsageRowsForSubject({ type: 'ip', id: context.clientIp });
  return buildUsageSnapshotFromRows(context.subject, mergeUsageRows([...primaryRows, ...ipRows]), context.plan);
}

function roundUsageNumber(value: number): number {
  return Math.round(value * 10) / 10;
}

export function applyUsageCookie(response: NextResponse, context: UsageContext): NextResponse {
  if (!context.usageCookieValue) {
    return response;
  }

  response.cookies.set(USAGE_COOKIE_NAME, context.usageCookieValue, {
    httpOnly: true,
    maxAge: USAGE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export async function enforceUsageCap(req: NextRequest, clientSessionId?: string | null): Promise<NextResponse | null> {
  await resolveUsageContext(req, clientSessionId);
  return null;
}

export async function enforceUsageCapForResolvedContext(context: UsageContext): Promise<NextResponse | null> {
  void context;
  return null;
}
