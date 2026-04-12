'use client';

import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useMemo, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
}

function CountUp({
  target,
  duration = 1.6,
  delay = 0.45,
  reduceMotion,
}: {
  target: number;
  duration?: number;
  delay?: number;
  reduceMotion: boolean;
}) {
  const mv = useMotionValue(reduceMotion ? target : 0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => setDisplay(v));
    if (reduceMotion) {
      mv.set(target);
      return () => unsub();
    }
    const timeout = setTimeout(() => {
      animate(mv, target, { duration, ease: [0.22, 1, 0.36, 1] });
    }, delay * 1000);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [target, duration, delay, mv, rounded, reduceMotion]);

  return <>{display}</>;
}

type Palette = {
  stroke: string;
  glowStrong: string;
  glowSoft: string;
  textFrom: string;
  textTo: string;
};

function getPalette(score: number): Palette {
  // Green
  if (score >= 80) {
    return {
      stroke: '#4ade80',
      glowStrong: 'rgba(74, 222, 128, 0.55)',
      glowSoft: 'rgba(74, 222, 128, 0.18)',
      textFrom: '#bbf7d0',
      textTo: '#4ade80',
    };
  }
  // Yellow
  if (score >= 60) {
    return {
      stroke: '#facc15',
      glowStrong: 'rgba(250, 204, 21, 0.55)',
      glowSoft: 'rgba(250, 204, 21, 0.18)',
      textFrom: '#fef08a',
      textTo: '#facc15',
    };
  }
  // Fire (brand sweet spot for 40-59)
  if (score >= 40) {
    return {
      stroke: '#fb923c',
      glowStrong: 'rgba(251, 146, 60, 0.6)',
      glowSoft: 'rgba(251, 146, 60, 0.2)',
      textFrom: '#fed7aa',
      textTo: '#fb923c',
    };
  }
  // Red
  return {
    stroke: '#f87171',
    glowStrong: 'rgba(248, 113, 113, 0.6)',
    glowSoft: 'rgba(248, 113, 113, 0.2)',
    textFrom: '#fecaca',
    textTo: '#f87171',
  };
}

export function ScoreRing({ score, size = 180 }: ScoreRingProps) {
  const reduceMotion = useReducedMotion() ?? false;

  const strokeWidth = Math.max(4, Math.round(size / 18));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const palette = useMemo(() => getPalette(score), [score]);

  // Unique IDs so multiple rings on the same page don't collide
  const uid = useId().replace(/:/g, '');
  const glowFilterId = `score-ring-glow-${uid}`;
  const gradientId = `score-ring-gradient-${uid}`;
  const trackGradientId = `score-ring-track-${uid}`;
  const textGradientId = `score-ring-text-${uid}`;

  const centerFontSize = size * 0.36;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Viral Score: ${score} out of 100`}
    >
      {/* Layer 1: rotating conic sweep — premium ambient motion */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="absolute -inset-3 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, ${palette.glowStrong} 25%, transparent 50%, ${palette.glowSoft} 75%, transparent 100%)`,
            filter: 'blur(18px)',
            opacity: 0.55,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Layer 2: fire halo — always present, brand accent */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(251,146,60,0.22) 0%, rgba(236,72,153,0.12) 40%, transparent 70%)`,
          filter: 'blur(22px)',
        }}
      />

      {/* Layer 3: semantic glow — pulses gently on load */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: `0 0 48px ${palette.glowStrong}, 0 0 96px ${palette.glowSoft}`,
        }}
        initial={{ opacity: 0 }}
        animate={reduceMotion ? { opacity: 0.7 } : { opacity: [0, 0.95, 0.7] }}
        transition={{ duration: 2.2, delay: 0.9, ease: 'easeOut' }}
      />

      {/* Layer 4: the SVG ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 relative"
      >
        <defs>
          {/* Progress gradient: from lighter tint to main stroke color */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.stroke} stopOpacity="0.95" />
            <stop offset="55%" stopColor={palette.stroke} />
            <stop offset="100%" stopColor={palette.stroke} stopOpacity="0.8" />
          </linearGradient>

          {/* Track gradient: subtle fire hint even when score is green */}
          <linearGradient id={trackGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="50%" stopColor="#1a1a1f" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>

          {/* Soft glow for the progress arc */}
          <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${trackGradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduceMotion ? circumference - progress : circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 1.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }
          }
          filter={`url(#${glowFilterId})`}
        />
      </svg>

      {/* Layer 5: inner radial glow — lifts the center from flat black */}
      <div
        aria-hidden
        className="absolute inset-[6%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${palette.glowSoft} 0%, transparent 60%)`,
        }}
      />

      {/* Layer 6: moving highlight orb — adds life */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.22,
            height: size * 0.22,
            background: `radial-gradient(circle, ${palette.glowStrong} 0%, transparent 70%)`,
            filter: 'blur(14px)',
            opacity: 0.6,
          }}
          animate={{
            top: [`${size * 0.08}px`, `${size * 0.08}px`, `${size * 0.62}px`, `${size * 0.62}px`, `${size * 0.08}px`],
            left: [`${size * 0.1}px`, `${size * 0.68}px`, `${size * 0.68}px`, `${size * 0.1}px`, `${size * 0.1}px`],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* SVG text used for gradient fill — far more robust than background-clip */}
        <svg
          width={size}
          height={size * 0.5}
          viewBox={`0 0 ${size} ${size * 0.5}`}
          className="absolute"
          style={{ top: '28%', left: 0 }}
          aria-hidden
        >
          <defs>
            <linearGradient id={textGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.textFrom} />
              <stop offset="100%" stopColor={palette.textTo} />
            </linearGradient>
          </defs>
        </svg>

        <motion.span
          initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 16, delay: reduceMotion ? 0 : 0.7 }}
          className="font-black tabular-nums select-none relative z-10 leading-none"
          style={{
            fontSize: centerFontSize,
            background: `linear-gradient(180deg, ${palette.textFrom} 0%, ${palette.textTo} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: `drop-shadow(0 0 24px ${palette.glowStrong})`,
            fontFamily: 'var(--font-display), var(--font-sans)',
            letterSpacing: '-0.035em',
          }}
        >
          <CountUp target={score} reduceMotion={reduceMotion} />
        </motion.span>

        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 1.2, duration: 0.5 }}
          className="relative z-10 mt-1 flex items-center gap-1.5"
        >
          <span
            aria-hidden
            className="h-[1px] w-4"
            style={{
              background: `linear-gradient(90deg, transparent, ${palette.stroke}, transparent)`,
            }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em] select-none"
            style={{ color: palette.stroke, opacity: 0.85 }}
          >
            Viral Score
          </span>
          <span
            aria-hidden
            className="h-[1px] w-4"
            style={{
              background: `linear-gradient(90deg, transparent, ${palette.stroke}, transparent)`,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
