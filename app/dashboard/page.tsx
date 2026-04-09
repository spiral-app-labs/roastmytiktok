'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getHistory, type HistoryEntry } from '@/lib/history';
import DashboardVideoCard from '@/components/DashboardVideoCard';
import UploadModal from '@/components/dashboard/UploadModal';

const PAGE_SIZE = 20;

function relativeDate(dateStr: string): string {
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

function getStoredThumb(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`videoThumb_${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dataUrl?: string };
    return parsed.dataUrl ?? null;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setHistory(getHistory());
        setAuthorized(true);
        setChecking(false);
        return;
      }

      router.push('/login?redirect=/dashboard');
    }

    checkAccess();
  }, [router]);

  const closeUpload = useCallback(() => {
    setUploadOpen(false);
    // Refresh history in case the user returned from a completed upload.
    setHistory(getHistory());
  }, []);

  const visibleEntries = useMemo(() => history.slice(0, visibleCount), [history, visibleCount]);

  const posterMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const entry of visibleEntries) {
      map[entry.id] = getStoredThumb(entry.id);
    }
    return map;
  }, [visibleEntries]);

  // Highest score across the full history wins the "Top score" badge.
  // Requires at least 2 entries so a single video doesn't get crowned.
  const bestEntryId = useMemo(() => {
    if (history.length < 2) return null;
    let bestId: string | null = null;
    let bestScore = -Infinity;
    for (const entry of history) {
      const score = entry.viralPotential ?? entry.overallScore;
      if (score > bestScore) {
        bestScore = score;
        bestId = entry.id;
      }
    }
    return bestId;
  }, [history]);

  if (checking) return <div className="min-h-screen bg-[#f5f5f2] dark:bg-[#09090b]" />;
  if (!authorized) return null;

  const totalVideos = history.length;
  const hasMore = visibleCount < totalVideos;

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-zinc-950 transition-colors dark:bg-[#09090b] dark:text-zinc-50">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-20 lg:px-10 lg:pb-12 lg:pt-12">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white sm:text-4xl">
              Your videos
            </h1>
            {totalVideos > 0 && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {totalVideos} {totalVideos === 1 ? 'video' : 'videos'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(249,115,22,0.28)] transition-all hover:bg-orange-600 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f5f2] dark:focus-visible:ring-offset-[#09090b]"
          >
            <Plus className="h-4 w-4" />
            Upload video
          </button>
        </motion.header>

        {totalVideos === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mx-auto mt-20 max-w-md text-center"
          >
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
              No videos yet
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Upload your first TikTok and we&apos;ll score it in about 30 seconds.
            </p>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(249,115,22,0.28)] transition-all hover:bg-orange-600 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Upload video
            </button>
          </motion.div>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleEntries.map((entry) => (
                <DashboardVideoCard
                  key={entry.id}
                  entry={entry}
                  posterUrl={posterMap[entry.id]}
                  dateLabel={relativeDate(entry.date)}
                  isBest={entry.id === bestEntryId}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
                >
                  Load more
                </button>
              </div>
            )}
          </motion.section>
        )}
      </div>

      <UploadModal open={uploadOpen} onClose={closeUpload} />
    </div>
  );
}
