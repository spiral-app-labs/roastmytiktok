'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { AgentRoast, DimensionKey } from '@/lib/types';
import { AGENTS } from '@/lib/agents';

interface AgentCardProps {
  roast: AgentRoast;
  index: number;
  variant?: 'primary' | 'secondary';
  badge?: string;
  deepLinkId?: string;
}

function getScoreLevel(score: number): { label: string; color: string; bg: string; border: string; barColor: string } {
  if (score >= 80) return { label: 'STRONG', color: 'text-green-300', bg: 'bg-green-500/15', border: 'border-green-500/30', barColor: '#4ade80' };
  if (score >= 60) return { label: 'OK', color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', barColor: '#facc15' };
  if (score >= 40) return { label: 'WEAK', color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/30', barColor: '#fb923c' };
  return { label: 'CRITICAL', color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/30', barColor: '#f87171' };
}

const accentClasses: Record<DimensionKey, { ring: string; badge: string; card: string; quoteAccent: string; dot: string }> = {
  hook: {
    ring: 'from-red-500/20 via-orange-500/10 to-transparent',
    badge: 'bg-red-500/12 text-red-200 border-red-500/20',
    card: 'border-red-500/25 bg-red-500/[0.05] shadow-[0_0_60px_rgba(239,68,68,0.08)]',
    quoteAccent: 'text-red-400/60',
    dot: 'bg-red-400',
  },
  visual: {
    ring: 'from-cyan-500/15 via-sky-500/10 to-transparent',
    badge: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
    card: 'border-cyan-500/20 bg-cyan-500/[0.03]',
    quoteAccent: 'text-cyan-400/60',
    dot: 'bg-cyan-400',
  },
  audio: {
    ring: 'from-amber-500/15 via-orange-500/10 to-transparent',
    badge: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
    card: 'border-amber-500/20 bg-amber-500/[0.03]',
    quoteAccent: 'text-amber-400/60',
    dot: 'bg-amber-400',
  },
  authenticity: {
    ring: 'from-emerald-500/15 via-green-500/10 to-transparent',
    badge: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    card: 'border-emerald-500/20 bg-emerald-500/[0.03]',
    quoteAccent: 'text-emerald-400/60',
    dot: 'bg-emerald-400',
  },
  conversion: {
    ring: 'from-pink-500/15 via-rose-500/10 to-transparent',
    badge: 'bg-pink-500/10 text-pink-200 border-pink-500/20',
    card: 'border-pink-500/20 bg-pink-500/[0.03]',
    quoteAccent: 'text-pink-400/60',
    dot: 'bg-pink-400',
  },
  accessibility: {
    ring: 'from-teal-500/15 via-cyan-500/10 to-transparent',
    badge: 'bg-teal-500/10 text-teal-200 border-teal-500/20',
    card: 'border-teal-500/20 bg-teal-500/[0.03]',
    quoteAccent: 'text-teal-400/60',
    dot: 'bg-teal-400',
  },
};

export function AgentCard({ roast, index, variant = 'secondary', badge, deepLinkId }: AgentCardProps) {
  const agent = AGENTS.find((a) => a.key === roast.agent);
  const [findingsOpen, setFindingsOpen] = useState(false);
  if (!agent) return null;

  const accent = accentClasses[roast.agent];
  const isPrimary = variant === 'primary';
  const isFailed = !!roast.failed || roast.findings?.[0]?.startsWith('Analysis error');
  const scoreLevel = isFailed
    ? { label: 'N/A', color: 'text-zinc-500', bg: 'bg-zinc-800/40', border: 'border-zinc-700/40', barColor: '#52525b' }
    : getScoreLevel(roast.score);

  return (
    <motion.div
      id={deepLinkId}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={[
        'group relative overflow-hidden rounded-[28px] border transition-all duration-200',
        isFailed
          ? 'bg-zinc-900/40 border-zinc-800/40 opacity-60'
          : isPrimary
            ? `bg-zinc-950/95 ${accent.card} hover:border-red-400/40`
            : 'bg-zinc-900/70 border-zinc-800/60 hover:border-zinc-700/80 hover:bg-zinc-900/90',
      ].join(' ')}
    >
      {/* Background gradient */}
      {!isFailed && (
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.ring} ${isPrimary ? 'opacity-100' : 'opacity-60'}`} />
      )}
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative z-10 p-5 sm:p-6">
        {/* Header row: agent identity + score badge */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xl shadow-lg shadow-black/20 shrink-0 ${isFailed ? 'border-zinc-700/40 bg-zinc-900/60 grayscale' : 'border-white/10 bg-zinc-950/80'}`}>
              {agent.emoji}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base leading-tight truncate">{agent.name}</h3>
              <p className="text-xs text-zinc-500 truncate">{agent.analyzes}</p>
            </div>
          </div>

          {/* Score badge */}
          <div className={`flex flex-col items-center justify-center rounded-2xl px-3 py-2.5 border shrink-0 ${scoreLevel.bg} ${scoreLevel.border}`}>
            {isFailed ? (
              <>
                <span className="text-xl font-black leading-none text-zinc-500">---</span>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5 text-zinc-500 opacity-70">N/A</span>
              </>
            ) : (
              <>
                <span className={`text-2xl font-black leading-none tabular-nums ${scoreLevel.color}`}>{roast.score}</span>
                <span className={`text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5 ${scoreLevel.color} opacity-70`}>{scoreLevel.label}</span>
              </>
            )}
          </div>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className={`h-1 rounded-full overflow-hidden ${isFailed ? 'bg-zinc-800/40 border border-dashed border-zinc-700/30' : 'bg-white/5'}`}>
            {!isFailed && (
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: scoreLevel.barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${roast.score}%` }}
                transition={{ duration: 1, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
              />
            )}
          </div>
        </div>

        {/* Failed state message */}
        {isFailed ? (
          <div className="rounded-2xl border border-zinc-700/40 bg-zinc-800/20 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 text-zinc-500">⚪ analysis unavailable</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {roast.failureReason || 'This dimension could not be evaluated. Try uploading again for a complete analysis.'}
            </p>
          </div>
        ) : (
          <>
            {/* Badges */}
            {(badge || isPrimary) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {badge && (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.badge}`}>
                    {badge}
                  </span>
                )}
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isPrimary ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}>
                  {isPrimary ? 'fix this first' : 'downstream lever'}
                </span>
              </div>
            )}

            {/* Roast quote - prominent, always visible */}
            <div className={`rounded-2xl border p-4 mb-4 ${isPrimary ? 'border-red-500/15 bg-black/25' : 'border-white/6 bg-black/15'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 ${isPrimary ? 'text-red-400' : 'text-zinc-500'}`}>diagnosis</p>
              <p className={`leading-relaxed italic ${isPrimary ? 'text-base text-zinc-100' : 'text-sm text-zinc-300'}`}>
                <span className={`text-xl font-serif leading-none mr-1 ${accent.quoteAccent}`}>&ldquo;</span>
                {roast.roastText}
                <span className={`text-xl font-serif leading-none ml-0.5 ${accent.quoteAccent}`}>&rdquo;</span>
              </p>
            </div>

            {/* Findings - collapsible */}
            <button
              onClick={() => setFindingsOpen(!findingsOpen)}
              className="w-full flex items-center justify-between gap-2 mb-2 group/findings"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 group-hover/findings:text-zinc-300 transition-colors">
                {findingsOpen ? 'hide' : 'show'} {roast.findings.length} findings
              </p>
              <motion.svg
                animate={{ rotate: findingsOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-4 h-4 text-zinc-600 group-hover/findings:text-zinc-400 transition-colors shrink-0"
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </motion.svg>
            </button>

            <AnimatePresence initial={false}>
              {findingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4 mb-4">
                    <ul className="space-y-2">
                      {roast.findings.map((finding, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-400">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Do this next */}
            <div className={`rounded-2xl border p-4 ${isPrimary ? 'border-red-500/20 bg-red-500/[0.07]' : 'border-zinc-800/80 bg-zinc-950/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className={`mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] ${isPrimary ? 'text-red-300' : 'text-orange-400'}`}>
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
          </>
        )}
      </div>
    </motion.div>
  );
}
