'use client';

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
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Score Breakdown</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {agents.map(a => {
          const agent = AGENTS.find(ag => ag.key === a.agent);
          const failed = isAgentFailed(a);
          const color = failed ? 'text-zinc-600' :
            a.score >= 70 ? 'text-emerald-400' :
            a.score >= 50 ? 'text-yellow-400' :
            'text-red-400';
          const isHook = a.agent === 'hook';

          return (
            <div key={a.agent} className="flex items-center gap-1.5 text-sm">
              <span className="text-zinc-500 flex items-center gap-1">
                {agent?.displayName ?? a.agent}
                {isHook && (
                  <span
                    title="Hook = first 0–3 seconds of the video (may extend to 5s for some formats)"
                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-zinc-700 text-zinc-400 text-[9px] font-bold cursor-default select-none leading-none"
                    aria-label="Hook definition: first 0–3 seconds (may extend to 5s)"
                  >
                    ?
                  </span>
                )}
                :
              </span>
              <span className={`font-bold ${color}`}>
                {failed ? '\u2014' : a.score}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10px] text-zinc-600">
        Hook = first 0–3s of the video (may extend to 5s for some formats)
      </p>
    </div>
  );
}
