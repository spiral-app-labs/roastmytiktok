'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ActionPlanStep } from '@/lib/types';
import type { ViewImpact } from '@/lib/view-count-tiers';

interface InsightRowProps {
  step: ActionPlanStep;
  index: number;
  timestampLabel?: string;
  viewImpact?: ViewImpact;
}

const PRIORITY_DOT: Record<ActionPlanStep['priority'], string> = {
  P1: 'bg-rose-400',
  P2: 'bg-amber-400',
  P3: 'bg-zinc-500',
};

const PRIORITY_LABEL: Record<ActionPlanStep['priority'], string> = {
  P1: 'Critical',
  P2: 'Important',
  P3: 'Minor',
};

export default function InsightRow({
  step,
  index,
  timestampLabel,
  viewImpact,
}: InsightRowProps) {
  const shouldReduceMotion = useReducedMotion();
  // Cap stagger past the 5th item — avoid slow reveal.
  const delay = shouldReduceMotion ? 0 : Math.min(index, 5) * 0.05;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.03] sm:px-5 sm:py-4"
    >
      {/* Priority dot */}
      <div
        aria-label={PRIORITY_LABEL[step.priority]}
        className="relative mt-1.5 flex h-2 w-2 flex-none items-center justify-center"
      >
        <span className={['h-2 w-2 rounded-full', PRIORITY_DOT[step.priority]].join(' ')} />
        <span
          aria-hidden
          className={[
            'absolute h-4 w-4 rounded-full opacity-40 blur-sm',
            PRIORITY_DOT[step.priority],
          ].join(' ')}
        />
      </div>

      {/* Main text — the fix, clamped to 2 lines */}
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] leading-snug text-zinc-100 sm:text-[13.5px]"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {step.doThis}
        </p>
        {timestampLabel && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
            at {timestampLabel}
          </div>
        )}
      </div>

      {/* Views delta chip */}
      {viewImpact && (
        <div
          className={[
            'flex-none rounded-full border px-2.5 py-1 font-mono text-[10px] tabular-nums whitespace-nowrap',
            viewImpact.isHookJump
              ? 'border-orange-400/30 bg-orange-500/10 text-orange-200'
              : 'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300/90',
          ].join(' ')}
        >
          {viewImpact.before}
          <span className="mx-1 opacity-60">→</span>
          {viewImpact.after}
        </div>
      )}
    </motion.div>
  );
}
