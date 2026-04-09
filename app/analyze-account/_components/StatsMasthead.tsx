'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface Stat {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}

interface StatsMastheadProps {
  stats: Stat[];
}

function toneClass(tone: Stat['tone']): string {
  switch (tone) {
    case 'good':
      return 'text-emerald-300';
    case 'warn':
      return 'text-amber-300';
    case 'bad':
      return 'text-rose-300';
    default:
      return 'text-white';
  }
}

export default function StatsMasthead({ stats }: StatsMastheadProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={[
        'relative overflow-hidden',
        'rounded-2xl border border-white/6 bg-white/[0.015]',
        'backdrop-blur-sm',
      ].join(' ')}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            className="px-5 py-5 sm:py-6"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {stat.label}
            </div>
            <div
              className={[
                'mt-2 font-mono tabular-nums text-3xl sm:text-4xl font-semibold leading-none',
                toneClass(stat.tone),
              ].join(' ')}
            >
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
