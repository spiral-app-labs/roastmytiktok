'use client';

import type { ViewProjection as ViewProjectionType } from '@/lib/types';

interface Props {
  projection: ViewProjectionType;
}

export function ViewProjection({ projection }: Props) {
  return (
    <div className="inline-flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm px-5 py-3 mt-4 mb-2">
      {/* Current reach */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-0.5">Now</p>
        <p className="text-base font-bold text-zinc-300">{projection.currentExpected}</p>
      </div>

      {/* Arrow with multiplier */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-zinc-600 text-lg">&rarr;</span>
        <span className="text-[10px] font-bold text-orange-400">{projection.multiplier}</span>
      </div>

      {/* Improved reach */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-0.5">After Fixes</p>
        <p className="text-base font-bold text-emerald-400">{projection.improvedExpected}</p>
      </div>
    </div>
  );
}
