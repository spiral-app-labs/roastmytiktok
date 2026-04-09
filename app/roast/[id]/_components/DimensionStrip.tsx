'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { AgentRoast, DimensionKey } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import { scoreToTone } from '@/components/ScoreChip';
import { isAgentFailed } from './helpers';

interface DimensionStripProps {
  agents: AgentRoast[];
}

export default function DimensionStrip({ agents }: DimensionStripProps) {
  const shouldReduceMotion = useReducedMotion();

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
      transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
      className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 sm:p-5"
    >
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        By dimension
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        {rows.map((row, i) => {
          const tone = row.failed ? null : scoreToTone(row.score);
          return (
            <motion.div
              key={row.key}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: row.failed ? 0.35 : 1 }}
              transition={{
                delay: shouldReduceMotion ? 0 : 0.12 + i * 0.03,
                duration: 0.25,
              }}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-sm leading-none" aria-hidden>
                  {row.emoji}
                </span>
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  {row.displayName}
                </span>
              </div>
              {row.failed ? (
                <span className="font-mono text-[11px] tabular-nums text-zinc-600">—</span>
              ) : (
                <span
                  className={[
                    'font-mono text-[12px] tabular-nums font-semibold tabular-nums',
                    tone?.text ?? 'text-zinc-300',
                  ].join(' ')}
                >
                  {row.score}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
