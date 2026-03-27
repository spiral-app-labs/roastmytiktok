'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { MOCK_ROAST } from '@/lib/mock-data';
import { AgentCard } from '@/components/AgentCard';
import { ScoreRing } from '@/components/ScoreRing';
import { saveToHistory, getChronicIssues, getHistory, getFixedIssues } from '@/lib/history';
import Link from 'next/link';
import { DimensionKey } from '@/lib/types';

export default function RoastPage() {
  const roast = MOCK_ROAST;
  const searchParams = useSearchParams();

  useEffect(() => {
    // Save this roast to history on first view
    const source = searchParams.get('source') === 'upload' ? 'upload' : 'url';
    const filename = searchParams.get('filename') ?? undefined;
    saveToHistory(roast, source, filename);
  }, [roast, searchParams]);

  // Detect chronic issues and fixed issues for escalation UI
  const history = getHistory();
  const findings = Object.fromEntries(
    roast.agents.map(a => [a.agent, a.findings.slice(0, 2)])
  ) as Record<DimensionKey, string[]>;
  const chronicIssues = getChronicIssues(history);
  const fixedIssues = getFixedIssues(findings, history);

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

        {/* Fixed issues celebration */}
        {fixedIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-6 bg-green-500/5 border border-green-500/20 rounded-2xl p-5"
          >
            <p className="text-green-400 font-semibold mb-2">🎉 Progress Detected</p>
            {fixedIssues.map((f, i) => (
              <p key={i} className="text-sm text-zinc-400">
                You finally fixed <span className="text-green-400 font-medium">{f.dimension}</span>: {f.finding.slice(0, 60)}. We&apos;re proud. Genuinely.
              </p>
            ))}
          </motion.div>
        )}

        {/* Chronic issue warning */}
        {chronicIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-5"
          >
            <p className="text-red-400 font-semibold mb-1">🔁 Repeat Offender</p>
            <p className="text-sm text-zinc-400 mb-2">These issues keep showing up. We&apos;ve flagged them before.</p>
            {chronicIssues.slice(0, 3).map((c, i) => (
              <p key={i} className="text-xs text-zinc-500 mt-1">
                <span className="text-red-400 font-medium">{c.dimension}</span> · {c.occurrences}× · {c.finding.slice(0, 60)}
              </p>
            ))}
            <Link href="/history" className="mt-3 inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors">
              View full history →
            </Link>
          </motion.div>
        )}

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
