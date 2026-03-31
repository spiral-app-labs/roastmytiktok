'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DimensionRadarChart = dynamic(() => import('@/components/charts/DimensionRadarChart'), { ssr: false });
import { fetchHistory, HistoryEntry } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import { DimensionKey } from '@/lib/types';
import { GlassCard, EmptyState, PageHeader } from '@/components/ui';
import { ScoreRing } from '@/components/ScoreRing';

// ─── Tier benchmarks (representative averages per content tier) ──────────────

const TIER_BENCHMARKS: Record<string, Record<DimensionKey, number>> = {
  'Beginner (<50)': {
    hook: 35, visual: 38, caption: 32, audio: 40, algorithm: 30, authenticity: 42, conversion: 28, accessibility: 34,
  },
  'Rising (50–69)': {
    hook: 55, visual: 58, caption: 52, audio: 60, algorithm: 50, authenticity: 62, conversion: 48, accessibility: 54,
  },
  'Pro (70–84)': {
    hook: 75, visual: 78, caption: 72, audio: 76, algorithm: 70, authenticity: 78, conversion: 68, accessibility: 74,
  },
  'Elite (85+)': {
    hook: 90, visual: 88, caption: 86, audio: 89, algorithm: 85, authenticity: 91, conversion: 84, accessibility: 87,
  },
};

function getUserTier(avg: number): string {
  if (avg >= 85) return 'Elite (85+)';
  if (avg >= 70) return 'Pro (70–84)';
  if (avg >= 50) return 'Rising (50–69)';
  return 'Beginner (<50)';
}

function getNextTier(avg: number): string | null {
  if (avg >= 85) return null;
  if (avg >= 70) return 'Elite (85+)';
  if (avg >= 50) return 'Pro (70–84)';
  return 'Rising (50–69)';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRelativeDate(dateStr: string): string {
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

function getLetterGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: 'text-green-400' };
  if (score >= 80) return { grade: 'A', color: 'text-green-400' };
  if (score >= 70) return { grade: 'B', color: 'text-yellow-400' };
  if (score >= 60) return { grade: 'C', color: 'text-orange-400' };
  if (score >= 50) return { grade: 'D', color: 'text-red-400' };
  return { grade: 'F', color: 'text-red-500' };
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 65) return 'text-yellow-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10 border-green-500/20';
  if (score >= 65) return 'bg-yellow-500/10 border-yellow-500/20';
  if (score >= 50) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function scoreGradient(score: number): string {
  if (score >= 80) return 'from-green-500/20 to-green-500/5';
  if (score >= 65) return 'from-yellow-500/20 to-yellow-500/5';
  if (score >= 50) return 'from-orange-500/20 to-orange-500/5';
  return 'from-red-500/20 to-red-500/5';
}

function truncateTitle(entry: HistoryEntry): string {
  const raw = entry.verdict || entry.filename || entry.url || 'Untitled roast';
  return raw.length > 55 ? raw.slice(0, 55) + '…' : raw;
}

function getAvgScore(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((s, e) => s + e.overallScore, 0) / entries.length);
}

// ─── Playbook generator ──────────────────────────────────────────────────────

interface PlaybookItem {
  emoji: string;
  title: string;
  body: string;
  type: 'strength' | 'weakness' | 'trend';
}

function generatePlaybook(entries: HistoryEntry[]): PlaybookItem[] {
  if (entries.length < 2) {
    return [
      {
        emoji: '🎯',
        title: 'Roast more videos to unlock your playbook',
        body: 'After 2+ roasts, we\'ll surface personalized patterns — what\'s working, what to fix, and exactly what to post next.',
        type: 'trend',
      },
    ];
  }

  const items: PlaybookItem[] = [];

  const dimTotals: Partial<Record<DimensionKey, number[]>> = {};
  for (const entry of entries) {
    for (const [dim, score] of Object.entries(entry.agentScores)) {
      const key = dim as DimensionKey;
      if (!dimTotals[key]) dimTotals[key] = [];
      dimTotals[key]!.push(score);
    }
  }

  const dimAvgs: { key: DimensionKey; avg: number; agent: typeof AGENTS[0] }[] = [];
  for (const [dim, scores] of Object.entries(dimTotals)) {
    const key = dim as DimensionKey;
    const avg = Math.round(scores!.reduce((a, b) => a + b, 0) / scores!.length);
    const agent = AGENTS.find(a => a.key === key);
    if (agent) dimAvgs.push({ key, avg, agent });
  }

  dimAvgs.sort((a, b) => b.avg - a.avg);

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

  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length >= 3) {
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const firstAvg = getAvgScore(firstHalf);
    const secondAvg = getAvgScore(secondHalf);
    const delta = secondAvg - firstAvg;

    if (delta >= 5) {
      items.push({
        emoji: '📈',
        title: 'You\'re improving — don\'t stop now',
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
        body: `You\'re holding steady around ${secondAvg}/100. Good consistency, but you\'ve got room to break into the next tier. Focus on your weakest dimension.`,
        type: 'trend',
      });
    }
  }

  const midDims = dimAvgs.filter(d => d.avg >= 50 && d.avg < 70 && d !== topDim && d !== bottomDim);
  if (midDims.length > 0) {
    const pick = midDims[0];
    items.push({
      emoji: '💡',
      title: `Quick win: push your ${pick.agent.name.replace(' Agent', '')} past 70`,
      body: `Currently at ${pick.avg}/100 — close to good. A small improvement here (${pick.agent.analyzes}) could unlock noticeably higher overall scores.`,
      type: 'trend',
    });
  }

  const scores = entries.map(e => e.overallScore);
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

// ─── Phased Loading State ────────────────────────────────────────────────────

const LOADING_PHASES = [
  { label: 'Loading your roast history', icon: '📂' },
  { label: 'Crunching engagement data', icon: '📊' },
  { label: 'Comparing against benchmarks', icon: '🎯' },
  { label: 'Generating insights', icon: '🧠' },
];

function AnalysisLoadingState() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase(prev => (prev < LOADING_PHASES.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Phase indicator */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          {LOADING_PHASES.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: i <= phase ? 1 : 0.3 }}
              className="flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all duration-300 ${
                i < phase
                  ? 'bg-green-500/20 border border-green-500/30'
                  : i === phase
                    ? 'bg-orange-500/20 border border-orange-500/30 animate-pulse'
                    : 'bg-zinc-800/60 border border-zinc-800/40'
              }`}>
                {i < phase ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{p.icon}</span>
                )}
              </div>
              <span className={`text-sm font-medium transition-colors duration-300 ${
                i < phase ? 'text-green-400' : i === phase ? 'text-zinc-200' : 'text-zinc-600'
              }`}>
                {p.label}
                {i === phase && <span className="ml-1 text-zinc-500">...</span>}
              </span>
            </motion.div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="mt-5 h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
            initial={{ width: '0%' }}
            animate={{ width: `${((phase + 1) / LOADING_PHASES.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </GlassCard>

      {/* Skeleton grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl bg-zinc-900/60 border border-zinc-800/50 overflow-hidden">
            <div className="aspect-[16/9] bg-zinc-800/40 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-zinc-800/60 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-zinc-800/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function VideoGridCard({ entry, index, avgScore }: { entry: HistoryEntry; index: number; avgScore: number }) {
  const { grade, color } = getLetterGrade(entry.overallScore);
  const delta = entry.overallScore - avgScore;
  const isOutlierHigh = delta >= 15;
  const isOutlierLow = delta <= -15;

  const topDimension = useMemo(() => {
    const entries = Object.entries(entry.agentScores) as [DimensionKey, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const agent = AGENTS.find(a => a.key === entries[0]?.[0]);
    return agent ? { emoji: agent.emoji, name: agent.name.replace(' Agent', ''), score: entries[0][1] } : null;
  }, [entry.agentScores]);

  const weakestDimension = useMemo(() => {
    const entries = Object.entries(entry.agentScores) as [DimensionKey, number][];
    entries.sort((a, b) => a[1] - b[1]);
    const agent = AGENTS.find(a => a.key === entries[0]?.[0]);
    return agent ? { emoji: agent.emoji, name: agent.name.replace(' Agent', ''), score: entries[0][1] } : null;
  }, [entry.agentScores]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.04 + index * 0.05, duration: 0.4, ease: 'easeOut' }}
    >
      <Link href={`/roast/${entry.id}`} className="block group h-full">
        <GlassCard
          variant="interactive"
          className="overflow-hidden hover:border-orange-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 h-full flex flex-col"
        >
          {/* Thumbnail area */}
          <div className={`relative aspect-[16/9] bg-gradient-to-br ${scoreGradient(entry.overallScore)} overflow-hidden`}>
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }} />
            {/* Score overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="transform group-hover:scale-110 transition-transform duration-300">
                <ScoreRing score={entry.overallScore} size={64} />
              </div>
            </div>
            {/* Grade badge */}
            <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-xs font-black ${color} ${scoreBg(entry.overallScore)} border backdrop-blur-sm`}>
              {grade}
            </div>
            {/* Source badge */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-medium text-zinc-300 bg-black/40 backdrop-blur-sm border border-white/10">
              {entry.source === 'upload' ? '📎 Upload' : '🔗 URL'}
            </div>
            {/* Outlier badge */}
            {(isOutlierHigh || isOutlierLow) && (
              <div className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-sm border ${
                isOutlierHigh
                  ? 'text-green-300 bg-green-500/20 border-green-500/30'
                  : 'text-red-300 bg-red-500/20 border-red-500/30'
              }`}>
                {isOutlierHigh ? '▲ Standout' : '▼ Below avg'}
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <span className="text-sm font-semibold text-white/90">View Roast →</span>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="text-[13px] font-semibold text-zinc-200 leading-snug line-clamp-2 mb-2.5 group-hover:text-white transition-colors">
              {truncateTitle(entry)}
            </h3>

            {/* Dimension highlights */}
            <div className="flex items-center gap-3 mb-2.5">
              {topDimension && (
                <span className="text-[11px] flex items-center gap-1 text-zinc-500">
                  <span>{topDimension.emoji}</span>
                  <span className={scoreColor(topDimension.score)}>{topDimension.score}</span>
                  <span className="text-zinc-600">best</span>
                </span>
              )}
              {weakestDimension && (
                <span className="text-[11px] flex items-center gap-1 text-zinc-500">
                  <span>{weakestDimension.emoji}</span>
                  <span className={scoreColor(weakestDimension.score)}>{weakestDimension.score}</span>
                  <span className="text-zinc-600">weakest</span>
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-white/5">
              <span className="text-[11px] text-zinc-500">{getRelativeDate(entry.date)}</span>
              <span className={`text-[11px] font-bold ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'} vs avg
              </span>
            </div>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}

function RankingCard({ entry, rank, showTrend, prevEntry }: {
  entry: HistoryEntry;
  rank: number;
  showTrend: boolean;
  prevEntry?: HistoryEntry;
}) {
  const delta = prevEntry ? entry.overallScore - prevEntry.overallScore : null;
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 + rank * 0.05, duration: 0.35 }}
    >
      <Link href={`/roast/${entry.id}`} className="block group">
        <GlassCard
          variant="interactive"
          className="p-4 flex items-center gap-4 hover:border-orange-500/30 transition-all duration-200"
        >
          <span className="text-xl w-8 text-center shrink-0 font-black text-zinc-400">{rankEmoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{truncateTitle(entry)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{getRelativeDate(entry.date)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {showTrend && delta !== null && (
              <span className={`text-xs font-bold ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
              </span>
            )}
            <div className={`px-3 py-1 rounded-xl border text-sm font-black ${scoreColor(entry.overallScore)} ${scoreBg(entry.overallScore)}`}>
              {entry.overallScore}
            </div>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}

function PlaybookCard({ item, index }: { item: PlaybookItem; index: number }) {
  const borderColor =
    item.type === 'strength'
      ? 'border-green-500/20'
      : item.type === 'weakness'
        ? 'border-red-500/20'
        : 'border-orange-500/15';

  const bgColor =
    item.type === 'strength'
      ? 'bg-green-500/5'
      : item.type === 'weakness'
        ? 'bg-red-500/5'
        : 'bg-orange-500/5';

  const tagLabel =
    item.type === 'strength' ? 'Strength' : item.type === 'weakness' ? 'Fix this' : 'Insight';
  const tagColor =
    item.type === 'strength'
      ? 'text-green-400 bg-green-500/10'
      : item.type === 'weakness'
        ? 'text-red-400 bg-red-500/10'
        : 'text-orange-400 bg-orange-500/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.4 }}
    >
      <GlassCard className={`p-5 border ${borderColor} ${bgColor}`}>
        <div className="flex items-start gap-4">
          <span className="text-2xl shrink-0 mt-0.5">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-zinc-100">{item.title}</h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${tagColor}`}>
                {tagLabel}
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{item.body}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function DimensionBreakdown({ entries }: { entries: HistoryEntry[] }) {
  const dimAvgs = useMemo(() => {
    const totals: Partial<Record<DimensionKey, number[]>> = {};
    for (const e of entries) {
      for (const [dim, score] of Object.entries(e.agentScores)) {
        const k = dim as DimensionKey;
        if (!totals[k]) totals[k] = [];
        totals[k]!.push(score);
      }
    }
    return AGENTS.map(agent => ({
      agent,
      avg: totals[agent.key]
        ? Math.round(totals[agent.key]!.reduce((a, b) => a + b, 0) / totals[agent.key]!.length)
        : 0,
    })).sort((a, b) => b.avg - a.avg);
  }, [entries]);

  return (
    <div className="space-y-2.5">
      {dimAvgs.map(({ agent, avg }, i) => (
        <motion.div
          key={agent.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 + i * 0.04 }}
          className="group flex items-center gap-3"
        >
          <span className="text-base w-6 shrink-0">{agent.emoji}</span>
          <span className="text-xs text-zinc-400 w-24 shrink-0 truncate font-medium">{agent.name.replace(' Agent', '')}</span>
          <div className="flex-1 h-2.5 rounded-full bg-zinc-800/60 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${avg >= 70 ? 'bg-gradient-to-r from-green-500 to-green-400' : avg >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
              initial={{ width: 0 }}
              animate={{ width: `${avg}%` }}
              transition={{ delay: 0.1 + i * 0.04, duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className={`text-xs font-bold w-8 text-right shrink-0 ${scoreColor(avg)}`}>{avg}</span>
        </motion.div>
      ))}
    </div>
  );
}

function BenchmarkBars({ entries }: { entries: HistoryEntry[] }) {
  const avgScore = getAvgScore(entries);
  const tier = getUserTier(avgScore);
  const nextTier = getNextTier(avgScore);
  const nextBenchmarks = nextTier ? TIER_BENCHMARKS[nextTier] : TIER_BENCHMARKS[tier];
  const targetLabel = nextTier ?? tier;

  const dimData = useMemo(() => {
    const totals: Partial<Record<DimensionKey, number[]>> = {};
    for (const e of entries) {
      for (const [dim, score] of Object.entries(e.agentScores)) {
        const k = dim as DimensionKey;
        if (!totals[k]) totals[k] = [];
        totals[k]!.push(score);
      }
    }
    return AGENTS.map(agent => {
      const userAvg = totals[agent.key]
        ? Math.round(totals[agent.key]!.reduce((a, b) => a + b, 0) / totals[agent.key]!.length)
        : 0;
      const benchmark = nextBenchmarks[agent.key];
      const pct = benchmark > 0 ? Math.round((userAvg / benchmark) * 100) : 0;
      return { agent, userAvg, benchmark, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [entries, nextBenchmarks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Benchmark Progress</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Your scores vs. {targetLabel} tier target</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-700/40">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            You
            <span className="mx-1 text-zinc-700">|</span>
            <span className="w-2 h-2 rounded-full bg-zinc-600 border border-zinc-500/50" />
            Target
          </div>
        </div>
        <div className="space-y-3">
          {dimData.map(({ agent, userAvg, benchmark, pct }, i) => (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{agent.emoji}</span>
                  <span className="text-xs font-medium text-zinc-400">{agent.name.replace(' Agent', '')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${scoreColor(userAvg)}`}>{userAvg}</span>
                  <span className="text-[10px] text-zinc-600">/</span>
                  <span className="text-[10px] text-zinc-500">{benchmark}</span>
                  <span className={`text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded ${
                    pct >= 100 ? 'text-green-400 bg-green-500/10' : pct >= 80 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'
                  }`}>
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="relative h-2 rounded-full bg-zinc-800/60 overflow-hidden">
                {/* Benchmark marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-zinc-500/60 z-10"
                  style={{ left: `${Math.min(benchmark, 100)}%` }}
                />
                <motion.div
                  className={`h-full rounded-full ${
                    pct >= 100
                      ? 'bg-gradient-to-r from-green-500 to-green-400'
                      : pct >= 80
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                        : 'bg-gradient-to-r from-orange-500 to-orange-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(userAvg, 100)}%` }}
                  transition={{ delay: 0.15 + i * 0.04, duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function BenchmarkChart({ entries }: { entries: HistoryEntry[] }) {
  const avgScore = getAvgScore(entries);
  const tier = getUserTier(avgScore);
  const nextTier = getNextTier(avgScore);
  const benchmarks = TIER_BENCHMARKS[tier];
  const nextBenchmarks = nextTier ? TIER_BENCHMARKS[nextTier] : null;

  const chartData = useMemo(() => {
    const totals: Partial<Record<DimensionKey, number[]>> = {};
    for (const e of entries) {
      for (const [dim, score] of Object.entries(e.agentScores)) {
        const k = dim as DimensionKey;
        if (!totals[k]) totals[k] = [];
        totals[k]!.push(score);
      }
    }
    return AGENTS.map(agent => {
      const userAvg = totals[agent.key]
        ? Math.round(totals[agent.key]!.reduce((a, b) => a + b, 0) / totals[agent.key]!.length)
        : 0;
      return {
        dimension: agent.name.replace(' Agent', ''),
        You: userAvg,
        [tier]: benchmarks[agent.key],
        ...(nextBenchmarks ? { [nextTier!]: nextBenchmarks[agent.key] } : {}),
      };
    });
  }, [entries, tier, nextTier, benchmarks, nextBenchmarks]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.5 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Radar Overview</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Your scores vs. tier averages</p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-zinc-400">You</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <span className="text-zinc-500">{tier}</span>
            </span>
            {nextTier && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="text-zinc-500">{nextTier}</span>
              </span>
            )}
          </div>
        </div>
        <div className="h-[280px] -mx-2">
          <DimensionRadarChart chartData={chartData} tier={tier} nextTier={nextTier} />
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyzeAccountPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'library' | 'rankings' | 'playbook'>('library');

  useEffect(() => {
    fetchHistory().then(h => {
      const sorted = [...h].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(sorted);
      setLoading(false);
    });
  }, []);

  const ranked = useMemo(
    () => [...history].sort((a, b) => b.overallScore - a.overallScore),
    [history]
  );

  const playbook = useMemo(() => generatePlaybook(history), [history]);

  const avgScore = getAvgScore(history);
  const bestScore = history.length ? Math.max(...history.map(e => e.overallScore)) : 0;
  const totalRoasts = history.length;
  const tier = getUserTier(avgScore);

  const tabs = [
    { id: 'library' as const, label: 'My Videos', icon: '📚', count: totalRoasts },
    { id: 'rankings' as const, label: 'Rankings', icon: '🏆', count: null },
    { id: 'playbook' as const, label: 'AI Playbook', icon: '🧠', count: null },
  ];

  return (
    <main className="min-h-screen px-4 py-10 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-b from-orange-500/8 via-pink-500/4 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-gradient-to-tl from-pink-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <PageHeader
          title={
            <span>
              Your <span className="fire-text">Account Analysis</span>
            </span>
          }
          subtitle="All your roasts in one place. Private — only you can see this."
          backHref="/dashboard"
          backLabel="← Dashboard"
        />

        {loading ? (
          <AnalysisLoadingState />
        ) : totalRoasts === 0 ? (
          <EmptyState
            icon="📭"
            title="No roasts yet"
            description="Roast your first TikTok and come back to see your personal library, rankings, and AI playbook."
            cta={{ label: 'Roast a TikTok', href: '/dashboard' }}
          />
        ) : (
          <>
            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
            >
              {[
                { label: 'Videos', value: String(totalRoasts), color: 'text-white' },
                { label: 'Avg Score', value: `${avgScore}`, color: scoreColor(avgScore) },
                { label: 'Best', value: `${bestScore}`, color: scoreColor(bestScore) },
                { label: 'Tier', value: tier.split(' ')[0], color: avgScore >= 85 ? 'text-green-400' : avgScore >= 70 ? 'text-yellow-400' : avgScore >= 50 ? 'text-orange-400' : 'text-red-400' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <GlassCard className="p-4 text-center">
                    <div className={`text-xl font-black tracking-tight ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 font-medium uppercase tracking-wider">{stat.label}</div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-1 mb-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/[0.08] rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count > 0 && (
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 rounded-full px-1.5 py-0.5 font-bold leading-none">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                {/* ─── Library tab ─── */}
                {activeTab === 'library' && (
                  <div className="space-y-6">
                    {/* Benchmark progress bars */}
                    {history.length >= 2 && (
                      <BenchmarkBars entries={history} />
                    )}

                    {/* Responsive video grid: 1-col mobile, 2-col tablet, 3-col desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {history.map((entry, i) => (
                        <VideoGridCard key={entry.id} entry={entry} index={i} avgScore={avgScore} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Rankings tab ─── */}
                {activeTab === 'rankings' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      {ranked.map((entry, i) => (
                        <RankingCard
                          key={entry.id}
                          entry={entry}
                          rank={i + 1}
                          showTrend={ranked.length > 1}
                          prevEntry={ranked[i + 1]}
                        />
                      ))}
                    </div>

                    {history.length >= 2 && (
                      <BenchmarkChart entries={history} />
                    )}

                    {history.length >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <GlassCard className="p-6">
                          <h3 className="text-sm font-bold text-zinc-200 mb-4">Dimension Averages</h3>
                          <DimensionBreakdown entries={history} />
                        </GlassCard>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ─── Playbook tab ─── */}
                {activeTab === 'playbook' && (
                  <div className="space-y-4">
                    {history.length < 2 && (
                      <GlassCard className="p-5 border border-orange-500/20 bg-orange-500/5 mb-4">
                        <p className="text-sm text-zinc-400">
                          🎯 <span className="text-zinc-200 font-medium">Roast at least 2 videos</span> to unlock personalized insights. The more you roast, the sharper your playbook gets.
                        </p>
                      </GlassCard>
                    )}
                    {playbook.map((item, i) => (
                      <PlaybookCard key={i} item={item} index={i} />
                    ))}
                    {history.length >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <GlassCard className="p-6">
                          <h3 className="text-sm font-bold text-zinc-200 mb-4">Your Average by Dimension</h3>
                          <DimensionBreakdown entries={history} />
                        </GlassCard>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </main>
  );
}
