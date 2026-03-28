'use client';

import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { MonitorEntry, getScoreTrend, getLetterGrade, getScoreColor, ScoreTrend } from '@/lib/monitoring';
import { ScoreRing } from './ScoreRing';

interface MonitorCardProps {
  monitor: MonitorEntry;
  index: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const trendConfig: Record<ScoreTrend, { arrow: string; label: string; color: string }> = {
  improving: { arrow: '↑', label: 'Improving', color: '#4ade80' },
  declining: { arrow: '↓', label: 'Declining', color: '#f87171' },
  stable:    { arrow: '→', label: 'Stable',    color: '#a1a1aa' },
};

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export function MonitorCard({ monitor, index, onToggle, onRemove }: MonitorCardProps) {
  const trend = getScoreTrend(monitor);
  const { arrow, label, color: trendColor } = trendConfig[trend];
  const scoreColor = getScoreColor(monitor.lastScore);
  const grade = getLetterGrade(monitor.lastScore);

  const delta = monitor.previousScore !== null
    ? monitor.lastScore - monitor.previousScore
    : null;

  const chartData = monitor.scoreHistory.map((score, i) => ({ index: i, score }));

  const lastRun = new Date(monitor.lastRunAt);
  const timeAgo = getRelativeTime(lastRun);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`bg-zinc-900/60 border rounded-2xl p-5 transition-all ${
        monitor.isActive
          ? 'border-zinc-800 hover:border-zinc-700'
          : 'border-zinc-800/50 opacity-50'
      }`}
    >
      {/* Top row: filename + controls */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {monitor.filename}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Last run {timeAgo}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
            {frequencyLabels[monitor.frequency]}
          </span>
          <button
            onClick={() => onToggle(monitor.id)}
            className={`w-9 h-5 rounded-full transition-colors relative ${
              monitor.isActive ? 'bg-orange-500' : 'bg-zinc-700'
            }`}
            title={monitor.isActive ? 'Pause monitoring' : 'Resume monitoring'}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                monitor.isActive ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Score + trend row */}
      <div className="flex items-center gap-4 mb-4">
        <ScoreRing score={monitor.lastScore} size={56} />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black" style={{ color: scoreColor }}>
              {grade}
            </span>
            {delta !== null && (
              <span
                className="text-sm font-bold"
                style={{ color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#a1a1aa' }}
              >
                {delta > 0 ? '+' : ''}{delta}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-lg" style={{ color: trendColor }}>{arrow}</span>
            <span className="text-xs font-medium" style={{ color: trendColor }}>{label}</span>
          </div>
        </div>

        {/* Mini sparkline */}
        {monitor.scoreHistory.length >= 2 && (
          <div className="w-24 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <defs>
                  <linearGradient id={`spark-${monitor.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={scoreColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={scoreColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={scoreColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${monitor.id})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Score history dots */}
      {monitor.scoreHistory.length > 1 && (
        <div className="flex items-center gap-1 mb-3">
          {monitor.scoreHistory.slice(-8).map((s, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getScoreColor(s) }}
              title={`Score: ${s}`}
            />
          ))}
        </div>
      )}

      {/* Remove button */}
      <div className="flex justify-end">
        <button
          onClick={() => onRemove(monitor.id)}
          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>
    </motion.div>
  );
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
