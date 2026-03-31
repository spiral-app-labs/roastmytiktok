'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  emoji: string;
  tier?: 1 | 2 | 3;
  /** When true, section starts collapsed and shows "fix hook first" badge */
  gated?: boolean;
  /** Additional class overrides for the outer card border/bg */
  accent?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const tierLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'priority 1', color: 'text-red-300 border-red-500/30 bg-red-500/10' },
  2: { label: 'priority 2', color: 'text-orange-300 border-orange-500/25 bg-orange-500/8' },
  3: { label: 'secondary', color: 'text-zinc-400 border-zinc-700/50 bg-zinc-800/40' },
};

export function CollapsibleSection({
  id,
  eyebrow,
  title,
  emoji,
  tier,
  gated,
  accent = 'border-zinc-800/70 bg-zinc-900/60',
  children,
  defaultOpen,
}: CollapsibleSectionProps) {
  const startOpen = defaultOpen ?? (gated ? false : true);
  const [open, setOpen] = useState(startOpen);

  const tierInfo = tier ? tierLabels[tier] : null;

  return (
    <div
      id={id}
      className={`scroll-mt-20 rounded-3xl border transition-all ${accent} ${gated && !open ? 'opacity-60 saturate-[0.5]' : ''}`}
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
              {tierInfo && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              )}
              {gated && (
                <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">
                  fix hook first
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">{title}</h3>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </motion.span>
      </button>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
