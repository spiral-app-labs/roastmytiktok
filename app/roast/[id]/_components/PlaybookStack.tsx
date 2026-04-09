'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ActionPlanStep, RoastResult } from '@/lib/types';
import { getFixViewImpact } from '@/lib/view-count-tiers';
import InsightRow from './InsightRow';
import { formatTimestamp } from './helpers';

interface PlaybookStackProps {
  steps: ActionPlanStep[];
  overallScore: RoastResult['overallScore'];
}

export default function PlaybookStack({ steps, overallScore }: PlaybookStackProps) {
  const shouldReduceMotion = useReducedMotion();

  const count = steps.length;

  return (
    <motion.section
      aria-label="Fixes"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.2 }}
      className="mt-8 sm:mt-10"
    >
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Fixes {count > 0 && <span className="text-zinc-700">· {count}</span>}
        </div>
      </div>

      {count === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-5 py-6 text-center">
          <p className="text-[13px] leading-relaxed text-zinc-500">
            No specific recommendations. Try uploading again for a more detailed breakdown.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {steps.map((step, idx) => {
            const viewImpact = getFixViewImpact(overallScore, step.dimension, step.priority);
            return (
              <InsightRow
                key={`${step.priority}-${step.dimension}-${idx}`}
                step={step}
                index={idx}
                timestampLabel={formatTimestamp(step)}
                viewImpact={viewImpact}
              />
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
