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

const HISTORY_KEY = 'rmt_history';
const SESSION_KEY = 'rmt_session';

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

/** Load roast history for this session */
export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save a roast result to history */
export function saveToHistory(result: RoastResult, source: 'upload' | 'url', filename?: string): void {
  if (typeof window === 'undefined') return;
  const history = getHistory();

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
    // Keep last 50 roasts
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  }
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
    caption: {
      2: `${baseRoast} The caption game was also an issue last time. Your words deserve to be read. Make them legible.`,
      3: `Three roasts, three caption problems. The text is fighting your content instead of helping it. This is fixable in five minutes per video.`,
      4: `Fourth time flagging the captions. They're actively working against you at this point.`,
    },
    algorithm: {
      2: `${baseRoast} The algorithm struggles were present in your previous submission too. These patterns are not random — they're fixable.`,
      3: `Three data points and the same algorithmic issues keep showing up. The algorithm isn't broken. The signal you're sending it is.`,
      4: `The algorithm has tried to meet you halfway four times. It's giving up. You should pick this up from its end.`,
    },
    authenticity: {
      2: `${baseRoast} The authenticity score has been a concern before. TikTok audiences are remarkably good at detecting performance.`,
      3: `Three roasts flagging the same authenticity patterns. The camera doesn't lie. Neither do we.`,
      4: `Four videos with the same performance energy. The most viral TikTokers aren't trying this hard to seem like they're not trying.`,
    },
  };

  const level = Math.min(occurrences, 4);
  return escalations[dimension]?.[level] ?? baseRoast;
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
