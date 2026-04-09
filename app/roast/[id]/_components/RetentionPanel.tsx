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
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.25 }}
      className="mt-8 sm:mt-10"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Retention · where viewers drop
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-5 sm:px-6 sm:py-6">
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
