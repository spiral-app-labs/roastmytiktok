'use client';

import { AGENTS } from '@/lib/agents';
import type { ActionPlanStep, ViewProjection } from '@/lib/types';

interface Props {
  step: ActionPlanStep;
  timestampLabel: string;
  viewProjection?: ViewProjection;
}

export function RecommendationCard({ step, timestampLabel, viewProjection }: Props) {
  const agent = AGENTS.find(a => a.key === step.dimension);
  const priorityNum = parseInt(step.priority?.replace(/\D/g, '') || '3');

  const borderColor =
    priorityNum === 1 ? 'border-l-red-500' :
    priorityNum === 2 ? 'border-l-orange-400' :
    'border-l-zinc-600';

  return (
    <div className={`rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-5 border-l-[3px] ${borderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs font-semibold text-zinc-400">
          Recommendation
        </p>
        <p className="text-xs text-zinc-500 tabular-nums">{timestampLabel}</p>
      </div>

      {/* Problem */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-red-400 text-sm">&#x26A0;&#xFE0F;</span>
          <p className="text-xs font-bold uppercase tracking-widest text-red-400">Problem Detected:</p>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{step.issue}</p>
      </div>

      {/* Solution */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-emerald-400 text-sm">&#x2705;</span>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">What to Do:</p>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{step.doThis}</p>
        {step.example && (
          <p className="text-xs text-zinc-500 mt-1.5 italic">e.g. &ldquo;{step.example}&rdquo;</p>
        )}
      </div>

      {/* Expected impact */}
      {viewProjection && (
        <div className="rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 px-3 py-2">
          <p className="text-sm text-emerald-300 font-semibold">
            Expected change: {viewProjection.currentExpected} &rarr; {viewProjection.improvedExpected}
          </p>
        </div>
      )}
    </div>
  );
}
