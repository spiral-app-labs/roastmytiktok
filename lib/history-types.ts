import type { DimensionKey } from './types';

export type HistoryPersistence = 'account' | 'local';

export interface HistoryEntry {
  id: string;
  date: string;
  overallScore: number;
  viralPotential?: number;
  verdict: string;
  source: 'upload' | 'url';
  filename?: string;
  url?: string;
  agentScores: Record<DimensionKey, number>;
  findings: Record<DimensionKey, string[]>;
  persistence?: HistoryPersistence;
}

export type HistoryLoadSource = 'account' | 'local';
export type HistoryFallbackReason = 'signed_out' | 'server_unavailable' | 'bypass';

export interface HistoryLoadResult {
  entries: HistoryEntry[];
  source: HistoryLoadSource;
  fallbackReason?: HistoryFallbackReason;
  hasLocalOnly: boolean;
}
