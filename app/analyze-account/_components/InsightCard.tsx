'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { PlaybookItem } from './helpers';

interface InsightCardProps {
  item: PlaybookItem;
  index?: number;
}

const TAG_STYLE: Record<
  PlaybookItem['type'],
  { label: string; border: string; bg: string; tagBg: string; tagText: string; accent: string }
> = {
  strength: {
    label: 'Strength',
    border: 'border-emerald-400/20',
    bg: 'bg-emerald-500/[0.04]',
    tagBg: 'bg-emerald-500/15',
    tagText: 'text-emerald-300',
    accent: 'bg-emerald-400/60',
  },
  weakness: {
    label: 'Fix this',
    border: 'border-rose-400/25',
    bg: 'bg-rose-500/[0.05]',
    tagBg: 'bg-rose-500/15',
    tagText: 'text-rose-300',
    accent: 'bg-rose-400/60',
  },
  trend: {
    label: 'Insight',
    border: 'border-orange-400/20',
    bg: 'bg-orange-500/[0.04]',
    tagBg: 'bg-orange-500/15',
    tagText: 'text-orange-300',
    accent: 'bg-orange-400/60',
  },
};

export default function InsightCard({ item, index = 0 }: InsightCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const style = TAG_STYLE[item.type];

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: shouldReduceMotion ? 0 : Math.min(0.05 * index, 0.3),
        duration: 0.4,
        ease: 'easeOut',
      }}
      className={[
        'relative overflow-hidden rounded-2xl border p-6',
        'backdrop-blur-sm',
        style.border,
        style.bg,
      ].join(' ')}
    >
      {/* Accent bar */}
      <div className={['absolute inset-y-0 left-0 w-[2px]', style.accent].join(' ')} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-4xl leading-none">{item.emoji}</span>
          <span
            className={[
              'font-mono text-[10px] uppercase tracking-[0.18em]',
              'rounded-full px-2.5 py-1',
              style.tagBg,
              style.tagText,
            ].join(' ')}
          >
            {style.label}
          </span>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-white leading-snug">
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.body}</p>
        </div>
      </div>
    </motion.article>
  );
}
