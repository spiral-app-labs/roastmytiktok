'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface PartialResultsNoticeProps {
  failedCount: number;
}

export default function PartialResultsNotice({ failedCount }: PartialResultsNoticeProps) {
  const shouldReduceMotion = useReducedMotion();
  const plural = failedCount === 1 ? '' : 's';

  return (
    <motion.div
      role="alert"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-8 flex items-start gap-4 rounded-2xl border border-amber-400/25 bg-amber-500/[0.04] px-5 py-4 backdrop-blur-sm"
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10">
        <svg
          aria-hidden
          className="h-3 w-3 text-amber-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75M12 18h.008M10.697 3.378a1.5 1.5 0 0 1 2.606 0l9.302 16.126c.577 1-.144 2.246-1.302 2.246H2.697c-1.159 0-1.879-1.246-1.302-2.246L10.697 3.378z"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
          Partial results
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">
          {failedCount} of 6 dimension{plural}
          {' '}couldn&apos;t be analyzed (API overload). Scores and fixes reflect only the
          completed dimensions — try again for a full breakdown.
        </p>
      </div>
    </motion.div>
  );
}
