'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ViewProjection as ViewProjectionType } from '@/lib/types';

interface Props {
  projection: ViewProjectionType;
}

export function ViewProjection({ projection }: Props) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="relative w-full">
      {/* Outer gradient border wrapper — creates the premium 1px fire border */}
      <div
        className="relative rounded-3xl p-[1px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(251,146,60,0.45) 0%, rgba(39,39,42,0.4) 35%, rgba(39,39,42,0.4) 65%, rgba(34,197,94,0.35) 100%)',
        }}
      >
        <div
          className="relative overflow-hidden rounded-[23px] px-5 py-6 sm:px-8 sm:py-7"
          style={{
            background:
              'linear-gradient(180deg, rgba(24,24,27,0.95) 0%, rgba(9,9,11,0.98) 100%)',
            boxShadow:
              '0 30px 80px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Background gradient wash */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 100% 100%, rgba(34,197,94,0.08) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 0% 0%, rgba(251,146,60,0.08) 0%, transparent 60%)',
            }}
          />

          {/* Top hairline */}
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

          {/* Eyebrow label */}
          <div className="relative mb-5 flex items-center justify-center gap-2">
            <svg
              aria-hidden
              className="h-3 w-3 text-orange-400/80"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2.4}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
              />
            </svg>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Projected Reach
            </p>
          </div>

          {/* Main split */}
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            {/* If posted today */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-2 font-semibold">
                Posted today
              </p>
              <p
                className="font-black tabular-nums leading-none text-zinc-300"
                style={{
                  fontSize: 'clamp(1.75rem, 6vw, 3rem)',
                  fontFamily: 'var(--font-display), var(--font-sans)',
                  letterSpacing: '-0.03em',
                }}
              >
                {projection.currentExpected}
              </p>
              <p className="text-[9px] sm:text-[10px] text-zinc-600 mt-2 uppercase tracking-wider">
                expected views
              </p>
            </motion.div>

            {/* Multiplier center */}
            <motion.div
              initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: reduceMotion ? 0 : 0.3,
                type: 'spring',
                stiffness: 200,
                damping: 14,
              }}
              className="flex flex-col items-center gap-2 px-1"
            >
              {/* Multiplier pill */}
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full blur-md opacity-60"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(251,146,60,0.5), rgba(236,72,153,0.5))',
                  }}
                />
                <div
                  className="relative flex items-center gap-1 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(251,146,60,0.18), rgba(236,72,153,0.18))',
                    border: '1px solid rgba(251,146,60,0.4)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    className="text-xs sm:text-sm font-black tabular-nums"
                    style={{
                      background: 'linear-gradient(135deg, #fed7aa, #ec4899)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {projection.multiplier}
                  </span>
                </div>
              </div>

              {/* Animated arrow */}
              <motion.svg
                width="32"
                height="12"
                viewBox="0 0 32 12"
                className="text-orange-400/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={
                  reduceMotion ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                <defs>
                  <linearGradient id="view-proj-arrow" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 6 L26 6 M20 2 L26 6 L20 10"
                  fill="none"
                  stroke="url(#view-proj-arrow)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.div>

            {/* With the fixes */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.2, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-emerald-500/90 mb-2 font-semibold">
                With fixes
              </p>
              <p
                className="font-black tabular-nums leading-none"
                style={{
                  fontSize: 'clamp(1.75rem, 6vw, 3rem)',
                  background: 'linear-gradient(180deg, #a7f3d0 0%, #22c55e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 18px rgba(34,197,94,0.35))',
                  fontFamily: 'var(--font-display), var(--font-sans)',
                  letterSpacing: '-0.03em',
                }}
              >
                {projection.improvedExpected}
              </p>
              <p className="text-[9px] sm:text-[10px] text-emerald-600/80 mt-2 uppercase tracking-wider">
                expected views
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
