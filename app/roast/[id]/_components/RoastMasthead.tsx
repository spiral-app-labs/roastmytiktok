'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { RoastResult } from '@/lib/types';
import { scoreToGrade } from '@/components/ScoreChip';

interface RoastMastheadProps {
  roast: RoastResult;
}

interface Tier {
  text: string;
  label: string;
  ring: string;
  glow: string;
}

function scoreTier(score: number): Tier {
  if (score >= 80) {
    return {
      text: 'text-emerald-300',
      label: 'VIRAL TERRITORY',
      ring: 'from-emerald-400/40 via-emerald-500/20 to-transparent',
      glow: 'bg-emerald-500/20',
    };
  }
  if (score >= 60) {
    return {
      text: 'text-amber-300',
      label: 'NEEDS WORK',
      ring: 'from-amber-400/40 via-amber-500/20 to-transparent',
      glow: 'bg-amber-500/20',
    };
  }
  return {
    text: 'text-rose-300',
    label: 'DEAD ON ARRIVAL',
    ring: 'from-rose-400/40 via-rose-500/20 to-transparent',
    glow: 'bg-rose-500/20',
  };
}

function useCountUp(target: number, shouldAnimate: boolean, durationMs = 900): number {
  const [value, setValue] = useState(shouldAnimate ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldAnimate) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, shouldAnimate, durationMs]);

  return value;
}

export default function RoastMasthead({ roast }: RoastMastheadProps) {
  const shouldReduceMotion = useReducedMotion();
  const count = useCountUp(roast.overallScore, !shouldReduceMotion);
  const tier = scoreTier(roast.overallScore);
  const grade = scoreToGrade(roast.overallScore);

  const platform = (roast.platform || 'tiktok').toUpperCase();
  const duration =
    roast.metadata.duration > 0 ? `${Math.round(roast.metadata.duration)}s` : null;
  const niche = roast.nichePercentile || null;

  const metaBits = [platform, duration, niche].filter(Boolean) as string[];

  return (
    <motion.header
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative pt-2"
    >
      {/* Score block — the centerpiece */}
      <div className="relative flex flex-col items-center text-center">
        {/* Eyebrow label */}
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500 sm:text-xs">
          Viral Score
        </div>

        {/* Giant numeral with ambient glow */}
        <div className="relative mt-5">
          {/* Glow plate */}
          <div
            aria-hidden
            className={[
              'absolute left-1/2 top-1/2 -z-10 h-[110%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl',
              tier.glow,
            ].join(' ')}
          />
          {/* Ring/arc behind the numeral */}
          <div
            aria-hidden
            className={[
              'absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b blur-2xl',
              tier.ring,
            ].join(' ')}
          />

          <div className="flex items-start justify-center gap-2 sm:gap-3">
            <span
              aria-label={`Viral score ${roast.overallScore} out of 100`}
              className={[
                'block font-mono tabular-nums font-bold leading-[0.85]',
                'text-[10rem] sm:text-[14rem] lg:text-[17rem]',
                tier.text,
              ].join(' ')}
            >
              {count}
            </span>
            <span
              aria-hidden
              className={[
                'mt-4 font-mono text-2xl font-semibold text-zinc-500 sm:mt-6 sm:text-3xl',
              ].join(' ')}
            >
              / 100
            </span>
          </div>
        </div>

        {/* Tier pill + letter grade */}
        <div className="mt-6 flex items-center gap-3">
          <span
            className={[
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] sm:text-xs',
              tier.text,
              roast.overallScore >= 80
                ? 'border-emerald-400/40 bg-emerald-500/10'
                : roast.overallScore >= 60
                ? 'border-amber-400/40 bg-amber-500/10'
                : 'border-rose-400/40 bg-rose-500/10',
            ].join(' ')}
          >
            <span>{tier.label}</span>
            <span aria-hidden className="opacity-60">·</span>
            <span>{grade}</span>
          </span>
        </div>

        {/* Meta byline */}
        {metaBits.length > 0 && (
          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {metaBits.map((bit, i) => (
              <span key={`${bit}-${i}`}>
                {i > 0 && <span className="mx-2 opacity-40">·</span>}
                {bit}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Verdict headline — supporting copy below the score */}
      {roast.verdict && (
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: shouldReduceMotion ? 0 : 0.4, duration: 0.5 }}
          className="mx-auto mt-10 max-w-3xl text-center font-display text-xl font-semibold leading-snug text-zinc-200 sm:text-2xl lg:text-3xl"
        >
          {roast.verdict}
        </motion.p>
      )}
    </motion.header>
  );
}
