'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { RoastResult } from '@/lib/types';

interface HookSurvivalPanelProps {
  roast: RoastResult;
}

function formatPct(value: number | undefined): string {
  return `${Math.round((value ?? 0) * 100)}%`;
}

export default function HookSurvivalPanel({ roast }: HookSurvivalPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const predictions = roast.hookPredictions ?? roast.hookAnalysis?.predictions;
  if (!predictions) return null;

  const rows = [
    {
      label: 'Stay past 3s',
      value: formatPct(predictions.pStay3s),
      note: 'This is the first scroll-stop threshold.',
    },
    {
      label: 'Stay past 5s',
      value: formatPct(predictions.pStay5s),
      note: 'This is where the hook proves it can hold.',
    },
    {
      label: 'Hook-gated viral odds',
      value: formatPct(predictions.viralProbability),
      note: 'This is intentionally gated by the opening, not the whole edit.',
    },
  ];

  return (
    <motion.section
      aria-label="Hook survival"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.1 }}
      className="mt-8 sm:mt-10"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Hook survival
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          {roast.analysisExpansion === 'hook_only' ? 'hook-only report' : roast.analysisExpansion === 'extended_10s' ? 'extended to 10s' : 'full secondary analysis'}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm sm:grid-cols-3 sm:p-6">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-white/[0.06] bg-zinc-950/60 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">{row.label}</div>
            <div className="mt-3 text-3xl font-black text-white">{row.value}</div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{row.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
        {roast.hookSummary?.earlyDropNote || roast.hookSummary?.distributionRisk || roast.firstFiveSecondsDiagnosis?.retentionRisk}
      </p>
    </motion.section>
  );
}
