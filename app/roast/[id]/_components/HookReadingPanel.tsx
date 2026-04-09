'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { RoastResult } from '@/lib/types';
import ScoreChip from '@/components/ScoreChip';

interface HookReadingPanelProps {
  roast: RoastResult;
}

export default function HookReadingPanel({ roast }: HookReadingPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const { hookSummary, firstFiveSecondsDiagnosis, hookIdentification } = roast;

  // Render nothing if none of the three source fields are available.
  if (!hookSummary && !firstFiveSecondsDiagnosis && !hookIdentification) {
    return null;
  }

  const title = hookSummary?.headline || firstFiveSecondsDiagnosis?.verdict || 'Hook read';
  const body = firstFiveSecondsDiagnosis?.hookRead;
  const dropWindow = firstFiveSecondsDiagnosis?.likelyDropWindow;
  const distributionRisk = hookSummary?.distributionRisk;
  const nextTimeFix = firstFiveSecondsDiagnosis?.nextTimeFix;

  const hasDropCol = Boolean(dropWindow || distributionRisk);
  const hasFixCol = Boolean(nextTimeFix);

  const hasWhatWeSaw = Boolean(
    hookIdentification?.textOnScreen ||
      hookIdentification?.spokenWords ||
      hookIdentification?.visualDescription,
  );

  return (
    <motion.section
      aria-label="Hook reading"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.3 }}
      className="mt-14 sm:mt-20"
    >
      {/* Section header */}
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            First 5 seconds
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              {title}
            </h2>
            {typeof hookSummary?.score === 'number' && (
              <ScoreChip score={hookSummary.score} size="sm" />
            )}
          </div>
        </div>
        <div className="mb-1 hidden h-px flex-1 translate-y-1 bg-gradient-to-r from-white/[0.12] to-transparent sm:block" />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] px-5 py-6 sm:px-8 sm:py-8 backdrop-blur-sm">
        {body && (
          <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{body}</p>
        )}

        {(hasDropCol || hasFixCol) && (
          <div className="mt-6 grid grid-cols-1 gap-6 border-t border-white/[0.06] pt-6 sm:grid-cols-2 sm:gap-10">
            {hasDropCol && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Drop window
                </div>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-300">
                  {dropWindow && <p>{dropWindow}</p>}
                  {distributionRisk && (
                    <p className="text-zinc-400">{distributionRisk}</p>
                  )}
                </div>
              </div>
            )}
            {hasFixCol && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Next time
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{nextTimeFix}</p>
              </div>
            )}
          </div>
        )}

        {hasWhatWeSaw && (
          <details className="group mt-6 border-t border-white/[0.06] pt-5">
            <summary
              className="flex cursor-pointer select-none items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-orange-300"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <svg
                aria-hidden
                className="h-3 w-3 transition-transform group-open:rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              What we saw
            </summary>
            <dl className="mt-4 space-y-3 text-sm leading-relaxed">
              {hookIdentification?.textOnScreen && (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Text on screen
                  </dt>
                  <dd className="mt-1 text-zinc-300">{hookIdentification.textOnScreen}</dd>
                </div>
              )}
              {hookIdentification?.spokenWords && (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Spoken
                  </dt>
                  <dd className="mt-1 text-zinc-300">{hookIdentification.spokenWords}</dd>
                </div>
              )}
              {hookIdentification?.visualDescription && (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Visual
                  </dt>
                  <dd className="mt-1 text-zinc-300">
                    {hookIdentification.visualDescription}
                  </dd>
                </div>
              )}
            </dl>
          </details>
        )}
      </div>
    </motion.section>
  );
}
