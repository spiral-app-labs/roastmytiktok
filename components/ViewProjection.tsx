'use client';

import type { ViewProjection as ViewProjectionType } from '@/lib/types';

interface Props {
  projection: ViewProjectionType;
}

export function ViewProjection({ projection }: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 to-zinc-950/70 px-6 py-7 sm:px-10 sm:py-8 backdrop-blur-sm shadow-[0_20px_60px_-25px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.02)_inset]">
      {/* Subtle top hairline */}
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
      <div className="flex items-center justify-between gap-3 sm:gap-6">
        {/* If posted today */}
        <div className="flex-1 text-center">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-zinc-500 mb-2">
            If posted today
          </p>
          <p className="text-3xl sm:text-5xl font-bold text-zinc-200 tabular-nums leading-none">
            {projection.currentExpected}
          </p>
          <p className="text-[10px] sm:text-xs text-zinc-600 mt-2">expected views</p>
        </div>

        {/* Arrow + multiplier */}
        <div className="flex flex-col items-center gap-2 px-1 sm:px-3">
          <span className="text-xs font-semibold text-orange-400 bg-orange-500/10 ring-1 ring-orange-500/20 rounded-full px-2.5 py-1 tabular-nums">
            {projection.multiplier}
          </span>
          <svg width="28" height="10" viewBox="0 0 28 10" className="text-zinc-600">
            <path d="M0 5 L24 5 M19 1 L24 5 L19 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* With the fixes */}
        <div className="flex-1 text-center">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-emerald-500/80 mb-2">
            With the fixes
          </p>
          <p className="text-3xl sm:text-5xl font-bold text-emerald-400 tabular-nums leading-none">
            {projection.improvedExpected}
          </p>
          <p className="text-[10px] sm:text-xs text-zinc-600 mt-2">expected views</p>
        </div>
      </div>
    </div>
  );
}
