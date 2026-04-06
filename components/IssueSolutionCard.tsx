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
  const isP1 = priorityNum === 1;
  const isP2 = priorityNum === 2;

  const priorityBadge = isP1
    ? 'bg-red-500/20 text-red-300 border-red-500/30'
    : isP2
      ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25'
      : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50';

  const cardBorder = isP1
    ? 'border-red-500/25 bg-gradient-to-br from-red-500/8 to-transparent'
    : isP2
      ? 'border-yellow-500/20 bg-yellow-500/5'
      : 'border-zinc-800/60 bg-zinc-950/40';

  const evidence = Array.isArray(step.evidence) ? step.evidence : [];

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cardBorder}`}>
      {/* Highest Impact callout banner */}
      {isHighestImpact && (
        <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/25 px-3 py-2 -mt-1">
          <span className="text-base leading-none">🔥</span>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Highest Impact Fix</p>
          <span className="ml-auto text-xs text-orange-300/70">Fix this first</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${priorityBadge}`}>
            {step.priority}
          </span>
          <span className="text-xs text-zinc-500">{agent?.emoji} {agent?.name ?? step.dimension}</span>
        </div>
        {timestampLabel && (
          <div className="rounded-full border border-zinc-700/50 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-bold tracking-wide text-zinc-400 shrink-0">
            at {timestampLabel}
          </div>
        )}
      </div>

      {/* Problem / Solution split */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Problem */}
        <div className={`rounded-xl border p-3 ${isP1 ? 'border-red-500/20 bg-red-500/[0.06]' : 'border-zinc-800/80 bg-black/20'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">What failed</p>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed">{step.issue}</p>
          {step.algorithmicConsequence && (
            <p className="text-[11px] text-zinc-500 mt-2 italic">⚠️ {step.algorithmicConsequence}</p>
          )}
        </div>

        {/* Solution */}
        <div className={`rounded-xl border p-3 ${isP1 ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-zinc-800/80 bg-black/20'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">How to fix it</p>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed font-medium">{step.doThis}</p>
          {step.example && (
            <p className="text-xs text-zinc-400 mt-2 italic">e.g. &ldquo;{step.example}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Evidence */}
      {evidence.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {evidence.map((item, i) => (
            <li key={i} className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <span className={`h-1 w-1 rounded-full shrink-0 ${isP1 ? 'bg-red-500' : isP2 ? 'bg-yellow-500' : 'bg-zinc-600'}`} />
              {item}
            </li>
          ))}
        </ul>
      )}

      {/* Per-issue view impact badge */}
      {viewImpact && (
        <div className={`rounded-lg px-3 py-2 flex items-center gap-2 ${
          viewImpact.isHookJump
            ? 'bg-orange-500/[0.10] border border-orange-500/30'
            : 'bg-emerald-500/[0.08] border border-emerald-500/20'
        }`}>
          <span aria-hidden="true" className="text-sm">&#x1F4C8;</span>
          <p className={`text-sm font-semibold ${viewImpact.isHookJump ? 'text-orange-300' : 'text-emerald-300'}`}>
            {viewImpact.delta}
          </p>
        </div>
      )}

      {/* Overall projection (first hook card only, shown if no per-issue impact) */}
      {viewProjection && !viewImpact && (
        <div className="rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 mb-0.5">View impact if fixed</p>
            <p className="text-sm text-emerald-300 font-semibold">
              {viewProjection.currentExpected} &rarr; {viewProjection.improvedExpected}
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 text-xs font-bold text-emerald-300">
            {viewProjection.multiplier} potential
          </span>
        </div>
      )}
    </div>
  );
}
