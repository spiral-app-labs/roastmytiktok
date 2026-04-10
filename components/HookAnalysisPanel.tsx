'use client';

import type { HookAnalysis, HookIdentification as HookIdentificationType } from '@/lib/types';
import { HookIdentification } from '@/components/HookIdentification';

interface Props {
  hookAnalysis: HookAnalysis;
  hookIdentification?: HookIdentificationType;
}

function scoreTone(score: number): string {
  if (score >= 8) return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/[0.08]';
  if (score >= 6) return 'text-amber-300 border-amber-500/30 bg-amber-500/[0.08]';
  return 'text-rose-300 border-rose-500/30 bg-rose-500/[0.08]';
}

export function HookAnalysisPanel({ hookAnalysis, hookIdentification }: Props) {
  const dimensions = [
    { key: 'visual', label: 'Visual Hook', value: hookAnalysis.dimensions?.visual },
    { key: 'audio', label: 'Audio Hook', value: hookAnalysis.dimensions?.audio },
    { key: 'narrative', label: 'Narrative Hook', value: hookAnalysis.dimensions?.narrative },
  ].filter((dimension): dimension is { key: string; label: string; value: { score: number; justification: string } } => Boolean(dimension.value));

  const overallScore = hookAnalysis.overallScore ?? Math.round((hookAnalysis.scores.hookScore || 0) / 10);
  const topFixes = hookAnalysis.topFixes ?? hookAnalysis.editFixes.map((fix) => fix.do);

  return (
    <section className="mb-10 rounded-[28px] border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.09] via-zinc-950/95 to-zinc-950/95 p-5 shadow-2xl shadow-orange-500/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300/80 mb-3">Hook Analysis</p>
          <h2 className="text-2xl font-black text-white leading-tight">The first 3-5 seconds get their own verdict.</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">{hookAnalysis.summary}</p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 text-center ${scoreTone(overallScore)}`}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Overall Hook</div>
          <div className="mt-2 text-4xl font-black">{overallScore}<span className="text-lg font-semibold text-zinc-400">/10</span></div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {dimensions.map((dimension) => (
          <div key={dimension.key} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{dimension.label}</p>
              <div className={`rounded-full border px-2.5 py-1 text-sm font-bold ${scoreTone(dimension.value.score)}`}>
                {dimension.value.score}/10
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-200">{dimension.value.justification}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Top Hook Fixes</p>
        <div className="mt-3 space-y-2">
          {topFixes.slice(0, 2).map((fix, index) => (
            <div key={fix} className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-300">Fix {index + 1}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-200">{fix}</p>
            </div>
          ))}
        </div>
      </div>

      {hookIdentification ? (
        <div className="mt-5">
          <HookIdentification hookId={hookIdentification} />
        </div>
      ) : null}
    </section>
  );
}
