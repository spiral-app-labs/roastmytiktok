'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AGENTS } from '@/lib/agents';
import { HistoryEntry, getChronicIssues } from '@/lib/history';
import { DimensionKey } from '@/lib/types';

interface TipsViewProps {
  history: HistoryEntry[];
}

const DIM_COLORS: Record<DimensionKey, string> = {
  hook: '#ff6b35',
  visual: '#a78bfa',
  caption: '#38bdf8',
  audio: '#34d399',
  algorithm: '#fbbf24',
  authenticity: '#f472b6',
};

interface Tip {
  id: string;
  dimension: DimensionKey;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  type: 'chronic' | 'improvement' | 'strength';
}

export default function TipsView({ history }: TipsViewProps) {
  const chronicIssues = useMemo(() => getChronicIssues(history), [history]);

  const tips = useMemo((): Tip[] => {
    if (history.length === 0) return [];

    const result: Tip[] = [];

    // Chronic issues → high priority tips
    for (const issue of chronicIssues.slice(0, 5)) {
      const agent = AGENTS.find((a) => a.key === issue.dimension);
      result.push({
        id: `chronic-${issue.dimension}-${issue.finding.slice(0, 20)}`,
        dimension: issue.dimension,
        title: `${agent?.emoji} ${agent?.name}: Recurring Issue`,
        body: issue.finding,
        priority: issue.occurrences >= 3 ? 'high' : 'medium',
        type: 'chronic',
      });
    }

    // Dimension-level analysis
    const dimKeys: DimensionKey[] = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity'];
    const dimAvgs: Record<string, number> = {};
    for (const dim of dimKeys) {
      const scores = history.map((h) => h.agentScores[dim]).filter(Boolean);
      dimAvgs[dim] = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    }

    // Weak dimensions
    const sortedDims = Object.entries(dimAvgs).sort(([, a], [, b]) => a - b);
    for (const [dim, avg] of sortedDims.slice(0, 2)) {
      if (avg < 70) {
        const agent = AGENTS.find((a) => a.key === dim);
        const latestScore = history[0]?.agentScores[dim as DimensionKey];
        result.push({
          id: `weak-${dim}`,
          dimension: dim as DimensionKey,
          title: `${agent?.emoji} Improve Your ${agent?.name} Score`,
          body: `Your average ${agent?.name} score is ${avg}/100${latestScore ? ` (latest: ${latestScore})` : ''}. Focus on: ${agent?.analyzes}`,
          priority: avg < 50 ? 'high' : 'medium',
          type: 'improvement',
        });
      }
    }

    // Strong dimensions — celebrate
    for (const [dim, avg] of sortedDims.slice(-2).reverse()) {
      if (avg >= 70) {
        const agent = AGENTS.find((a) => a.key === dim);
        result.push({
          id: `strong-${dim}`,
          dimension: dim as DimensionKey,
          title: `${agent?.emoji} ${agent?.name} Is a Strength`,
          body: `Your average score of ${avg}/100 shows you're doing well here. Keep it up!`,
          priority: 'low',
          type: 'strength',
        });
      }
    }

    // Trend-based tips
    if (history.length >= 3) {
      for (const dim of dimKeys) {
        const recent3 = history.slice(0, 3).map((h) => h.agentScores[dim]);
        const isDecline = recent3.every((s, i) => i === 0 || s <= recent3[i - 1]);
        if (isDecline && recent3[0] < recent3[2]) {
          const agent = AGENTS.find((a) => a.key === dim);
          const drop = recent3[2] - recent3[0];
          if (drop >= 5 && !result.find((t) => t.id === `weak-${dim}`)) {
            result.push({
              id: `decline-${dim}`,
              dimension: dim,
              title: `${agent?.emoji} ${agent?.name} Score Declining`,
              body: `Your ${agent?.name} score dropped ${drop} points over your last 3 videos. Review what changed.`,
              priority: 'medium',
              type: 'improvement',
            });
          }
        }
      }
    }

    return result;
  }, [history, chronicIssues]);

  // Bar chart: avg score per dimension
  const barData = useMemo(() => {
    if (history.length === 0) return [];
    const dimKeys: DimensionKey[] = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity'];
    return dimKeys.map((dim) => {
      const scores = history.map((h) => h.agentScores[dim]).filter(Boolean);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const agent = AGENTS.find((a) => a.key === dim);
      return { name: agent?.name || dim, avg, dim, emoji: agent?.emoji };
    });
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No tips yet</h3>
        <p className="text-sm text-zinc-500">Analyze some videos to get personalized tips.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Personalized Tips</h2>
        <p className="text-sm text-zinc-500 mt-1">Based on your {history.length} analyzed video{history.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Dimension Averages Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4">Your Average Scores</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
              {barData.map((entry) => (
                <Cell key={entry.dim} fill={DIM_COLORS[entry.dim as DimensionKey]} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Tips List */}
      <div className="space-y-3">
        {tips.map((tip, i) => (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className={`bg-zinc-900/60 border rounded-xl p-5 ${
              tip.type === 'chronic'
                ? 'border-red-500/20'
                : tip.type === 'strength'
                ? 'border-green-500/20'
                : 'border-zinc-800/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  tip.priority === 'high' ? 'bg-red-400' : tip.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-white">{tip.title}</h4>
                  {tip.type === 'chronic' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                      RECURRING
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
