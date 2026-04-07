'use client';

import type { AgentRoast, ActionPlanStep } from '@/lib/types';
import { AGENTS } from '@/lib/agents';

interface Props {
  agents: AgentRoast[];
  actionPlan?: ActionPlanStep[];
}

function isAgentFailed(a: AgentRoast): boolean {
  if (a.failed) return true;
  // Legacy data: agents that errored were stored with score 50 and "Analysis error" findings
  if (a.findings?.[0]?.startsWith('Analysis error')) return true;
  return false;
}

export function ViralDiagnosisSummary({ agents, actionPlan }: Props) {
  const working = agents.filter(a => !isAgentFailed(a) && a.score >= 70);
  const needsWork = agents.filter(a => !isAgentFailed(a) && a.score < 70);
  const failed = agents.filter(a => isAgentFailed(a));
  const quickWins = actionPlan?.filter(s => s.priority === 'P1').slice(0, 3) ?? [];

  return (
    <div className="space-y-4">
      {/* What's Working */}
      {working.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✅</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">What&apos;s Working</h3>
          </div>
          <div className="space-y-2">
            {working.map(a => {
              const agent = AGENTS.find(ag => ag.key === a.agent);
              return (
                <div key={a.agent} className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
                  <span className="text-lg shrink-0">{agent?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">{agent?.name}</span>
                      <span className="text-xs font-bold text-emerald-400">{a.score}/100</span>
                    </div>
                    {a.findings[0] && (
                      <p className="text-xs text-zinc-400 mt-1">{a.findings[0]}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Critical Issues */}
      {needsWork.length > 0 && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔴</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-red-400">Critical Issues</h3>
          </div>
          <div className="space-y-3">
            {needsWork.map(a => {
              const agent = AGENTS.find(ag => ag.key === a.agent);
              return (
                <div key={a.agent} className="rounded-xl border border-red-500/15 bg-black/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{agent?.emoji}</span>
                    <span className="text-sm font-semibold text-zinc-200">{agent?.name}</span>
                    <span className="text-xs font-bold text-red-400">{a.score}/100</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-red-500/10 bg-red-500/[0.04] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Problem</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{a.findings[0] || a.roastText}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">What to do</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{a.improvementTip}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <div className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚡</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-orange-400">Quick Wins - Highest Impact Fixes</h3>
          </div>
          <div className="space-y-2">
            {quickWins.map((step, idx) => {
              const agent = AGENTS.find(ag => ag.key === step.dimension);
              return (
                <div key={idx} className="rounded-xl border border-orange-500/15 bg-black/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">P1</span>
                    <span className="text-xs text-zinc-500">{agent?.emoji} {agent?.name}</span>
                  </div>
                  <p className="text-sm text-zinc-200 font-medium mb-1">{step.issue}</p>
                  <p className="text-xs text-emerald-300">→ {step.doThis}</p>
                  {step.example && (
                    <p className="text-xs text-zinc-500 italic mt-1">e.g. &ldquo;{step.example}&rdquo;</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unavailable */}
      {failed.length > 0 && (
        <div className="rounded-2xl border border-zinc-700/40 bg-zinc-800/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚪</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Analysis Unavailable</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {failed.map(a => {
              const agent = AGENTS.find(ag => ag.key === a.agent);
              return (
                <span key={a.agent} className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-500">
                  {agent?.emoji} {agent?.name} - {a.failureReason || 'not evaluated'}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
