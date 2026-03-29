'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { fetchHistory, HistoryEntry } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import { DimensionKey } from '@/lib/types';
import { GlassCard, EmptyState, LoadingSkeleton, PageHeader, ScoreBadge } from '@/components/ui';
import { ScoreRing } from '@/components/ScoreRing';

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

  // Aggregate scores per dimension
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

  // Top strength
  const topDim = dimAvgs[0];
  if (topDim && topDim.avg >= 60) {
    items.push({
      emoji: topDim.agent.emoji,
      title: `Your ${topDim.agent.name.replace(' Agent', '')} is your superpower`,
      body: `Averaging ${topDim.avg}/100 across your roasts. This is your strongest signal — lean into it and build more videos that highlight it.`,
      type: 'strength',
    });
  }

  // Biggest weakness
  const bottomDim = dimAvgs[dimAvgs.length - 1];
  if (bottomDim && bottomDim.avg < 65) {
    items.push({
      emoji: '⚠️',
      title: `Fix your ${bottomDim.agent.name.replace(' Agent', '')} and watch your scores climb`,
      body: `Averaging ${bottomDim.avg}/100 — this is your biggest drag. ${bottomDim.agent.analyzes}. One focused fix here moves the needle more than anything else.`,
      type: 'weakness',
    });
  }

  // Score trend
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

  // Mid-range dimensions — quick wins
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

  // Consistency note if scores vary widely
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

// ─── Components ──────────────────────────────────────────────────────────────

function VideoLibraryCard({ entry, index }: { entry: HistoryEntry; index: number }) {
  const { grade, color } = getLetterGrade(entry.overallScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.35, ease: 'easeOut' }}
    >
      <Link href={`/roast/${entry.id}`} className="block group">
        <GlassCard
          variant="interactive"
          className="p-4 flex items-center gap-4 hover:border-orange-500/30 transition-all duration-200 relative overflow-hidden"
        >
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-orange-500/5 to-transparent" />
          <ScoreRing score={entry.overallScore} size={48} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-200 leading-snug truncate">
              {truncateTitle(entry)}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <span>{getRelativeDate(entry.date)}</span>
              <span>·</span>
              <span>{entry.source === 'upload' ? '📎 Upload' : '🔗 URL'}</span>
            </div>
            {/* Key findings preview */}
            {entry.findings && Object.values(entry.findings).flat().length > 0 && (
              <p className="mt-1.5 text-xs text-zinc-500 line-clamp-1">
                {Object.values(entry.findings).flat()[0]}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-xl font-black ${color}`}>{grade}</span>
            <span className={`text-xs font-bold ${scoreColor(entry.overallScore)}`}>
              {entry.overallScore}
            </span>
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
            <p className="text-sm font-medium text-zinc-200 truncate">{truncateTitle(entry)}</p>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.4 }}
    >
      <GlassCard className={`p-5 border ${borderColor} ${bgColor}`}>
        <div className="flex items-start gap-4">
          <span className="text-2xl shrink-0">{item.emoji}</span>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">{item.title}</h3>
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
    <div className="space-y-3">
      {dimAvgs.map(({ agent, avg }, i) => (
        <motion.div
          key={agent.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 + i * 0.04 }}
          className="flex items-center gap-3"
        >
          <span className="text-base w-6 shrink-0">{agent.emoji}</span>
          <span className="text-xs text-zinc-400 w-24 shrink-0 truncate">{agent.name.replace(' Agent', '')}</span>
          <div className="flex-1 h-2 rounded-full bg-zinc-800/60 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${avg >= 70 ? 'bg-green-500' : avg >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
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

  const tabs = [
    { id: 'library' as const, label: '📚 My Videos', count: totalRoasts },
    { id: 'rankings' as const, label: '🏆 Rankings', count: null },
    { id: 'playbook' as const, label: '🧠 AI Playbook', count: null },
  ];

  return (
    <main className="min-h-screen px-4 py-10 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-b from-orange-500/8 via-pink-500/4 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
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

        {/* Stats strip */}
        {!loading && totalRoasts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {[
              { label: 'Videos Roasted', value: totalRoasts, suffix: '' },
              { label: 'Avg Score', value: avgScore, suffix: '/100' },
              { label: 'Best Score', value: bestScore, suffix: '/100' },
            ].map((stat, i) => (
              <GlassCard key={stat.label} className="p-4 text-center">
                <div className={`text-2xl font-black ${i > 0 ? scoreColor(stat.value as number) : 'text-white'}`}>
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
              </GlassCard>
            ))}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl border border-white/5 bg-white/[0.03] p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="text-[10px] bg-orange-500/20 text-orange-400 rounded-full px-1.5 py-0.5 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <LoadingSkeleton key={i} variant="card" height="h-20" />)}
          </div>
        ) : totalRoasts === 0 ? (
          <EmptyState
            icon="📭"
            title="No roasts yet"
            description="Roast your first TikTok and come back to see your personal library, rankings, and AI playbook."
            cta={{ label: 'Roast a TikTok', href: '/dashboard' }}
          />
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* ─── Library tab ─── */}
            {activeTab === 'library' && (
              <div className="space-y-3">
                {history.map((entry, i) => (
                  <VideoLibraryCard key={entry.id} entry={entry} index={i} />
                ))}
              </div>
            )}

            {/* ─── Rankings tab ─── */}
            {activeTab === 'rankings' && (
              <div className="space-y-4">
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

                {history.length >= 3 && (
                  <div className="mt-8">
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                      Dimension Averages
                    </h2>
                    <GlassCard className="p-5">
                      <DimensionBreakdown entries={history} />
                    </GlassCard>
                  </div>
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
                  <GlassCard className="p-5 mt-2">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Your Average by Dimension</h3>
                    <DimensionBreakdown entries={history} />
                  </GlassCard>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
