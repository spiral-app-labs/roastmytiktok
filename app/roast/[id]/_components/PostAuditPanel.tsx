'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { RoastResult } from '@/lib/types';

interface PostAuditPanelProps {
  roast: RoastResult;
}

function metricStateLabel(metricsAvailable: boolean): string {
  return metricsAvailable ? 'Metrics included' : 'Content-led audit';
}

export default function PostAuditPanel({ roast }: PostAuditPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const audit = roast.postAudit;

  if (!audit || roast.analysisIntent !== 'post_post') {
    return null;
  }

  const sections = [
    {
      key: 'worked',
      title: 'What worked',
      items: audit.whatWorked,
      tone: 'border-emerald-500/15 bg-emerald-500/[0.06]',
    },
    {
      key: 'missed',
      title: 'What missed',
      items: audit.whatMissed,
      tone: 'border-rose-500/15 bg-rose-500/[0.06]',
    },
    {
      key: 'next',
      title: 'What to do next',
      items: audit.nextMoves,
      tone: 'border-sky-500/15 bg-sky-500/[0.06]',
    },
  ];

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.06 }}
      className="mt-8 sm:mt-10"
    >
      <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(14,24,44,0.78),rgba(7,10,18,0.94))] p-5 shadow-[0_24px_80px_-40px_rgba(56,189,248,0.35)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-300/80">
              Post-post audit
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              What the posted version proved after it went live
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
              This layer reads the posted video first, then checks whether earlier advice actually showed up in the shipped version.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
              {metricStateLabel(audit.metricsAvailable)}
            </span>
            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-sky-200">
              Confidence {audit.confidence}
            </span>
          </div>
        </div>

        {audit.evidenceSummary.strongestSignals.length > 0 ? (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {audit.evidenceSummary.strongestSignals.map((signal, index) => (
              <div
                key={`${signal}-${index}`}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                  Signal {index + 1}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-200">{signal}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.key}
              className={`rounded-2xl border p-4 sm:p-5 ${section.tone}`}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {section.title}
              </div>
              <div className="mt-4 space-y-3">
                {section.items.map((item, index) => (
                  <div key={`${section.key}-${index}`} className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      {index + 1}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Evidence strip
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {audit.evidenceSummary.citations.map((citation) => (
              <div key={citation.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  <span>{citation.sourceType.replace('_', ' ')}</span>
                  {citation.timestampLabel ? (
                    <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-zinc-400">
                      {citation.timestampLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{citation.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{citation.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {audit.adviceFollowThrough ? (
          <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-500/[0.05] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
                  Did you follow the original advice?
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  Overall verdict: <span className="font-semibold text-white">{audit.adviceFollowThrough.overallVerdict.replace(/_/g, ' ')}</span>
                </p>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Linked roast {audit.adviceFollowThrough.linkedRoastId.slice(0, 8)}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {audit.adviceFollowThrough.items.map((item) => (
                <div key={`${item.priority}-${item.dimension}`} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      {item.priority} · {item.dimension}
                    </span>
                    <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
