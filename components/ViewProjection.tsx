'use client';

import type { ViewProjection as ViewProjectionType } from '@/lib/types';

interface Props {
  projection: ViewProjectionType;
}

export function ViewProjection({ projection }: Props) {
  const confidenceColor = {
    high: 'text-emerald-400',
    medium: 'text-yellow-400',
    low: 'text-zinc-500',
  }[projection.confidence];

  return (
    <div className="mt-4 mb-2">
      <p className="text-sm text-zinc-300">
        <span className="text-zinc-500">Expected reach:</span>{' '}
        <span className="font-bold text-zinc-200">{projection.currentExpected}</span>
        <span className="text-zinc-500 mx-2">&rarr;</span>
        <span className="font-bold text-emerald-400">{projection.improvedExpected}</span>
        <span className="text-zinc-500 ml-1">after fixes</span>
      </p>
      <p className={`text-[10px] mt-1 ${confidenceColor}`}>
        {projection.confidence === 'high' ? 'High confidence' : projection.confidence === 'medium' ? 'Medium confidence' : 'Rough estimate'} &middot; Based on {projection.basedOn}
      </p>
    </div>
  );
}
