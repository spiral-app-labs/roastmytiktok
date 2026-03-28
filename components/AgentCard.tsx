'use client';

import { motion } from 'framer-motion';
import { AgentRoast } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import { ScoreRing } from './ScoreRing';

interface AgentCardProps {
  roast: AgentRoast;
  index: number;
}

export function AgentCard({ roast, index }: AgentCardProps) {
  const agent = AGENTS.find((a) => a.key === roast.agent);
  if (!agent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-6 hover:border-orange-500/30 transition-all card-glow relative overflow-hidden"
    >
      {/* Header — always visible */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{agent.emoji}</span>
          <div>
            <h3 className="font-bold text-white">{agent.name}</h3>
            <p className="text-xs text-zinc-500">{agent.analyzes}</p>
          </div>
        </div>
        <ScoreRing score={roast.score} size={56} />
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed mb-4 italic">
        &ldquo;{roast.roastText}&rdquo;
      </p>

      <div className="space-y-2 mb-4">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Findings
        </h4>
        <ul className="space-y-1.5">
          {roast.findings.map((finding, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
              <span className="text-red-400 mt-0.5">&#x2022;</span>
              {finding}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
        <h4 className="text-xs font-semibold text-orange-400 mb-1">Fix This</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">{roast.improvementTip}</p>
      </div>
    </motion.div>
  );
}
