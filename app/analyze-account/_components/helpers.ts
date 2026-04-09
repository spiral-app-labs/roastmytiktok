import { HistoryEntry } from '@/lib/history';
import { DimensionKey } from '@/lib/types';
import { AGENTS } from '@/lib/agents';

// ─── Tier benchmarks ─────────────────────────────────────────────────────────

export const TIER_BENCHMARKS: Record<string, Record<DimensionKey, number>> = {
  'Beginner (<50)': {
    hook: 35,
    visual: 38,
    audio: 40,
    authenticity: 42,
    conversion: 28,
    accessibility: 34,
  },
  'Rising (50-69)': {
    hook: 55,
    visual: 58,
    audio: 60,
    authenticity: 62,
    conversion: 48,
    accessibility: 54,
  },
  'Pro (70-84)': {
    hook: 75,
    visual: 78,
    audio: 76,
    authenticity: 78,
    conversion: 68,
    accessibility: 74,
  },
  'Elite (85+)': {
    hook: 90,
    visual: 88,
    audio: 89,
    authenticity: 91,
    conversion: 84,
    accessibility: 87,
  },
};

export function getUserTier(avg: number): string {
  if (avg >= 85) return 'Elite (85+)';
  if (avg >= 70) return 'Pro (70-84)';
  if (avg >= 50) return 'Rising (50-69)';
  return 'Beginner (<50)';
}

export function getNextTier(avg: number): string | null {
  if (avg >= 85) return null;
  if (avg >= 70) return 'Elite (85+)';
  if (avg >= 50) return 'Pro (70-84)';
  return 'Rising (50-69)';
}

export function getAvgScore(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((s, e) => s + e.overallScore, 0) / entries.length);
}

// ─── Dimension averages ──────────────────────────────────────────────────────

export interface DimensionAvg {
  key: DimensionKey;
  avg: number;
  agent: (typeof AGENTS)[number];
}

export function getDimensionAverages(entries: HistoryEntry[]): DimensionAvg[] {
  const totals: Partial<Record<DimensionKey, number[]>> = {};
  for (const entry of entries) {
    for (const [dim, score] of Object.entries(entry.agentScores)) {
      const key = dim as DimensionKey;
      if (!totals[key]) totals[key] = [];
      totals[key]!.push(score as number);
    }
  }

  const result: DimensionAvg[] = [];
  for (const agent of AGENTS) {
    const scores = totals[agent.key] ?? [];
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    result.push({ key: agent.key, avg, agent });
  }
  return result;
}

// ─── Playbook generator ──────────────────────────────────────────────────────

export interface PlaybookItem {
  emoji: string;
  title: string;
  body: string;
  type: 'strength' | 'weakness' | 'trend';
}

export function generatePlaybook(entries: HistoryEntry[]): PlaybookItem[] {
  if (entries.length < 2) {
    return [
      {
        emoji: '🎯',
        title: 'Roast more videos to unlock your playbook',
        body: "After 2+ roasts, we'll surface personalized patterns — what's working, what to fix, and exactly what to post next.",
        type: 'trend',
      },
    ];
  }

  const items: PlaybookItem[] = [];
  const dimAvgs = getDimensionAverages(entries).sort((a, b) => b.avg - a.avg);

  const topDim = dimAvgs[0];
  if (topDim && topDim.avg >= 60) {
    items.push({
      emoji: topDim.agent.emoji,
      title: `Your ${topDim.agent.name.replace(' Agent', '')} is your superpower`,
      body: `Averaging ${topDim.avg}/100 across your roasts. This is your strongest signal — lean into it and build more videos that highlight it.`,
      type: 'strength',
    });
  }

  const bottomDim = dimAvgs[dimAvgs.length - 1];
  if (bottomDim && bottomDim.avg < 65) {
    items.push({
      emoji: '⚠️',
      title: `Fix your ${bottomDim.agent.name.replace(' Agent', '')} and watch your scores climb`,
      body: `Averaging ${bottomDim.avg}/100 — this is your biggest drag. ${bottomDim.agent.analyzes}. One focused fix here moves the needle more than anything else.`,
      type: 'weakness',
    });
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  if (sorted.length >= 3) {
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const firstAvg = getAvgScore(firstHalf);
    const secondAvg = getAvgScore(secondHalf);
    const delta = secondAvg - firstAvg;

    if (delta >= 5) {
      items.push({
        emoji: '📈',
        title: "You're improving — don't stop now",
        body: `Your average score has gone up ${delta} points over your last ${entries.length} roasts. Whatever you changed recently is working. Keep it up.`,
        type: 'trend',
      });
    } else if (delta <= -5) {
      items.push({
        emoji: '📉',
        title: 'Your scores are slipping',
        body: `Average dropped ${Math.abs(delta)} points recently. Usually this means inconsistency in execution — revisit the fundamentals in your lowest-scoring dimension.`,
        type: 'trend',
      });
    } else {
      items.push({
        emoji: '➡️',
        title: 'Scores are consistent — time to level up',
        body: `You're holding steady around ${secondAvg}/100. Good consistency, but you've got room to break into the next tier. Focus on your weakest dimension.`,
        type: 'trend',
      });
    }
  }

  const midDims = dimAvgs.filter(
    (d) => d.avg >= 50 && d.avg < 70 && d !== topDim && d !== bottomDim
  );
  if (midDims.length > 0) {
    const pick = midDims[0];
    items.push({
      emoji: '💡',
      title: `Quick win: push your ${pick.agent.name.replace(' Agent', '')} past 70`,
      body: `Currently at ${pick.avg}/100 — close to good. A small improvement here (${pick.agent.analyzes}) could unlock noticeably higher overall scores.`,
      type: 'trend',
    });
  }

  const scores = entries.map((e) => e.overallScore);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  if (maxScore - minScore > 25) {
    items.push({
      emoji: '🎲',
      title: 'Your results are too inconsistent',
      body: `${maxScore} on your best day, ${minScore} on your worst — a ${maxScore - minScore}-point swing. TikTok rewards consistency. Build a repeatable process and stick to it.`,
      type: 'weakness',
    });
  }

  return items.slice(0, 5);
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
