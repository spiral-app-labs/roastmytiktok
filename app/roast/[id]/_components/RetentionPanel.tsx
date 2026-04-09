'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ActionPlanStep, RoastResult } from '@/lib/types';
import { RetentionCurve, type RetentionTimestamp } from '@/components/RetentionCurve';
import { formatTimestamp } from './helpers';

interface RetentionPanelProps {
  roast: RoastResult;
  steps: ActionPlanStep[];
}

export default function RetentionPanel({ roast, steps }: RetentionPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  // Hook score fallback chain: agent score → hookSummary → 50.
  const hookScore =
    roast.agents.find((a) => a.agent === 'hook')?.score ??
    roast.hookSummary?.score ??
    50;

  // metadata.duration fallback — some old records store 0.
  const videoDuration = roast.metadata.duration > 0 ? roast.metadata.duration : 30;

  // Cap to 5 timestamp markers.
  const timestamps: RetentionTimestamp[] = steps
    .filter((s) => typeof s.timestampSeconds === 'number')
    .slice(0, 5)
    .map((s) => ({
      seconds: s.timestampSeconds as number,
      label: formatTimestamp(s),
    }));

  return (
    <motion.section
      aria-label="Retention curve"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.4 }}
      className="mt-14 sm:mt-20"
    >
      {/* Section header */}
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Retention
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
            Where viewers drop off
          </h2>
        </div>
        <div className="mb-1 hidden h-px flex-1 translate-y-1 bg-gradient-to-r from-white/[0.12] to-transparent sm:block" />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] px-4 py-6 sm:px-8 sm:py-8 backdrop-blur-sm">
        <RetentionCurve
          hookScore={hookScore}
          overallScore={roast.overallScore}
          videoDurationSeconds={videoDuration}
          timestamps={timestamps}
        />
      </div>
    </motion.section>
  );
}
