'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { HistoryEntry } from '@/lib/history';
import RankingRow from './RankingRow';
import {
  TIER_BENCHMARKS,
  getAvgScore,
  getDimensionAverages,
  getNextTier,
  getUserTier,
} from './helpers';

const DimensionRadarChart = dynamic(
  () => import('@/components/charts/DimensionRadarChart'),
  { ssr: false }
);

interface RankingsSectionProps {
  entries: HistoryEntry[];
}

export default function RankingsSection({ entries }: RankingsSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  // Rank by score desc; rank by previous date order as "previous" position.
  const ranked = useMemo(
    () => [...entries].sort((a, b) => b.overallScore - a.overallScore),
    [entries]
  );

  // Previous ranking (sorted by date asc, most recent positions) — used to compute rank deltas
  const prevRanked = useMemo(() => {
    // Take all but the newest entry, rank by score to get "last time" ordering.
    const byDate = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const prior = byDate.slice(1);
    return [...prior].sort((a, b) => b.overallScore - a.overallScore);
  }, [entries]);

  const deltaFor = (id: string, currentIdx: number): number | null => {
    if (prevRanked.length === 0) return null;
    const prevIdx = prevRanked.findIndex((e) => e.id === id);
    if (prevIdx === -1) return null;
    // Positive = moved up (smaller index now than before)
    return prevIdx - currentIdx;
  };

  const avgScore = getAvgScore(entries);
  const tier = getUserTier(avgScore);
  const nextTier = getNextTier(avgScore);
  const benchmarks = TIER_BENCHMARKS[tier];
  const nextBenchmarks = nextTier ? TIER_BENCHMARKS[nextTier] : null;

  const radarData = useMemo(() => {
    const dims = getDimensionAverages(entries);
    return dims.map(({ agent, avg }) => ({
      dimension: agent.displayName,
      You: avg,
      [tier]: benchmarks[agent.key],
      ...(nextBenchmarks ? { [nextTier!]: nextBenchmarks[agent.key] } : {}),
    }));
  }, [entries, tier, nextTier, benchmarks, nextBenchmarks]);

  return (
    <div className="space-y-6">
      {/* Leaderboard */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/6 bg-zinc-900/40 overflow-hidden"
      >
        <div className="border-b border-white/6 px-5 py-4">
          <h3 className="font-display text-base font-semibold text-white">Leaderboard</h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Sorted by viral score • deltas compare to your previous ranking
          </p>
        </div>
        <div className="divide-y divide-white/5">
          {ranked.map((entry, i) => (
            <RankingRow
              key={entry.id}
              entry={entry}
              rank={i + 1}
              delta={deltaFor(entry.id, i)}
            />
          ))}
        </div>
      </motion.div>

      {/* Radar overview */}
      {entries.length >= 2 && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-2xl border border-white/6 bg-zinc-900/40 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Radar overview
              </h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                You vs tier averages
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                <span className="text-zinc-400">You</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
                <span className="text-zinc-500">{tier}</span>
              </span>
              {nextTier && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="text-zinc-500">{nextTier}</span>
                </span>
              )}
            </div>
          </div>
          <div className="-mx-2 mt-4 h-[300px]">
            <DimensionRadarChart chartData={radarData} tier={tier} nextTier={nextTier} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
