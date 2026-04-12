import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server.js';
import { supabaseServer } from './supabase-server.ts';

export type UsagePlan = 'free' | 'paid';

export type UsageSubject =
  | { type: 'account'; id: string }
  | { type: 'session'; id: string }
  | { type: 'ip'; id: string };

export interface UsageContext {
  clientIp: string;
  plan: UsagePlan;
  sessionId: string | null;
  subject: UsageSubject;
  userId: string | null;
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
  analysis_status?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  overall_score?: number | null;
  processed_seconds?: number | null;
}

export const FREE_USAGE_CAP = {
  roastsPerWindow: 3,
  windowMs: 24 * 60 * 60 * 1000,
} as const;

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return ip.trim() || 'unknown';
}

function normalizeSessionId(sessionId?: string | null): string | null {
  if (!sessionId) return null;
  const trimmed = sessionId.trim();
  return trimmed.length >= 5 ? trimmed : null;
}

export function resolveUsageSubjectFromIds(params: {
  clientIp: string;
  sessionId?: string | null;
  userId?: string | null;
}): UsageSubject {
  if (params.userId) {
    return { type: 'account', id: params.userId };
  }

  const sessionId = normalizeSessionId(params.sessionId);
  if (sessionId) {
    return { type: 'session', id: sessionId };
  }

  return { type: 'ip', id: params.clientIp };
}

export function getUsageSubject(
  req: NextRequest,
  sessionId?: string | null,
  userId?: string | null
): UsageSubject {
  return resolveUsageSubjectFromIds({
    clientIp: getClientIp(req),
    sessionId,
    userId,
  });
}

export async function resolveUsageContext(req: NextRequest, sessionId?: string | null): Promise<UsageContext> {
  const { resolveRequestEntitlement } = await import('./rate-limit.ts');
  const { plan, userId } = await resolveRequestEntitlement(req);
  const clientIp = getClientIp(req);
  const normalizedSessionId = normalizeSessionId(sessionId);

  return {
    clientIp,
    plan,
    sessionId: normalizedSessionId,
    subject: resolveUsageSubjectFromIds({
      clientIp,
      sessionId: normalizedSessionId,
      userId,
    }),
    userId,
  };
}

function buildSubjectFilter(subject: UsageSubject) {
  if (subject.type === 'account') {
    return { column: 'user_id', value: subject.id } as const;
  }

  if (subject.type === 'session') {
    return { column: 'session_id', value: subject.id } as const;
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
      roastLimit: plan === 'paid' ? null : FREE_USAGE_CAP.roastsPerWindow,
    },
  };
}

export async function getUsageSnapshot(subject: UsageSubject, plan: UsagePlan = 'free'): Promise<UsageSnapshot> {
  const filter = buildSubjectFilter(subject);

  const { data, error } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('analysis_status, completed_at, created_at, overall_score, processed_seconds')
    .eq(filter.column, filter.value);

  if (error) {
    throw new Error(error.message);
  }

  return buildUsageSnapshotFromRows(subject, (data ?? []) as UsageRow[], plan);
}

function roundUsageNumber(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function enforceUsageCap(req: NextRequest, sessionId?: string | null): Promise<NextResponse | null> {
  const context = await resolveUsageContext(req, sessionId);

  if (context.plan === 'paid') {
    return null;
  }

  const snapshot = await getUsageSnapshot(context.subject, context.plan);

  if (snapshot.totals.roastsInWindow >= FREE_USAGE_CAP.roastsPerWindow) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(snapshot.window.start).getTime() + FREE_USAGE_CAP.windowMs - Date.now()) / 1000)
    );

    return NextResponse.json(
      {
        error: 'Free limit reached. You\'ve used your 3 free roasts today.',
        upgradeUrl: '/pricing',
        retryAfterSeconds,
        usage: snapshot,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(FREE_USAGE_CAP.roastsPerWindow),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}
