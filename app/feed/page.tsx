'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { ScoreRing } from '@/components/ScoreRing';
import { GlassCard } from '@/components/ui';

interface FeedEntry {
  id: string;
  overall_score: number;
  verdict: string;
  tiktok_url: string | null;
  created_at: string;
  result_json: {
    metadata?: { description?: string };
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
  if (score >= 80) return 'text-green-400 bg-green-400/10 border-green-400/20';
  if (score >= 60) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  if (score >= 40) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
  return 'text-red-400 bg-red-400/10 border-red-400/20';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getTikTokUsername(url: string | null): string {
  if (!url) return null as unknown as string;
  const match = url.match(/@([\w.]+)/);
  return match ? `@${match[1]}` : null as unknown as string;
}

const PAGE_SIZE = 20;

export default function FeedPage() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (afterCursor: string | null, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    const supabase = createClient();

    let query = supabase
      .from('rmt_roast_sessions')
      .select('id, overall_score, verdict, tiktok_url, created_at, result_json')
      .not('overall_score', 'is', null)
      .gt('overall_score', 0)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (afterCursor) {
      query = query.lt('created_at', afterCursor);
    }

    const { data, error } = await query;

    if (!error && data) {
      const typed = data as FeedEntry[];
      if (append) {
        setEntries((prev) => [...prev, ...typed]);
      } else {
        setEntries(typed);
      }
      if (typed.length > 0) {
        setCursor(typed[typed.length - 1].created_at);
      }
      setHasMore(typed.length === PAGE_SIZE);
    }

    if (append) setLoadingMore(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    fetchPage(null, false);
  }, [fetchPage]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPage(cursor, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, cursor, fetchPage]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🔥</span>
          <h1 className="text-3xl font-black tracking-tight text-white">Roast Feed</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Latest TikToks being put through the gauntlet — live, unfiltered, brutal.
        </p>
      </motion.div>

      {/* Feed cards */}
      <div className="space-y-4">
        {entries.map((entry, idx) => {
          const grade = getLetterGrade(entry.overall_score);
          const gradeClass = gradeColor(entry.overall_score);
          const username = getTikTokUsername(entry.tiktok_url);
          const ago = timeAgo(entry.created_at);

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.5) }}
            >
              <Link href={`/roast/${entry.id}`}>
                <GlassCard variant="interactive" className="p-5 cursor-pointer group">
                  <div className="flex items-start gap-4">
                    {/* Score ring */}
                    <div className="flex-shrink-0 pt-0.5">
                      <ScoreRing score={entry.overall_score} size={56} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {/* Grade badge */}
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${gradeClass}`}
                        >
                          {grade}
                        </span>

                        {/* Username */}
                        {username && (
                          <span className="text-xs text-zinc-400 font-medium">{username}</span>
                        )}

                        {/* Time */}
                        <span className="text-xs text-zinc-600 ml-auto">{ago}</span>
                      </div>

                      {/* Verdict */}
                      <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                        {entry.verdict || 'No verdict available.'}
                      </p>

                      {/* CTA */}
                      <div className="mt-3 flex items-center gap-1 text-xs text-zinc-600 group-hover:text-orange-400 transition-colors">
                        <span>View full roast</span>
                        <span>→</span>
                      </div>
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
          <p className="text-4xl mb-3">🌵</p>
          <p className="text-zinc-400 text-sm">The feed is empty — be the first to get roasted.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl"
          >
            🔥 Roast a TikTok
          </Link>
        </motion.div>
      )}

      {/* Initial loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-zinc-900/40 border border-zinc-800/30 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      {/* End of feed */}
      {!hasMore && entries.length > 0 && !loadingMore && (
        <p className="text-center text-xs text-zinc-600 py-6">You&apos;ve seen all the carnage. 💀</p>
      )}
    </main>
  );
}
