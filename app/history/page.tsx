'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { fetchHistory, HistoryEntry } from '@/lib/history';
import { GlassCard, EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui';
import { ScoreRing } from '@/components/ScoreRing';

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

function getLetterGrade(score: number): { grade: string; color: string; bg: string; border: string } {
  if (score >= 90) return { grade: 'A+', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
  if (score >= 80) return { grade: 'A',  color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
  if (score >= 70) return { grade: 'B',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
  if (score >= 60) return { grade: 'C',  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
  if (score >= 50) return { grade: 'D',  color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  return { grade: 'F', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40' };
}

function truncateTitle(entry: HistoryEntry): string {
  const raw = entry.verdict || entry.filename || entry.url || 'Untitled roast';
  return raw.length > 50 ? raw.slice(0, 50) + '…' : raw;
}

function VideoHistoryCard({ entry, index }: { entry: HistoryEntry; index: number }) {
  const { grade, color, bg, border } = getLetterGrade(entry.overallScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05, duration: 0.4, ease: 'easeOut' }}
    >
      <Link href={`/roast/${entry.id}`} className="block group">
        <GlassCard
          variant="interactive"
          className="relative h-full overflow-hidden p-5 transition-all duration-200 group-hover:border-sky-500/30"
        >
          {/* Gradient border shimmer on hover */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-500/6 via-transparent to-violet-500/6 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Top: score ring + letter grade */}
          <div className="flex items-center justify-between mb-4">
            <ScoreRing score={entry.overallScore} size={56} />
            <span
              className={`text-2xl font-black px-3 py-1 rounded-xl border ${color} ${bg} ${border}`}
            >
              {grade}
            </span>
          </div>

          {/* Title (truncated description) */}
          <h3 className="text-sm font-semibold text-zinc-200 leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
            {truncateTitle(entry)}
          </h3>

          {/* Meta: time ago + source */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
            <span>{getRelativeDate(entry.date)}</span>
            <span>·</span>
            <span>{entry.source === 'upload' ? '📎 Upload' : 'Imported result'}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/40">
            <span className="flex items-center gap-1 text-xs font-semibold text-sky-400 transition-colors group-hover:text-sky-300">
              View Roast
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform group-hover:translate-x-0.5">
                <path d="M2.5 6h7m0 0L6.5 3m3 3L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
              entry.overallScore >= 70
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : entry.overallScore >= 50
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {entry.overallScore >= 70 ? 'strong' : entry.overallScore >= 50 ? 'fixable' : 'needs work'}
            </span>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory().then(h => {
      // Sort most recent first
      const sorted = [...h].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(sorted);
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen pb-20 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 bg-gradient-to-b from-sky-500/8 to-transparent blur-3xl" />
        <div className="absolute bottom-1/3 right-0 h-[400px] w-[400px] bg-gradient-to-tl from-violet-500/6 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <PageHeader
            title={<span className="bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">Your Roast History</span>}
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

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
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
            className="max-w-md mx-auto"
          >
            <EmptyState
              icon="🎬"
              title="Upload your first video"
              description="We'll analyze your hook, pacing, audio, and CTAs — and tell you the #1 thing to fix before you post."
              cta={{ label: 'Upload your first video', icon: '↑', href: '/dashboard' }}
            />
          </motion.div>
        )}

        {/* Summary stats bar */}
        {!loading && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          >
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Total</p>
              <p className="text-lg font-bold text-white">{history.length}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Average</p>
              <p className="text-lg font-bold text-orange-400">{Math.round(history.reduce((s, h) => s + h.overallScore, 0) / history.length)}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Best</p>
              <p className="text-lg font-bold text-green-400">{Math.max(...history.map(h => h.overallScore))}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Needs Work</p>
              <p className="text-lg font-bold text-red-400">{history.filter(h => h.overallScore < 50).length}</p>
            </div>
          </motion.div>
        )}

        {/* Video grid */}
        {!loading && history.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((entry, i) => (
                <VideoHistoryCard key={entry.id} entry={entry} index={i} />
              ))}
            </div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
            >
              {history.length >= 2 && (
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-sky-400 transition-colors hover:text-sky-300"
                >
                  ⚔️ Compare two videos
                </Link>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-sky-400"
              >
                + Upload another video
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}
