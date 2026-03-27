'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getHistory, getChronicIssues, HistoryEntry, ChronicIssue } from '@/lib/history';
import { AGENTS } from '@/lib/agents';

function ScoreChip({ score }: { score: number }) {
  const color =
    score >= 70 ? 'text-green-400 bg-green-500/10 border-green-500/30' :
    score >= 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
    'text-red-400 bg-red-500/10 border-red-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-sm font-bold ${color}`}>
      {score}
    </span>
  );
}

function RepeatOffenderBadge({ count, dimension }: { count: number; dimension: string }) {
  const agent = AGENTS.find(a => a.key === dimension);
  const label = `${count}× ${agent?.name ?? dimension} offender`;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
      🔁 {label}
    </span>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [chronic, setChronic] = useState<ChronicIssue[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const h = getHistory();
    setHistory(h);
    setChronic(getChronicIssues(h));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen pb-20 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-orange-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link href="/" className="text-sm text-zinc-500 hover:text-orange-400 transition-colors mb-4 inline-block">
            ← Roast another
          </Link>
          <h1 className="text-4xl font-bold">
            <span className="fire-text">Your Roast History</span>
          </h1>
          <p className="text-zinc-400 mt-2">
            {history.length === 0
              ? 'No roasts yet. Go get destroyed.'
              : `${history.length} roast${history.length !== 1 ? 's' : ''}. ${history.length >= 3 ? 'The pattern is becoming clear.' : 'Keep going.'}`}
          </p>
        </motion.div>

        {/* Chronic Issues Alert */}
        {chronic.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 bg-red-500/5 border border-red-500/30 rounded-2xl p-6"
          >
            <h2 className="text-lg font-bold text-red-400 mb-1 flex items-center gap-2">
              🔁 Repeat Offender Alert
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              These issues keep showing up across your roasts. We&apos;ve tried being nice about it.
            </p>
            <div className="space-y-3">
              {chronic.slice(0, 5).map((issue, i) => {
                const agent = AGENTS.find(a => a.key === issue.dimension);
                const escalation =
                  issue.occurrences >= 4 ? "At this point it's personal." :
                  issue.occurrences === 3 ? "We've said this three times now." :
                  "We've mentioned this before.";
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{agent?.emoji ?? '⚠️'}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-zinc-200">{agent?.name ?? issue.dimension}</span>
                        <RepeatOffenderBadge count={issue.occurrences} dimension={issue.dimension} />
                      </div>
                      <p className="text-sm text-zinc-400">{issue.finding}</p>
                      <p className="text-xs text-red-400 mt-0.5 italic">{escalation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* History list */}
        {history.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-zinc-500">No roast history yet.</p>
            <Link
              href="/"
              className="mt-4 inline-block fire-gradient text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Get Roasted
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 hover:border-orange-500/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-500">
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500">{entry.source === 'upload' ? '📁 Upload' : '🔗 URL'}</span>
                    </div>
                    {entry.filename && (
                      <p className="text-sm text-zinc-400 truncate">{entry.filename}</p>
                    )}
                    {entry.url && !entry.filename && (
                      <p className="text-xs text-zinc-500 truncate">{entry.url}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <ScoreChip score={entry.overallScore} />
                    {i === 0 && <span className="text-xs text-zinc-600">latest</span>}
                  </div>
                </div>

                {/* Agent scores */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(entry.agentScores).map(([dim, score]) => {
                    const agent = AGENTS.find(a => a.key === dim);
                    const chronicDim = chronic.find(c => c.dimension === dim);
                    return (
                      <div
                        key={dim}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                          chronicDim
                            ? 'bg-red-500/10 border-red-500/20 text-red-300'
                            : 'bg-zinc-800/60 border-zinc-700/30 text-zinc-400'
                        }`}
                      >
                        <span>{agent?.emoji}</span>
                        <span>{score}</span>
                        {chronicDim && <span className="text-red-500">↻</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Verdict excerpt */}
                <p className="text-xs text-zinc-500 italic line-clamp-2">
                  &ldquo;{entry.verdict}&rdquo;
                </p>

                <Link
                  href={`/roast/${entry.id}`}
                  className="mt-3 inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View full roast →
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Progress celebration placeholder */}
        {history.length >= 2 && chronic.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-green-500/5 border border-green-500/20 rounded-2xl p-5 text-center"
          >
            <p className="text-green-400 font-semibold">🎉 No repeat issues detected</p>
            <p className="text-zinc-500 text-sm mt-1">
              You&apos;re actually listening. We&apos;re genuinely surprised.
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
