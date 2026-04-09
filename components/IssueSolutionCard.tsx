'use client';

import { AGENTS } from '@/lib/agents';
import type { ActionPlanStep } from '@/lib/types';
import type { ViewImpact } from '@/lib/view-count-tiers';

interface Props {
  step: ActionPlanStep;
  timestampLabel: string;
  isHighestImpact?: boolean;
  viewImpact?: ViewImpact;
  index?: number;
}

export function IssueSolutionCard({
  step,
  timestampLabel,
  isHighestImpact,
  viewImpact,
  index,
}: Props) {
  const agent = AGENTS.find((a) => a.key === step.dimension);
  const priorityNum = parseInt(step.priority?.replace(/\D/g, '') || '3');

  const priorityLabel =
    priorityNum === 1 ? 'High impact' : priorityNum === 2 ? 'Medium impact' : 'Polish';

  const priorityClass =
    priorityNum === 1
      ? 'text-rose-300 bg-rose-500/10 ring-rose-500/25'
      : priorityNum === 2
        ? 'text-amber-300 bg-amber-500/10 ring-amber-500/25'
        : 'text-zinc-400 bg-zinc-500/10 ring-zinc-500/20';

  const stepNumber =
    typeof index === 'number' ? (index + 1).toString().padStart(2, '0') : null;

  return (
    <div
      className={`group relative rounded-3xl p-[1px] transition-all duration-300 hover:-translate-y-0.5 ${
        isHighestImpact ? '' : ''
      }`}
      style={{
        background: isHighestImpact
          ? 'linear-gradient(135deg, rgba(251,146,60,0.55) 0%, rgba(236,72,153,0.45) 50%, rgba(251,146,60,0.3) 100%)'
          : 'linear-gradient(135deg, rgba(39,39,42,0.9) 0%, rgba(24,24,27,0.9) 50%, rgba(39,39,42,0.9) 100%)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-[23px] p-5 sm:p-6 transition-colors"
        style={{
          background:
            'linear-gradient(180deg, rgba(24,24,27,0.95) 0%, rgba(9,9,11,0.98) 100%)',
          boxShadow: isHighestImpact
            ? '0 25px 60px -25px rgba(251,146,60,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 15px 40px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        {/* Ambient glow for highest impact */}
        {isHighestImpact && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 15% 0%, rgba(251,146,60,0.12) 0%, transparent 60%)',
            }}
          />
        )}

        {/* Top accent hairline */}
        <div
          aria-hidden
          className="absolute inset-x-8 top-0 h-px"
          style={{
            background: isHighestImpact
              ? 'linear-gradient(90deg, transparent, rgba(251,146,60,0.7), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(63,63,70,0.8), transparent)',
          }}
        />

        {/* ---- HEADER: step number + dimension + badges + timestamp ---- */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Step number / emoji tile */}
            <div className="relative flex-shrink-0">
              {/* Tile background */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl relative overflow-hidden"
                style={{
                  background: isHighestImpact
                    ? 'linear-gradient(135deg, rgba(251,146,60,0.25), rgba(236,72,153,0.2))'
                    : 'linear-gradient(135deg, rgba(39,39,42,0.9), rgba(24,24,27,0.9))',
                  border: isHighestImpact
                    ? '1px solid rgba(251,146,60,0.45)'
                    : '1px solid rgba(63,63,70,0.6)',
                  boxShadow: isHighestImpact
                    ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(251,146,60,0.2)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <span className="text-2xl leading-none relative z-10">{agent?.emoji ?? '✨'}</span>
              </div>
              {/* Step number chip */}
              {stepNumber && (
                <div
                  className="absolute -top-1.5 -left-1.5 flex h-5 min-w-[22px] items-center justify-center rounded-full px-1 text-[9px] font-black tabular-nums tracking-wider"
                  style={{
                    background: isHighestImpact
                      ? 'linear-gradient(135deg, #fb923c, #ec4899)'
                      : '#27272a',
                    color: isHighestImpact ? '#fff' : '#a1a1aa',
                    border: isHighestImpact
                      ? '1px solid rgba(255,255,255,0.2)'
                      : '1px solid rgba(63,63,70,0.9)',
                    boxShadow: isHighestImpact
                      ? '0 4px 12px rgba(251,146,60,0.4)'
                      : '0 2px 6px rgba(0,0,0,0.4)',
                  }}
                >
                  {stepNumber}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="text-base sm:text-lg font-bold text-white leading-tight truncate"
                style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
              >
                {agent?.displayName ?? step.dimension}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {isHighestImpact && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.1em] text-white rounded-full px-2 py-0.5"
                    style={{
                      background: 'linear-gradient(135deg, #fb923c, #ec4899)',
                      boxShadow: '0 4px 12px rgba(251,146,60,0.35)',
                    }}
                  >
                    <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                    Start here
                  </span>
                )}
                <span
                  className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.1em] ring-1 rounded-full px-2 py-0.5 ${priorityClass}`}
                >
                  {priorityLabel}
                </span>
              </div>
            </div>
          </div>

          {timestampLabel && (
            <div className="flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[10px] tabular-nums font-semibold text-zinc-300"
              style={{
                background: 'rgba(9,9,11,0.8)',
                border: '1px solid rgba(63,63,70,0.6)',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              <svg
                aria-hidden
                className="h-3 w-3 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {timestampLabel}
            </div>
          )}
        </div>

        {/* ---- BODY: problem / solution as two-column on sm+, stacked on mobile ---- */}
        <div className="relative mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Problem */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-md"
                style={{
                  background: 'rgba(244,63,94,0.15)',
                  border: '1px solid rgba(244,63,94,0.35)',
                }}
              >
                <svg
                  aria-hidden
                  className="h-3 w-3 text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-300/90">
                Problem
              </p>
            </div>
            <p className="text-[13px] sm:text-sm text-zinc-200 leading-relaxed pl-[28px]">
              {step.issue}
            </p>
          </div>

          {/* Solution */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-md"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)',
                }}
              >
                <svg
                  aria-hidden
                  className="h-3 w-3 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3.2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300/90">
                Fix
              </p>
            </div>
            <p className="text-[13px] sm:text-sm text-zinc-200 leading-relaxed pl-[28px]">
              {step.doThis}
            </p>
          </div>
        </div>

        {/* Example quote — full width below the grid */}
        {step.example && (
          <div
            className="relative mt-4 rounded-xl px-3.5 py-2.5"
            style={{
              background: 'rgba(9,9,11,0.7)',
              border: '1px solid rgba(39,39,42,0.9)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
            }}
          >
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-400/80 flex-shrink-0 mt-0.5">
                Try
              </span>
              <p className="text-xs text-zinc-300 italic leading-relaxed">
                &ldquo;{step.example}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* ---- EXPECTED CHANGE — currency-style badge ---- */}
        {viewImpact && (
          <div className="relative mt-5">
            <div
              className="relative overflow-hidden rounded-2xl px-4 py-3"
              style={{
                background:
                  'linear-gradient(90deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
                border: '1px solid rgba(34,197,94,0.35)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Subtle shine sweep */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.08) 50%, transparent 65%)',
                }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      background: 'rgba(34,197,94,0.2)',
                      border: '1px solid rgba(34,197,94,0.4)',
                    }}
                  >
                    <svg
                      aria-hidden
                      className="h-3 w-3 text-emerald-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
                      />
                    </svg>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300/90">
                    Expected uplift
                  </p>
                </div>
                <p
                  className="text-sm sm:text-base font-black tabular-nums truncate"
                  style={{
                    background: 'linear-gradient(135deg, #d1fae5, #22c55e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontFamily: 'var(--font-display), var(--font-sans)',
                  }}
                >
                  {viewImpact.delta}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
