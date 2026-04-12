import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server.js';
import { supabaseServer } from './supabase-server.ts';

export type UsageSubject =
  | { type: 'session'; id: string }
  | { type: 'ip'; id: string };

export interface UsageSnapshot {
  subject: UsageSubject;
  plan: 'free' | 'paid';
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

export const FREE_USAGE_CAP = {
  roastsPerWindow: 3,
  windowMs: 24 * 60 * 60 * 1000,
} as const;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export function getUsageSubject(req: NextRequest, sessionId?: string | null): UsageSubject {
  if (sessionId && sessionId.trim().length >= 5) {
    return { type: 'session', id: sessionId.trim() };
  }

  return { type: 'ip', id: getClientIp(req) };
}

function buildSubjectFilter(subject: UsageSubject) {
  if (subject.type === 'session') {
    return { column: 'session_id', value: subject.id } as const;
  }

  return { column: 'session_id', value: subject.id } as const;
}

export function buildUsageSnapshotFromRows(
  subject: UsageSubject,
  rows: Array<{ created_at?: string | null; processed_seconds?: number | null }>,
  plan: 'free' | 'paid' = 'free',
  now = new Date()
): UsageSnapshot {
  const windowStart = new Date(now.getTime() - FREE_USAGE_CAP.windowMs);

  const totals = rows.reduce(
    (acc, row) => {
      const processedSeconds = Number(row.processed_seconds ?? 0);
      const createdAt = row.created_at ? new Date(row.created_at) : null;
      const inWindow = createdAt ? createdAt >= windowStart : false;

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

export async function getUsageSnapshot(subject: UsageSubject, plan: 'free' | 'paid' = 'free'): Promise<UsageSnapshot> {
  const filter = buildSubjectFilter(subject);

  const { data, error } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('created_at')
    .eq(filter.column, filter.value)
    .gt('overall_score', 0);

  if (error) {
    throw new Error(error.message);
  }

  return buildUsageSnapshotFromRows(subject, data ?? [], plan);
}

function roundUsageNumber(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function enforceUsageCap(req: NextRequest, sessionId?: string | null): Promise<NextResponse | null> {
  const subject = getUsageSubject(req, sessionId);
  const snapshot = await getUsageSnapshot(subject, 'free');

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
