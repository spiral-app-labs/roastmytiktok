import type { HistoryEntry } from './history-types';
import { listOwnedRoastSessions } from './settings-server';

type RoastSessionRow = Awaited<ReturnType<typeof listOwnedRoastSessions>>[number];

function asObject<T>(value: unknown): Record<string, T> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, T>;
  }

  return {};
}

function isPersistedAnalysis(row: RoastSessionRow): boolean {
  if (row.analysis_status === 'failed') {
    return false;
  }

  if (row.analysis_status === 'completed' || row.result_json) {
    return true;
  }

  if (Number(row.overall_score ?? 0) > 0) {
    return true;
  }

  return Object.keys(asObject(row.agent_scores)).length > 0
    || Object.keys(asObject(row.findings)).length > 0;
}

export function mapRoastSessionToHistoryEntry(row: RoastSessionRow): HistoryEntry {
  const resultJson = row.result_json as { viralPotential?: number } | null;

  return {
    id: row.id,
    date: row.created_at ?? new Date().toISOString(),
    overallScore: Number(row.overall_score ?? 0),
    viralPotential: resultJson?.viralPotential ?? undefined,
    verdict: row.verdict ?? '',
    source: row.source === 'url' ? 'url' : 'upload',
    filename: row.filename ?? undefined,
    url: row.tiktok_url ?? undefined,
    agentScores: asObject<number>(row.agent_scores),
    findings: asObject<string[]>(row.findings),
    persistence: 'account',
  };
}

export async function listAccountHistoryEntries(userId: string): Promise<HistoryEntry[]> {
  const sessions = await listOwnedRoastSessions(userId);

  return sessions
    .filter(isPersistedAnalysis)
    .map(mapRoastSessionToHistoryEntry)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
