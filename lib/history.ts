'use client';

import { RoastResult, DimensionKey } from './types';

export interface HistoryEntry {
  id: string;
  date: string;
  overallScore: number;
  verdict: string;
  source: 'upload' | 'url';
  filename?: string;
  url?: string;
  agentScores: Record<DimensionKey, number>;
  findings: Record<DimensionKey, string[]>;
}

export interface ChronicIssue {
  dimension: DimensionKey;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  finding: string;
}

export type EscalationLevel = 0 | 1 | 2 | 3;

export interface EscalationInfo {
  level: EscalationLevel;
  label: string;
}

const HISTORY_KEY = 'rmt_history';
const SESSION_KEY = 'rmt_session';

const ESCALATION_LABELS: Record<EscalationLevel, string> = {
  0: '',
  1: 'We mentioned this before.',
  2: 'We mentioned this TWICE. Are you even watching these?',
  3: 'At this point we are personally offended.',
};

/** Get or create anonymous session ID */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `rmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Retrieve a stored roast result from sessionStorage */
export function getStoredRoast(id: string): RoastResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`roast_${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Load roast history from localStorage (sync fallback) */
export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Fetch history from localStorage */
export async function fetchHistory(): Promise<HistoryEntry[]> {
  return getHistory();
}

/** Save a roast result to history — localStorage + Supabase */
export function saveToHistory(result: RoastResult, source: 'upload' | 'url', filename?: string): void {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const sessionId = getSessionId();

  const entry: HistoryEntry = {
    id: result.id,
    date: new Date().toISOString(),
    overallScore: result.overallScore,
    verdict: result.verdict,
    source,
    filename,
    url: result.tiktokUrl,
    agentScores: Object.fromEntries(
      result.agents.map(a => [a.agent, a.score])
    ) as Record<DimensionKey, number>,
    findings: Object.fromEntries(
      result.agents.map(a => [a.agent, a.findings.slice(0, 2)])
    ) as Record<DimensionKey, string[]>,
  };

  // Don't save duplicates
  const exists = history.find(h => h.id === entry.id);
  if (!exists) {
    history.unshift(entry);
    // Keep last 50 in localStorage
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  }
}


/** Get escalation level for an issue based on occurrence count */
export function getEscalationLevel(occurrences: number): EscalationInfo {
  if (occurrences >= 4) return { level: 3, label: ESCALATION_LABELS[3] };
  if (occurrences >= 3) return { level: 2, label: ESCALATION_LABELS[2] };
  if (occurrences >= 2) return { level: 1, label: ESCALATION_LABELS[1] };
  return { level: 0, label: '' };
}

/** Detect chronic issues — problems that appear 2+ times */
export function getChronicIssues(history: HistoryEntry[]): ChronicIssue[] {
  if (history.length < 2) return [];

  const issueCounts: Record<string, { count: number; first: string; last: string; dimension: DimensionKey; finding: string }> = {};

  for (const entry of history) {
    for (const [dim, findings] of Object.entries(entry.findings)) {
      for (const finding of findings) {
        // Normalize finding to detect repeats (first 40 chars)
        const key = `${dim}::${finding.slice(0, 40).toLowerCase()}`;
        if (!issueCounts[key]) {
          issueCounts[key] = {
            count: 0,
            first: entry.date,
            last: entry.date,
            dimension: dim as DimensionKey,
            finding,
          };
        }
        issueCounts[key].count++;
        if (entry.date < issueCounts[key].first) issueCounts[key].first = entry.date;
        if (entry.date > issueCounts[key].last) issueCounts[key].last = entry.date;
      }
    }
  }

  return Object.values(issueCounts)
    .filter(i => i.count >= 2)
    .map(i => ({
      dimension: i.dimension,
      occurrences: i.count,
      firstSeen: i.first,
      lastSeen: i.last,
      finding: i.finding,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

/** Get escalating roast copy for a dimension based on how many times it's been flagged */
export function getEscalatingRoast(
  baseRoast: string,
  dimension: DimensionKey,
  occurrences: number
): string {
  if (occurrences <= 1) return baseRoast;

  const { level, label } = getEscalationLevel(occurrences);
  if (level === 0) return baseRoast;

  const escalations: Record<DimensionKey, Record<number, string>> = {
    hook: {
      2: `${baseRoast} We've flagged your hook before. You've heard the feedback. The question now is whether you're going to act on it.`,
      3: `We've told you three times: your hook is killing you. At this point it's not a TikTok problem. It's a listening problem.`,
      4: `Four roasts. Four times we've mentioned the hook. We're not angry — we're just disappointed. Your potential is not the problem. Your opening three seconds are.`,
    },
    visual: {
      2: `${baseRoast} The lighting situation hasn't improved since last time. Your ring light is waiting. Your window is there. We're begging.`,
      3: `Three separate occasions we've watched you film yourself like you're in a cave. The lighting issue is not mysterious. Fix it once and never hear about it again.`,
      4: `Four videos. The same lighting. We're starting to think this is intentional.`,
    },
    audio: {
      2: `${baseRoast} The audio was a problem last time too. TikTok viewers will forgive a lot. Bad audio is not one of them.`,
      3: `We've mentioned the audio on three separate roasts. A $30 lavalier mic would solve this permanently. We're placing the order in your honor.`,
      4: `Four roasts. Four audio issues. The echo is your arch-nemesis at this point. It knows you. It follows you.`,
    },
    authenticity: {
      2: `${baseRoast} The authenticity score has been a concern before. TikTok audiences are remarkably good at detecting performance.`,
      3: `Three roasts flagging the same authenticity patterns. The camera doesn't lie. Neither do we.`,
      4: `Four videos with the same performance energy. The most viral TikTokers aren't trying this hard to seem like they're not trying.`,
    },
    conversion: {
      2: `${baseRoast} We mentioned the missing CTA last time too. You're leaving followers on the table every single video.`,
      3: `Three roasts. Three videos with no clear call to action. You're basically a charity — giving content away and asking for nothing in return.`,
      4: `Four videos without telling people what to do next. At this point you're allergic to growth.`,
    },
    accessibility: {
      2: `${baseRoast} The accessibility issues showed up last time too. That's real viewers you're losing — not a hypothetical.`,
      3: `Three roasts flagging the same accessibility gaps. Half the internet scrolls with sound off. You're invisible to them.`,
      4: `Four videos that exclude the same audiences. This isn't hard to fix. It's hard to keep ignoring.`,
    },
  };

  const clampedLevel = Math.min(occurrences, 4);
  return escalations[dimension]?.[clampedLevel] ?? `[${label}] ${baseRoast}`;
}

/** Check if a previously chronic issue was fixed */
export function getFixedIssues(
  currentFindings: Record<DimensionKey, string[]>,
  history: HistoryEntry[]
): { dimension: DimensionKey; finding: string }[] {
  const chronic = getChronicIssues(history.slice(1)); // exclude most recent
  const fixed: { dimension: DimensionKey; finding: string }[] = [];

  for (const issue of chronic) {
    const currentDimFindings = currentFindings[issue.dimension] ?? [];
    const stillPresent = currentDimFindings.some(f =>
      f.slice(0, 40).toLowerCase() === issue.finding.slice(0, 40).toLowerCase()
    );
    if (!stillPresent) {
      fixed.push({ dimension: issue.dimension, finding: issue.finding });
    }
  }

  return fixed;
}
