'use client';

import { AGENTS } from '@/lib/agents';
import type { ActionPlanStep } from '@/lib/types';
import type { ViewImpact } from '@/lib/view-count-tiers';

interface Props {
  step: ActionPlanStep;
  timestampLabel: string;
  isHighestImpact?: boolean;
  viewImpact?: ViewImpact;
}

export function IssueSolutionCard({ step, timestampLabel, isHighestImpact, viewImpact }: Props) {
  const agent = AGENTS.find(a => a.key === step.dimension);
  const priorityNum = parseInt(step.priority?.replace(/\D/g, '') || '3');

  const priorityLabel =
    priorityNum === 1 ? 'High impact' :
    priorityNum === 2 ? 'Medium impact' :
    'Polish';

  const priorityClass =
    priorityNum === 1 ? 'text-rose-300 bg-rose-500/10 ring-rose-500/25' :
    priorityNum === 2 ? 'text-amber-300 bg-amber-500/10 ring-amber-500/25' :
    'text-zinc-400 bg-zinc-500/10 ring-zinc-500/20';

  return (
    <div
      className={`group relative rounded-3xl border bg-gradient-to-b from-zinc-900/90 to-zinc-950/80 p-5 sm:p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 ${
        isHighestImpact
          ? 'border-orange-500/40 shadow-[0_20px_50px_-20px_rgba(251,146,60,0.35)]'
          : 'border-zinc-800/80 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)] hover:border-zinc-700/80'
      }`}
    >
      {/* Highest impact top accent line */}
      {isHighestImpact && (
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
      )}

      {/* Header: emoji + dimension name + timestamp */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-800/80 ring-1 ring-zinc-700/60 text-xl">
            {agent?.emoji ?? '✨'}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight truncate">
              {agent?.displayName ?? step.dimension}
            </p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {isHighestImpact && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-300 bg-orange-500/15 ring-1 ring-orange-500/30 rounded-full px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                  Start here
                </span>
              )}
              <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider ring-1 rounded-full px-2 py-0.5 ${priorityClass}`}>
                {priorityLabel}
              </span>
            </div>
          </div>
        </div>
        {timestampLabel && (
          <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-zinc-800/70 ring-1 ring-zinc-700/50 px-2.5 py-1 text-[11px] text-zinc-400 tabular-nums">
            <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {timestampLabel}
          </div>
        )}
      </div>

      {/* Problem Detected */}
      <div className="mt-5 flex gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-500/40 mt-0.5">
          <svg aria-hidden="true" className="h-3.5 w-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-7.5a9 9 0 100 18 9 9 0 000-18zm0 13.5h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300/90 mb-1">
            Problem detected
          </p>
          <p className="text-sm text-zinc-200 leading-relaxed">{step.issue}</p>
        </div>
      </div>

      {/* What to Do */}
      <div className="mt-4 flex gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40 mt-0.5">
          <svg aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90 mb-1">
            What to do
          </p>
          <p className="text-sm text-zinc-200 leading-relaxed">{step.doThis}</p>
          {step.example && (
            <div className="mt-2.5 rounded-xl bg-zinc-900/80 ring-1 ring-zinc-800 px-3 py-2">
              <p className="text-xs text-zinc-400 italic leading-relaxed">
                <span className="text-zinc-500 not-italic font-semibold mr-1">Try:</span>
                &ldquo;{step.example}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expected change pill */}
      {viewImpact && (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.07] to-emerald-500/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
              </svg>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">
                Expected change
              </p>
            </div>
            <p className="text-sm font-bold text-emerald-300 tabular-nums truncate">
              {viewImpact.delta}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
