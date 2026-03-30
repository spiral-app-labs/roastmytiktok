'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AgentRoast, DimensionKey } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import { ScoreRing } from './ScoreRing';

interface AgentCardProps {
  roast: AgentRoast;
  index: number;
  variant?: 'primary' | 'secondary';
  badge?: string;
  deepLinkId?: string;
}

const accentClasses: Record<DimensionKey, { ring: string; badge: string; card: string }> = {
  hook: {
    ring: 'from-red-500/20 via-orange-500/10 to-transparent',
    badge: 'bg-red-500/12 text-red-200 border-red-500/20',
    card: 'border-red-500/25 bg-red-500/[0.05] shadow-[0_0_60px_rgba(239,68,68,0.08)]',
  },
  visual: {
    ring: 'from-cyan-500/15 via-sky-500/10 to-transparent',
    badge: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
    card: 'border-cyan-500/20 bg-cyan-500/[0.03]',
  },
  caption: {
    ring: 'from-violet-500/15 via-fuchsia-500/10 to-transparent',
    badge: 'bg-violet-500/10 text-violet-200 border-violet-500/20',
    card: 'border-violet-500/20 bg-violet-500/[0.03]',
  },
  audio: {
    ring: 'from-amber-500/15 via-orange-500/10 to-transparent',
    badge: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
    card: 'border-amber-500/20 bg-amber-500/[0.03]',
  },
  algorithm: {
    ring: 'from-blue-500/15 via-indigo-500/10 to-transparent',
    badge: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
    card: 'border-blue-500/20 bg-blue-500/[0.03]',
  },
  authenticity: {
    ring: 'from-emerald-500/15 via-green-500/10 to-transparent',
    badge: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    card: 'border-emerald-500/20 bg-emerald-500/[0.03]',
  },
  conversion: {
    ring: 'from-pink-500/15 via-rose-500/10 to-transparent',
    badge: 'bg-pink-500/10 text-pink-200 border-pink-500/20',
    card: 'border-pink-500/20 bg-pink-500/[0.03]',
  },
  accessibility: {
    ring: 'from-teal-500/15 via-cyan-500/10 to-transparent',
    badge: 'bg-teal-500/10 text-teal-200 border-teal-500/20',
    card: 'border-teal-500/20 bg-teal-500/[0.03]',
  },
  hashtag_strategy: {
    ring: 'from-yellow-500/15 via-lime-500/10 to-transparent',
    badge: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20',
    card: 'border-yellow-500/20 bg-yellow-500/[0.03]',
  },
};

export function AgentCard({ roast, index, variant = 'secondary', badge, deepLinkId }: AgentCardProps) {
  const agent = AGENTS.find((a) => a.key === roast.agent);
  if (!agent) return null;

  const accent = accentClasses[roast.agent];
  const isPrimary = variant === 'primary';

  return (
    <motion.div
      id={deepLinkId}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className={[
        'group relative overflow-hidden rounded-[28px] border p-6 transition-all card-glow',
        isPrimary
          ? `bg-zinc-950/95 ${accent.card} hover:border-red-400/40`
          : 'bg-zinc-900/80 border-zinc-800/70 hover:border-zinc-700',
      ].join(' ')}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.ring} ${isPrimary ? 'opacity-100' : 'opacity-70'}`} />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/80 text-2xl shadow-lg shadow-black/20`}>
                {agent.emoji}
              </div>
              <div>
                <h3 className="font-semibold text-white sm:text-lg">{agent.name}</h3>
                <p className="max-w-md text-xs text-zinc-500 sm:text-sm">{agent.analyzes}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {badge && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.badge}`}>
                  {badge}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {isPrimary ? 'fix this first' : 'downstream lever'}
              </span>
            </div>
          </div>
          <ScoreRing score={roast.score} size={isPrimary ? 72 : 60} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">diagnosis</p>
            <p className={`leading-relaxed ${isPrimary ? 'text-base text-zinc-100' : 'text-sm text-zinc-300'} italic`}>
              &ldquo;{roast.roastText}&rdquo;
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">what this is really saying</h4>
            <ul className="space-y-2">
              {roast.findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${isPrimary ? 'bg-red-400' : 'bg-orange-400'}`} />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={`mt-4 rounded-2xl border p-4 ${isPrimary ? 'border-red-500/20 bg-red-500/[0.07]' : 'border-zinc-800 bg-zinc-950/60'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${isPrimary ? 'text-red-300' : 'text-orange-400'}`}>
                do this next
              </h4>
              <p className="text-sm leading-relaxed text-zinc-200">{roast.improvementTip}</p>
            </div>
            {deepLinkId && (
              <Link
                href={`#${deepLinkId}`}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                in view
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
