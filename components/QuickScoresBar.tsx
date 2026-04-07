'use client';

import { motion } from 'framer-motion';
import type { AgentRoast } from '@/lib/types';
import { AGENTS } from '@/lib/agents';

interface Props {
  agents: AgentRoast[];
}

function isAgentFailed(a: AgentRoast): boolean {
  if (a.failed) return true;
  if (a.findings?.[0]?.startsWith('Analysis error')) return true;
  return false;
}

export function QuickScoresBar({ agents }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 px-5 py-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Score Breakdown</p>
      <div className="space-y-3">
        {agents.map((a, idx) => {
          const agent = AGENTS.find(ag => ag.key === a.agent);
          const failed = isAgentFailed(a);

          const barColor = failed ? 'bg-zinc-700'
            : a.score >= 70 ? 'bg-emerald-500'
            : a.score >= 50 ? 'bg-yellow-500'
            : 'bg-red-500';

          const textColor = failed ? 'text-zinc-600'
            : a.score >= 70 ? 'text-emerald-400'
            : a.score >= 50 ? 'text-yellow-400'
            : 'text-red-400';

          return (
            <div key={a.agent} className="flex items-center gap-3">
              <p className="text-xs text-zinc-400 w-24 shrink-0 truncate">
                {agent?.displayName ?? a.agent}
              </p>
              <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: failed ? '0%' : `${a.score}%` }}
                  transition={{ duration: 1, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                />
              </div>
              <p className={`text-xs font-bold tabular-nums w-8 text-right ${textColor}`}>
                {failed ? '\u2014' : a.score}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
