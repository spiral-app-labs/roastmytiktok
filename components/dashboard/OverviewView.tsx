'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import { HistoryEntry } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import { DimensionKey } from '@/lib/types';
import { DashboardTab } from './Sidebar';

interface OverviewViewProps {
  history: HistoryEntry[];
  onNavigate: (tab: DashboardTab) => void;
}

function StatCard({ label, value, subtitle, color, delay }: { label: string; value: string | number; subtitle?: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
    >
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : score >= 40 ? 'text-orange-400' : 'text-red-400';
  return <span className={`text-lg font-bold ${color}`}>{score}</span>;
}

export default function OverviewView({ history, onNavigate }: OverviewViewProps) {
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    const latest = history[0];
    const scores = history.map((h) => h.overallScore);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Trend: compare latest 3 vs previous 3
    let trend = 0;
    if (history.length >= 4) {
      const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const older = scores.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(3, scores.slice(3, 6).length);
      trend = Math.round(recent - older);
    }

    // Best dimension
    const dimAvgs: Record<string, number> = {};
    const dimKeys: DimensionKey[] = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity'];
    for (const dim of dimKeys) {
      const dimScores = history.map((h) => h.agentScores[dim]).filter(Boolean);
      dimAvgs[dim] = dimScores.length ? Math.round(dimScores.reduce((a, b) => a + b, 0) / dimScores.length) : 0;
    }
    const bestDim = Object.entries(dimAvgs).sort(([, a], [, b]) => b - a)[0];
    const worstDim = Object.entries(dimAvgs).sort(([, a], [, b]) => a - b)[0];

    return { latest, avg, trend, bestDim, worstDim, dimAvgs };
  }, [history]);

  // Chart data: score over time (reversed so oldest first)
  const chartData = useMemo(() => {
    return history
      .slice(0, 20)
      .reverse()
      .map((h, i) => ({
        name: `#${i + 1}`,
        score: h.overallScore,
        date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
  }, [history]);

  // Radar data for latest roast
  const radarData = useMemo(() => {
    if (!history.length) return [];
    const latest = history[0];
    return AGENTS.map((a) => ({
      dimension: a.name.replace(/([A-Z])/g, ' $1').trim(),
      score: latest.agentScores[a.key] || 0,
      fullMark: 100,
    }));
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-20 h-20 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No roasts yet</h3>
        <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
          Upload your first TikTok video to get started. Our AI agents will analyze every aspect of your content.
        </p>
        <button
          onClick={() => onNavigate('upload')}
          className="fire-gradient text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          Upload Your First Video
        </button>
      </div>
    );
  }

  const trendArrow = stats!.trend > 0 ? '+' : '';
  const trendColor = stats!.trend > 0 ? 'text-green-400' : stats!.trend < 0 ? 'text-red-400' : 'text-zinc-400';

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Latest Score" value={stats!.latest.overallScore} subtitle={stats!.latest.filename || 'Latest video'} color="text-white" delay={0} />
        <StatCard label="Average Score" value={stats!.avg} subtitle={`Across ${history.length} videos`} color="text-zinc-300" delay={0.05} />
        <StatCard
          label="Trend"
          value={`${trendArrow}${stats!.trend}`}
          subtitle={stats!.trend > 0 ? 'Improving' : stats!.trend < 0 ? 'Declining' : 'Stable'}
          color={trendColor}
          delay={0.1}
        />
        <StatCard
          label="Videos Analyzed"
          value={history.length}
          subtitle="Total roasts"
          color="text-zinc-300"
          delay={0.15}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Score Trend</h3>
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b35" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ff6b35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Area type="monotone" dataKey="score" stroke="#ff6b35" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: '#ff6b35', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#ff6b35' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">
              Upload more videos to see your trend
            </div>
          )}
        </motion.div>

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Latest Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#71717a' }} />
              <Radar dataKey="score" stroke="#f72585" fill="#f72585" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#f72585', r: 3 }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-3">Strongest Area</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <span>{AGENTS.find((a) => a.key === stats!.bestDim[0])?.emoji}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{AGENTS.find((a) => a.key === stats!.bestDim[0])?.name}</p>
              <p className="text-xs text-zinc-500">Avg score: <ScoreBadge score={stats!.bestDim[1] as number} /></p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-3">Needs Work</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <span>{AGENTS.find((a) => a.key === stats!.worstDim[0])?.emoji}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{AGENTS.find((a) => a.key === stats!.worstDim[0])?.name}</p>
              <p className="text-xs text-zinc-500">Avg score: <ScoreBadge score={stats!.worstDim[1] as number} /></p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          <button onClick={() => onNavigate('history')} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
            View all
          </button>
        </div>
        <div className="space-y-2">
          {history.slice(0, 4).map((entry, i) => {
            const prevEntry = history[i + 1];
            const scoreDiff = prevEntry ? entry.overallScore - prevEntry.overallScore : 0;
            return (
              <a
                key={entry.id}
                href={`/roast/${entry.id}`}
                className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 text-sm font-bold text-zinc-400 group-hover:border-orange-500/30 transition-colors">
                  {entry.overallScore}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 font-medium truncate">{entry.filename || 'Uploaded video'}</p>
                  <p className="text-xs text-zinc-600">
                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {scoreDiff !== 0 && (
                  <span className={`text-xs font-semibold ${scoreDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">
                  <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
