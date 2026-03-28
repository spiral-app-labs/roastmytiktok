'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { fetchHistory, getChronicIssues, getEscalationLevel, HistoryEntry, ChronicIssue } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import { GlassCard, ScoreBadge, PageHeader, EmptyState, LoadingSkeleton } from '@/components/ui';

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RepeatOffenderBadge({ count, dimension }: { count: number; dimension: string }) {
  const agent = AGENTS.find(a => a.key === dimension);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
      {count}× {agent?.name ?? dimension}
    </span>
  );
}

function HistoryCard({ entry, index, chronic }: { entry: HistoryEntry; index: number; chronic: ChronicIssue[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
    >
      <GlassCard variant="interactive" className="relative p-5 group">
        {index === 0 && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
            Latest
          </div>
        )}

        <div className="flex items-start gap-4">
          <ScoreBadge score={entry.overallScore} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                {entry.filename && (
                  <p className="text-sm font-semibold text-zinc-200 truncate">{entry.filename}</p>
                )}
                {entry.url && !entry.filename && (
                  <p className="text-xs text-zinc-400 truncate">{entry.url}</p>
                )}
                {!entry.filename && !entry.url && (
                  <p className="text-sm text-zinc-500 italic">Untitled roast</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
              <span>{getRelativeDate(entry.date)}</span>
              <span>·</span>
              <span>{entry.source === 'upload' ? '📎 Upload' : '🔗 URL'}</span>
            </div>

            {/* Agent score pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(entry.agentScores).map(([dim, score]) => {
                const agent = AGENTS.find(a => a.key === dim);
                const isWeak = chronic.some(c => c.dimension === dim);
                return (
                  <div
                    key={dim}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border ${
                      isWeak
                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                        : score >= 70
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : score >= 50
                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        : 'bg-zinc-800/60 border-zinc-700/30 text-zinc-400'
                    }`}
                  >
                    <span>{agent?.emoji}</span>
                    <span className="font-semibold">{score}</span>
                    {isWeak && <span className="text-red-500 text-[10px]">↑recurring</span>}
                  </div>
                );
              })}
            </div>

            {/* Verdict excerpt */}
            {entry.verdict && (
              <p className="text-xs text-zinc-500 italic line-clamp-2 mb-3">
                &ldquo;{entry.verdict}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between mt-1 pt-3 border-t border-zinc-800/40">
          <div className="flex flex-wrap gap-1">
            {chronic.filter(c => Object.keys(entry.agentScores).includes(c.dimension)).slice(0, 2).map((c, i) => (
              <RepeatOffenderBadge key={i} count={c.occurrences} dimension={c.dimension} />
            ))}
          </div>
          <Link
            href={`/roast/${entry.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/15 px-3 py-1.5 rounded-lg transition-all"
          >
            View Roast →
          </Link>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [chronic, setChronic] = useState<ChronicIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory().then(h => {
      setHistory(h);
      setChronic(getChronicIssues(h));
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen pb-20 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-gradient-to-b from-orange-500/6 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PageHeader
            title={<span className="fire-text">Your Roast History</span>}
            subtitle={
              loading
                ? 'Loading your shame...'
                : history.length === 0
                  ? 'No roasts yet. Go get destroyed.'
                  : `${history.length} roast${history.length !== 1 ? 's' : ''}. ${history.length >= 3 ? 'The pattern is becoming clear.' : 'Keep going.'}`
            }
            backHref="/"
            backLabel="← Roast another"
          />
        </motion.div>

        {/* Chronic Issues Alert */}
        {chronic.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <GlassCard className="bg-red-500/5 border border-red-500/25 p-6">
              <h2 className="text-base font-bold text-red-400 mb-1 flex items-center gap-2">
                <span>🚨</span> Repeat Offender Alert
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                These issues keep showing up across your roasts. We&apos;ve tried being nice about it.
              </p>
              <div className="space-y-3">
                {chronic.slice(0, 5).map((issue, i) => {
                  const agent = AGENTS.find(a => a.key === issue.dimension);
                  const { label } = getEscalationLevel(issue.occurrences);
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xl shrink-0">{agent?.emoji ?? '⚠️'}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-zinc-200">{agent?.name ?? issue.dimension}</span>
                          <RepeatOffenderBadge count={issue.occurrences} dimension={issue.dimension} />
                        </div>
                        <p className="text-sm text-zinc-400">{issue.finding}</p>
                        <p className="text-xs text-red-400 mt-0.5 italic">{label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && history.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <EmptyState
              icon="🎬"
              title="No roasts yet"
              description="Upload your first TikTok and let the AI agents tear it apart. It'll make you better. Probably."
              cta={{ label: 'Get Roasted', icon: '🔥', href: '/' }}
            />
          </motion.div>
        )}

        {/* History list */}
        {!loading && history.length > 0 && (
          <div className="space-y-4">
            {history.map((entry, i) => (
              <HistoryCard key={entry.id} entry={entry} index={i} chronic={chronic} />
            ))}
          </div>
        )}

        {/* Clean bill of health */}
        {history.length >= 2 && chronic.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <GlassCard className="bg-green-500/5 border border-green-500/20 p-5 text-center">
              <p className="text-green-400 font-semibold">No repeat issues detected</p>
              <p className="text-zinc-500 text-sm mt-1">
                You&apos;re actually listening. We&apos;re genuinely surprised.
              </p>
            </GlassCard>
          </motion.div>
        )}

        {/* Upload another CTA */}
        {!loading && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-400 transition-colors"
            >
              + Upload another video
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
