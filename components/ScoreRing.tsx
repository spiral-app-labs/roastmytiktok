'use client';

import { motion, useMotionValue, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
}

function CountUp({ target, duration = 1.5, delay = 0.5 }: { target: number; duration?: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const mv = useMotionValue(0);

  useEffect(() => {
    const unsub = mv.on('change', (v) => setDisplay(Math.round(v)));
    const timeout = setTimeout(() => {
      animate(mv, target, { duration, ease: 'easeOut' });
    }, delay * 1000);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [target, duration, delay, mv]);

  return <>{display}</>;
}

export function ScoreRing({ score, size = 180 }: ScoreRingProps) {
  const strokeWidth = Math.max(3, Math.round(size / 22));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color =
    score >= 80
      ? '#4ade80'
      : score >= 60
        ? '#facc15'
        : score >= 40
          ? '#fb923c'
          : '#f87171';

  const glowColor =
    score >= 80
      ? 'rgba(74, 222, 128, 0.3)'
      : score >= 60
        ? 'rgba(250, 204, 21, 0.3)'
        : score >= 40
          ? 'rgba(251, 146, 60, 0.3)'
          : 'rgba(248, 113, 113, 0.3)';

  // Unique filter ID to avoid SVG conflicts when multiple rings on the page
  const filterId = `glow-${size}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow pulse */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${glowColor}` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.5] }}
        transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
      />

      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a1a2e"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
          filter={`url(#${filterId})`}
        />
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Inner radial glow - breaks up the flat black center */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${glowColor.replace('0.3', '0.18')} 0%, transparent 70%)` }}
      />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.8 }}
          className="font-black tabular-nums select-none relative z-10"
          style={{ color, fontSize: size * 0.32, lineHeight: 1 }}
        >
          <CountUp target={score} />
        </motion.span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mt-1 relative z-10">
          Viral Score
        </span>
      </div>
    </div>
  );
}
