'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { ScoreRing } from '@/components/ScoreRing';
import { GlassCard } from '@/components/ui';

type TimePeriod = 'all' | 'week' | 'today';
type SortOrder = 'highest' | 'lowest' | 'recent';

interface LeaderboardEntry {
  id: string;
  overall_score: number;
  verdict: string;
  tiktok_url: string | null;
  created_at: string;
  result_json: {
    metadata?: { description?: string };
    agents?: Array<{ findings?: string[] }>;
  } | null;
}

function getLetterGrade(score: number) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 45) return 'D+';
  if (score >= 40) return 'D';
  return 'F';
}

function gradeColor(score: number) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function rankBadge(rank: number) {
  if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (rank === 2) return { emoji: '🥈', color: 'text-zinc-300 bg-zinc-300/10 border-zinc-300/30' };
  if (rank === 3) return { emoji: '🥉', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
  return { emoji: `#${rank}`, color: 'text-zinc-500 bg-zinc-800/60 border-zinc-700/50' };
}

function getTopFinding(entry: LeaderboardEntry): string {
  const findings = entry.result_json?.agents?.flatMap((a) => a.findings ?? []).filter(Boolean);
  return findings?.[0] ?? entry.verdict ?? 'No findings available';
}

function getTikTokUsername(url: string | null): string {
  if (!url) return 'Unknown';
  const match = url.match(/@([\w.]+)/);
  return match ? `@${match[1]}` : 'Unknown';
}

const PAGE_SIZE = 20;

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [sort, setSort] = useState<SortOrder>('highest');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(
    async (pageNum: number, timePeriod: TimePeriod, sortOrder: SortOrder) => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from('rmt_roast_sessions')
        .select('id, overall_score, verdict, tiktok_url, created_at, result_json', { count: 'exact' })
        .not('overall_score', 'is', null)
        .gt('overall_score', 0);

      // Time filter
      if (timePeriod === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        query = query.gte('created_at', start.toISOString());
      } else if (timePeriod === 'week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        query = query.gte('created_at', start.toISOString());
      }

      // Sort
      if (sortOrder === 'highest') {
        query = query.order('overall_score', { ascending: false });
      } else if (sortOrder === 'lowest') {
        query = query.order('overall_score', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query = query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;

      if (!error && data) {
        if (pageNum === 0) {
          setEntries(data as LeaderboardEntry[]);
        } else {
          setEntries((prev) => [...prev, ...(data as LeaderboardEntry[])]);
        }
        setTotal(count ?? 0);
        setHasMore(data.length === PAGE_SIZE);
      }

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    setPage(0);
    setEntries([]);
    fetchEntries(0, period, sort);
  }, [period, sort, fetchEntries]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchEntries(next, period, sort);
  }

  const globalOffset = page * PAGE_SIZE;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏆</span>
          <h1 className="text-3xl font-black tracking-tight text-white">Leaderboard</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Top-ranked TikToks by roast score — see who&apos;s getting destroyed publicly.
        </p>
        {total > 0 && (
          <p className="text-zinc-500 text-xs mt-1">{total.toLocaleString()} roasts ranked</p>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap gap-3 mb-8"
      >
        {/* Time period */}
        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-1">
          {(['all', 'week', 'today'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                period === p
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : 'Today'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-1">
          {([
            { key: 'highest', label: 'Highest Score' },
            { key: 'lowest', label: 'Lowest Score' },
            { key: 'recent', label: 'Most Recent' },
          ] as { key: SortOrder; label: string }[]).map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                sort === s.key
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Entries */}
      <div className="space-y-3">
        {entries.map((entry, idx) => {
          const rank = globalOffset + idx + 1;
          const { emoji, color } = rankBadge(rank);
          const grade = getLetterGrade(entry.overall_score);
          const finding = getTopFinding(entry);
          const username = getTikTokUsername(entry.tiktok_url);

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
            >
              <Link href={`/roast/${entry.id}`}>
                <GlassCard variant="interactive" className="p-4 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border text-sm font-bold ${color}`}
                    >
                      {rank <= 3 ? (
                        <span className="text-xl">{emoji}</span>
                      ) : (
                        <span className="text-xs">{emoji}</span>
                      )}
                    </div>

                    {/* Score ring */}
                    <div className="flex-shrink-0">
                      <ScoreRing score={entry.overall_score} size={52} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-zinc-200 truncate">{username}</span>
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 ${gradeColor(entry.overall_score)}`}
                        >
                          {grade}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{finding}</p>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 text-zinc-600 group-hover:text-orange-400 transition-colors">
                      →
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-4xl mb-3">🦗</p>
          <p className="text-zinc-400 text-sm">No roasts found for this filter.</p>
          <p className="text-zinc-600 text-xs mt-1">Try switching to &quot;All Time&quot; or roast something first.</p>
        </motion.div>
      )}

      {/* Load more */}
      {hasMore && !loading && entries.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-xl transition-all"
          >
            Load More
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-zinc-900/40 border border-zinc-800/30 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}
    </main>
  );
}
