'use client';

import { motion } from 'framer-motion';
import { AgentRoast } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import { ScoreRing } from './ScoreRing';
import Link from 'next/link';

interface AgentCardProps {
  roast: AgentRoast;
  index: number;
  locked?: boolean;
}

export function AgentCard({ roast, index, locked = false }: AgentCardProps) {
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

      {locked ? (
        /* Locked state: blurred content + upgrade overlay */
        <div className="relative">
          {/* Blurred placeholder content */}
          <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
            <p className="text-sm text-zinc-300 leading-relaxed mb-4 italic">
              &ldquo;This analysis contains detailed insights about your content that will help you improve...&rdquo;
            </p>
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Findings</h4>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="text-red-400 mt-0.5">&#x2022;</span>
                  Detailed finding about your content performance
                </li>
                <li className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="text-red-400 mt-0.5">&#x2022;</span>
                  Another insight about what could be improved
                </li>
              </ul>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
              <h4 className="text-xs font-semibold text-orange-400 mb-1">Fix This</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Specific actionable tip to improve this area</p>
            </div>
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/60 rounded-lg">
            <svg className="w-8 h-8 text-zinc-500 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm text-zinc-400 text-center mb-3 px-4">
              Upgrade to Pro to unlock <span className="text-orange-400 font-semibold">{agent.name}</span> analysis
            </p>
            <Link
              href="/pricing"
              className="fire-gradient text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      ) : (
        /* Unlocked state: full content */
        <>
          {/* Roast Text */}
          <p className="text-sm text-zinc-300 leading-relaxed mb-4 italic">
            &ldquo;{roast.roastText}&rdquo;
          </p>

          {/* Findings */}
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

          {/* Improvement Tip */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
            <h4 className="text-xs font-semibold text-orange-400 mb-1">Fix This</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">{roast.improvementTip}</p>
          </div>
        </>
      )}
    </motion.div>
  );
}
