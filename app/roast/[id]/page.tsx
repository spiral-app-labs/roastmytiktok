'use client';

import { motion } from 'framer-motion';
import { MOCK_ROAST } from '@/lib/mock-data';
import { AgentCard } from '@/components/AgentCard';
import { ScoreRing } from '@/components/ScoreRing';
import Link from 'next/link';

export default function RoastPage() {
  const roast = MOCK_ROAST;

  return (
    <main className="min-h-screen pb-20 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-red-500/5 via-orange-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-orange-400 transition-colors mb-6 inline-block"
          >
            &larr; Roast another
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold mt-4">
            <span className="fire-text">The Verdict</span>
          </h1>

          {/* Overall Score */}
          <div className="flex flex-col items-center mt-8">
            <ScoreRing score={roast.overallScore} size={120} />
            <p className="text-zinc-400 text-sm mt-4 max-w-md mx-auto">
              Overall Score
            </p>
          </div>

          {/* Verdict */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 max-w-2xl mx-auto"
          >
            <p className="text-sm text-zinc-300 leading-relaxed italic">
              &ldquo;{roast.verdict}&rdquo;
            </p>
          </motion.div>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-zinc-500"
          >
            <span>{roast.metadata.views.toLocaleString()} views</span>
            <span className="text-zinc-700">|</span>
            <span>{roast.metadata.likes} likes</span>
            <span className="text-zinc-700">|</span>
            <span>{roast.metadata.comments} comments</span>
            <span className="text-zinc-700">|</span>
            <span>{roast.metadata.duration}s duration</span>
            <span className="text-zinc-700">|</span>
            <span>{roast.metadata.hashtags.join(' ')}</span>
          </motion.div>
        </motion.div>

        {/* Agent Roast Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roast.agents.map((agentRoast, i) => (
            <AgentCard key={agentRoast.agent} roast={agentRoast} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center mt-12"
        >
          <Link
            href="/"
            className="inline-block fire-gradient text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
          >
            Roast Another TikTok
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
