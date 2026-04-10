'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { RoastResult } from '@/lib/types';

interface FixTracksPanelProps {
  roast: RoastResult;
}

export default function FixTracksPanel({ roast }: FixTracksPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const fixTracks = roast.fixTracks;
  if (!fixTracks) return null;

  return (
    <motion.section
      aria-label="Hook fixes"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.15 }}
      className="mt-8 sm:mt-10"
    >
      <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        Fix the hook
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Edit without refilming
          </div>
          <div className="mt-4 space-y-3">
            {fixTracks.editOnly.length > 0 ? fixTracks.editOnly.map((fix, index) => (
              <div key={`${fix.do}-${index}`} className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{fix.do}</span>
                  <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-orange-300">
                    {fix.impact}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{fix.why}</p>
              </div>
            )) : (
              <p className="text-sm text-zinc-500">No edit-only fixes were generated for this hook.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Refilm the hook
          </div>
          <div className="mt-4 space-y-3">
            {fixTracks.reshoot.length > 0 ? fixTracks.reshoot.map((step, index) => (
              <div key={`${step.label}-${index}`} className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">{step.label}</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200">{step.detail}</p>
              </div>
            )) : (
              <p className="text-sm text-zinc-500">No reshoot plan was generated for this hook.</p>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
