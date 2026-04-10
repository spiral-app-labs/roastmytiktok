'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { RoastResult, ViewProjection } from '@/lib/types';
import { scoreToGrade } from '@/components/ScoreChip';

interface RoastMastheadProps {
  roast: RoastResult;
  projection: ViewProjection;
}

interface Tier {
  text: string;
  label: string;
  badge: string;
  bar: string;
}

function scoreTier(score: number): Tier {
  if (score >= 80) {
    return {
      text: 'text-emerald-300',
      label: 'Viral territory',
      badge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
      bar: 'bg-emerald-400',
    };
  }
  if (score >= 60) {
    return {
      text: 'text-amber-300',
      label: 'Needs work',
      badge: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
      bar: 'bg-amber-400',
    };
  }
  return {
    text: 'text-rose-300',
    label: 'Dead on arrival',
    badge: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
    bar: 'bg-rose-400',
  };
}

function useCountUp(target: number, shouldAnimate: boolean, durationMs = 900): number {
  const [value, setValue] = useState(() => (shouldAnimate ? 0 : target));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldAnimate) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, shouldAnimate, durationMs]);

  return shouldAnimate ? value : target;
}

export default function RoastMasthead({ roast, projection }: RoastMastheadProps) {
  const shouldReduceMotion = useReducedMotion();
  const primaryScore = roast.hookSummary?.score ?? roast.overallScore;
  const count = useCountUp(primaryScore, !shouldReduceMotion);
  const tier = scoreTier(primaryScore);
  const grade = scoreToGrade(primaryScore);

  const platform = (roast.platform || 'tiktok').toUpperCase();
  const duration =
    roast.metadata.duration > 0 ? `${Math.round(roast.metadata.duration)}s` : null;
  const niche = roast.nichePercentile || null;
  const metaBits = [platform, duration, niche].filter(Boolean) as string[];

  const barPct = Math.max(2, Math.min(100, primaryScore));

  return (
    <motion.header
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative"
    >
      {/* Eyebrow row: viral score label + meta byline */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Hook verdict
        </div>
        {metaBits.length > 0 && (
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            {metaBits.map((bit, i) => (
              <span key={`${bit}-${i}`}>
                {i > 0 && <span className="mx-2 opacity-50">·</span>}
                {bit}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score + grade row */}
      <div className="mt-4 flex items-end gap-5">
        <span
          aria-label={`Hook score ${primaryScore} out of 100`}
          className={[
            'font-mono tabular-nums font-bold leading-[0.82]',
            'text-[6rem] sm:text-[7rem] lg:text-[8rem]',
            tier.text,
          ].join(' ')}
        >
          {count}
        </span>
        <div className="mb-2 flex flex-col gap-2">
          <span className="font-mono text-sm text-zinc-600 sm:text-base">/ 100</span>
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]',
              tier.badge,
            ].join(' ')}
          >
            <span>{roast.hookSummary?.strength === 'weak' ? 'Hook failing' : roast.hookSummary?.strength === 'mixed' ? 'Hook fragile' : 'Hook working'}</span>
            <span aria-hidden className="opacity-50">·</span>
            <span>{grade}</span>
          </span>
        </div>
      </div>

      {/* Thin score bar */}
      <div className="mt-5 h-1 w-full max-w-md overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={shouldReduceMotion ? false : { width: 0 }}
          animate={{ width: `${barPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          className={['h-full rounded-full', tier.bar].join(' ')}
        />
      </div>

      <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-2 font-mono text-sm text-sky-50 shadow-[0_10px_30px_-18px_rgba(59,130,246,0.45)]">
        <span className="text-[10px] uppercase tracking-[0.18em] text-sky-300/80">
          Hook-gated
        </span>
        <span className="tabular-nums">{projection.currentExpected}</span>
        <svg
          aria-hidden
          className="h-3.5 w-3.5 text-sky-300/80"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
          />
        </svg>
        <span className="font-semibold tabular-nums">{projection.improvedExpected}</span>
        <span className="text-sky-300/80">views</span>
        {projection.multiplier && (
          <>
            <span aria-hidden className="mx-0.5 text-sky-500/50">·</span>
            <span className="text-sky-300/90">{projection.multiplier}</span>
          </>
        )}
      </div>

      {/* Verdict — smaller, supporting copy, clamped to 3 lines so it can't blow out */}
      {(roast.firstFiveSecondsDiagnosis?.hookRead || roast.hookSummary?.headline || roast.verdict) && (
        <p
          className="mt-5 max-w-2xl text-[13px] leading-snug text-zinc-500"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {roast.firstFiveSecondsDiagnosis?.hookRead || roast.hookSummary?.headline || roast.verdict}
        </p>
      )}
    </motion.header>
  );
}
