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
  const headline =
    count === 0
      ? 'No specific recommendations'
      : count === 1
      ? '1 fix that moves the needle'
      : `${count} fixes that move the needle`;

  return (
    <motion.section
      aria-label="The playbook"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.35 }}
      className="mt-14 sm:mt-20"
    >
      {/* Section header */}
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            The playbook
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
            {headline}
          </h2>
        </div>
        <div className="mb-1 hidden h-px flex-1 translate-y-1 bg-gradient-to-r from-white/[0.12] to-transparent sm:block" />
      </div>

      {count === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] px-6 py-8 text-center">
          <p className="text-sm leading-relaxed text-zinc-400">
            We couldn&apos;t generate specific recommendations for this video. Try uploading
            again for a more detailed breakdown.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {steps.map((step, idx) => {
            const isFirstHook = idx === 0 && step.dimension === 'hook';
            const viewImpact = getFixViewImpact(overallScore, step.dimension, step.priority);
            return (
              <InsightRow
                key={`${step.priority}-${step.dimension}-${idx}`}
                step={step}
                index={idx}
                timestampLabel={formatTimestamp(step)}
                isHighestImpact={isFirstHook}
                viewImpact={viewImpact}
              />
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
