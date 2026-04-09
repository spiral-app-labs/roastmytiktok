'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HistoryEntry } from '@/lib/history';
import { DimensionKey } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import {
  TIER_BENCHMARKS,
  getAvgScore,
  getNextTier,
  getUserTier,
} from './helpers';

interface BenchmarkBarsProps {
  entries: HistoryEntry[];
}

interface BenchmarkRow {
  agent: (typeof AGENTS)[number];
  userAvg: number;
  target: number;
  pct: number;
}

export default function BenchmarkBars({ entries }: BenchmarkBarsProps) {
  const shouldReduceMotion = useReducedMotion();

  const avg = getAvgScore(entries);
  const tier = getUserTier(avg);
  const nextTier = getNextTier(avg);
  const targetLabel = nextTier ?? tier;
  const targetTable = nextTier ? TIER_BENCHMARKS[nextTier] : TIER_BENCHMARKS[tier];

  const rows = useMemo<BenchmarkRow[]>(() => {
    const totals: Partial<Record<DimensionKey, number[]>> = {};
    for (const e of entries) {
      for (const [dim, score] of Object.entries(e.agentScores)) {
        const key = dim as DimensionKey;
        if (!totals[key]) totals[key] = [];
        totals[key]!.push(score as number);
      }
    }
    return AGENTS.map((agent) => {
      const arr = totals[agent.key] ?? [];
      const userAvg = arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : 0;
      const target = targetTable[agent.key];
      const pct = target > 0 ? Math.round((userAvg / target) * 100) : 0;
      return { agent, userAvg, target, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [entries, targetTable]);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/6 bg-zinc-900/40 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-white">
            Benchmark progress
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            You vs {targetLabel} target
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map(({ agent, userAvg, target, pct }, i) => {
          const fillPct = Math.min(100, Math.max(0, userAvg));
          const tone =
            pct >= 100
              ? 'from-emerald-500 to-emerald-400'
              : pct >= 80
              ? 'from-amber-400 to-orange-400'
              : 'from-orange-500 to-pink-500';
          const delta = userAvg - target;

          return (
            <div key={agent.key}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">{agent.emoji}</span>
                  <span className="font-medium text-zinc-300">
                    {agent.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-zinc-100 font-semibold">{userAvg}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-500">{target}</span>
                </div>
              </div>

              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="absolute top-0 bottom-0 w-px bg-zinc-400/40 z-10"
                  style={{ left: `${Math.min(100, target)}%` }}
                />
                <motion.div
                  className={['h-full rounded-full bg-gradient-to-r', tone].join(' ')}
                  initial={shouldReduceMotion ? false : { width: 0 }}
                  animate={{ width: `${fillPct}%` }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : 0.1 + i * 0.04,
                    duration: 0.6,
                    ease: 'easeOut',
                  }}
                />
              </div>

              <div className="mt-1 font-mono text-[10px] tabular-nums text-zinc-500">
                {delta >= 0 ? `+${delta}` : delta} vs target
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
