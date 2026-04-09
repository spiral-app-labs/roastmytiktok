'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ActionPlanStep } from '@/lib/types';
import type { ViewImpact } from '@/lib/view-count-tiers';
import { AGENTS } from '@/lib/agents';

interface InsightRowProps {
  step: ActionPlanStep;
  index: number;
  timestampLabel?: string;
  isHighestImpact?: boolean;
  viewImpact?: ViewImpact;
}

const PRIORITY_STYLE: Record<
  ActionPlanStep['priority'],
  { text: string; bg: string; border: string }
> = {
  P1: {
    text: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/35',
  },
  P2: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/35',
  },
  P3: {
    text: 'text-zinc-400',
    bg: 'bg-white/[0.05]',
    border: 'border-white/15',
  },
};

export default function InsightRow({
  step,
  index,
  timestampLabel,
  isHighestImpact = false,
  viewImpact,
}: InsightRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const agentDef = AGENTS.find((a) => a.key === step.dimension);
  const priorityStyle = PRIORITY_STYLE[step.priority] ?? PRIORITY_STYLE.P2;
  const numeral = (index + 1).toString().padStart(2, '0');
  // Cap stagger at the 4th item — beyond that the page feels slow.
  const delay = shouldReduceMotion ? 0 : Math.min(index, 4) * 0.08;

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={[
        'relative grid grid-cols-[auto_1fr] gap-5 sm:gap-8',
        'rounded-2xl border border-white/[0.08] bg-white/[0.012] px-5 py-6 sm:px-7 sm:py-7',
        'backdrop-blur-sm',
        isHighestImpact ? 'border-l-2 border-l-orange-400/70' : '',
      ].join(' ')}
    >
      {/* Left gutter: big mono numeral */}
      <div className="flex flex-col items-start gap-2">
        <span className="font-mono tabular-nums text-4xl sm:text-5xl font-bold leading-none text-zinc-700">
          {numeral}
        </span>
      </div>

      {/* Right: content */}
      <div className="min-w-0">
        {/* Top row: dimension + timestamp + priority */}
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            <span aria-hidden className="text-sm leading-none">
              {agentDef?.emoji ?? '•'}
            </span>
            {agentDef?.displayName ?? step.dimension}
          </span>
          {timestampLabel && (
            <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-300">
              {timestampLabel}
            </span>
          )}
          <span
            className={[
              'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]',
              priorityStyle.border,
              priorityStyle.bg,
              priorityStyle.text,
            ].join(' ')}
          >
            {step.priority}
          </span>
          {isHighestImpact && (
            <span className="inline-flex items-center rounded-full border border-orange-400/40 bg-orange-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-orange-300">
              Start here
            </span>
          )}
        </div>

        {/* Title: the issue as a display headline */}
        <h3 className="font-display text-lg font-semibold leading-snug text-white sm:text-xl">
          {step.issue}
        </h3>

        {/* Two-col body */}
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              The fix
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{step.doThis}</p>
          </div>
          {step.example && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Example
              </div>
              <p className="mt-2 font-mono text-xs italic leading-relaxed text-zinc-400">
                &ldquo;{step.example}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer: whyItMatters + viewImpact */}
        {(step.whyItMatters || viewImpact) && (
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-white/[0.06] pt-4">
            {step.whyItMatters ? (
              <p className="max-w-lg text-xs leading-relaxed text-zinc-500">
                {step.whyItMatters}
              </p>
            ) : (
              <span />
            )}
            {viewImpact && (
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em]',
                  viewImpact.isHookJump
                    ? 'border-orange-400/40 bg-gradient-to-r from-orange-500/15 to-pink-500/15 text-orange-200'
                    : 'border-white/10 bg-white/[0.04] text-zinc-300',
                ].join(' ')}
              >
                {viewImpact.before}
                <span className="opacity-60">→</span>
                {viewImpact.after}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
