'use client';

import { AGENTS } from '@/lib/agents';
import type { ActionPlanStep, ViewProjection } from '@/lib/types';
import type { ViewImpact } from '@/lib/view-count-tiers';

interface Props {
  step: ActionPlanStep;
  timestampLabel: string;
  viewProjection?: ViewProjection;
  isHighestImpact?: boolean;
  viewImpact?: ViewImpact;
}

export function IssueSolutionCard({ step, timestampLabel, viewProjection, isHighestImpact, viewImpact }: Props) {
  const agent = AGENTS.find(a => a.key === step.dimension);
  const priorityNum = parseInt(step.priority?.replace(/\D/g, '') || '3');

  const borderLeft =
    priorityNum === 1 ? 'border-l-red-500' :
    priorityNum === 2 ? 'border-l-yellow-500' :
    'border-l-zinc-600';

  const dotColor =
    priorityNum === 1 ? 'bg-red-500' :
    priorityNum === 2 ? 'bg-yellow-500' :
    'bg-zinc-600';

  return (
    <div className={`rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 border-l-[3px] ${borderLeft} space-y-3`}>
      {/* Highest Impact callout */}
      {isHighestImpact && (
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px flex-1 bg-orange-500/20" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Highest Impact</p>
          <div className="h-px flex-1 bg-orange-500/20" />
        </div>
      )}

      {/* Header row: dimension name + timestamp */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <p className="text-xs font-medium text-zinc-500">{agent?.displayName ?? step.dimension}</p>
        </div>
        {timestampLabel && (
          <p className="text-[11px] text-zinc-600 tabular-nums">{timestampLabel}</p>
        )}
      </div>

      {/* Issue text */}
      <p className="text-sm text-zinc-200 leading-relaxed">{step.issue}</p>

      {/* Solution box */}
      <div className="rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10 px-4 py-3">
        <p className="text-sm text-zinc-200 leading-relaxed">
          <span className="text-emerald-400 font-semibold">Fix: </span>
          {step.doThis}
        </p>
        {step.example && (
          <p className="text-xs text-zinc-500 mt-2 italic">&ldquo;{step.example}&rdquo;</p>
        )}
      </div>

      {/* Per-issue view impact */}
      {viewImpact && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-600">&rarr;</span>
          <span className={`font-semibold ${viewImpact.isHookJump ? 'text-orange-300' : 'text-emerald-300'}`}>
            {viewImpact.delta}
          </span>
        </div>
      )}

      {/* Overall projection (first hook card only, shown if no per-issue impact) */}
      {viewProjection && !viewImpact && (
        <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-emerald-300 font-semibold">
            {viewProjection.currentExpected} &rarr; {viewProjection.improvedExpected}
          </p>
          <span className="text-xs font-bold text-emerald-400/70">{viewProjection.multiplier}</span>
        </div>
      )}
    </div>
  );
}
