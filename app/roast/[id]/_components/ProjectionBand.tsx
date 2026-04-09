'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ViewProjection } from '@/lib/types';

interface ProjectionBandProps {
  projection: ViewProjection;
}

export default function ProjectionBand({ projection }: ProjectionBandProps) {
  const shouldReduceMotion = useReducedMotion();

  const columns = [
    {
      label: 'Posted today',
      value: projection.currentExpected,
      tint: 'text-zinc-200',
    },
    {
      label: 'Multiplier',
      value: projection.multiplier || '—',
      tint: 'fire-text',
    },
    {
      label: 'With fixes',
      value: projection.improvedExpected,
      tint: 'text-emerald-300',
    },
  ];

  return (
    <motion.section
      aria-label="Projected views"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.25 }}
      className="mt-10 sm:mt-12"
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Projected reach
        </div>
        <div className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 sm:block">
          {projection.confidence} confidence
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.015] backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {columns.map((col, i) => (
          <motion.div
            key={col.label}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: shouldReduceMotion ? 0 : 0.3 + i * 0.05,
              duration: 0.35,
            }}
            className="flex flex-col items-start gap-3 px-6 py-6 sm:px-8 sm:py-7"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {col.label}
            </div>
            <div
              className={[
                'font-mono tabular-nums font-bold leading-none',
                'text-4xl sm:text-5xl',
                col.tint,
              ].join(' ')}
            >
              {col.value}
            </div>
          </motion.div>
        ))}
      </div>

      {projection.basedOn && (
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          Based on {projection.basedOn}
        </div>
      )}
    </motion.section>
  );
}
