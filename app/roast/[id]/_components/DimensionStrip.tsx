'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { AgentRoast, DimensionKey } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import ScoreChip from '@/components/ScoreChip';
import { isAgentFailed } from './helpers';

interface DimensionStripProps {
  agents: AgentRoast[];
}

export default function DimensionStrip({ agents }: DimensionStripProps) {
  const shouldReduceMotion = useReducedMotion();

  // Build a stable ordering keyed off AGENTS (source of truth for display)
  const rows = AGENTS.map((def) => {
    const match = agents.find((a) => a.agent === (def.key as DimensionKey));
    return {
      key: def.key,
      emoji: def.emoji,
      displayName: def.displayName,
      score: match?.score ?? 0,
      failed: match ? isAgentFailed(match) : true,
    };
  });

  return (
    <motion.section
      aria-label="Dimension scores"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.1 }}
      className="border-y border-white/[0.08] py-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 sm:gap-x-8">
        {rows.map((row, i) => (
          <motion.div
            key={row.key}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: row.failed ? 0.4 : 1, y: 0 }}
            transition={{
              delay: shouldReduceMotion ? 0 : 0.15 + i * 0.04,
              duration: 0.3,
            }}
            className="flex items-center gap-2.5"
          >
            <span className="text-lg leading-none" aria-hidden>
              {row.emoji}
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {row.displayName}
              </span>
              {row.failed ? (
                <span className="font-mono text-sm tabular-nums text-zinc-600">—</span>
              ) : (
                <ScoreChip score={row.score} size="sm" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
