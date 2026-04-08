'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Play, TriangleAlert } from 'lucide-react';
import type { HistoryEntry } from '@/lib/history';

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      text: 'text-emerald-700 dark:text-emerald-300',
      chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
    };
  }
  if (score >= 60) {
    return {
      text: 'text-amber-700 dark:text-amber-300',
      chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
      dot: 'bg-amber-500 dark:bg-amber-400',
    };
  }
  if (score >= 40) {
    return {
      text: 'text-orange-700 dark:text-orange-300',
      chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
      dot: 'bg-orange-500 dark:bg-orange-400',
    };
  }
  return {
    text: 'text-rose-700 dark:text-rose-300',
    chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    dot: 'bg-rose-500 dark:bg-rose-400',
  };
}

export default function DashboardVideoCard({
  entry,
  posterUrl,
  dateLabel,
}: {
  entry: HistoryEntry;
  posterUrl?: string | null;
  dateLabel: string;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tone = scoreTone(entry.overallScore);
  const hasPlayableVideo = entry.source === 'upload';

  async function handlePlay() {
    if (!hasPlayableVideo || loading || videoUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/roast/${entry.id}/video`);
      if (!response.ok) throw new Error('Preview unavailable');
      const data = await response.json();
      if (!data?.url) throw new Error('Preview unavailable');
      setVideoUrl(data.url);
    } catch {
      setError('Preview unavailable for this upload.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[30px] border border-black/6 bg-[#fafaf9] shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-transform hover:-translate-y-1 dark:border-white/8 dark:bg-white/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
      <div className="relative aspect-[9/16] overflow-hidden border-b border-black/6 bg-[linear-gradient(180deg,#fff7ed,#f4f4f5)] dark:border-white/8 dark:bg-[linear-gradient(180deg,#111318,#18181b)]">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            muted
            playsInline
            className="h-full w-full bg-black object-cover"
          />
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#fed7aa,transparent_55%),linear-gradient(180deg,#fff7ed,#f5f5f2)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.28),transparent_42%),linear-gradient(180deg,#18181b,#111318)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-zinc-950 shadow-[0_12px_30px_rgba(15,23,42,0.1)] dark:bg-white/10 dark:text-white">
              <Play className="ml-0.5 h-5 w-5" />
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-950 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-zinc-950/82 dark:text-white">
          <div className={`h-2 w-2 rounded-full ${tone.dot}`} />
          <span className={`font-display ${tone.text}`}>{entry.overallScore}</span>
          <span className="text-zinc-400 dark:text-zinc-500">score</span>
        </div>

        {hasPlayableVideo && !videoUrl && (
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-x-0 bottom-4 mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.14)] transition-transform hover:scale-[1.03] dark:bg-zinc-950/86 dark:text-white"
            aria-label={`Play ${entry.filename || 'video preview'}`}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
            {entry.filename || 'Untitled upload'}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{dateLabel}</p>
        </div>

        <div className="flex items-center justify-between rounded-[20px] border border-black/6 bg-white/82 px-3 py-3 dark:border-white/8 dark:bg-black/10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Viral score</p>
            <p className={`font-display mt-1 text-lg font-semibold ${tone.text}`}>{entry.overallScore}/100</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tone.chip}`}>
            {entry.source === 'upload' ? 'Uploaded video' : 'Roast only'}
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
            <TriangleAlert className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        <Link
          href={`/roast/${entry.id}`}
          className="inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
        >
          View roast
        </Link>
      </div>
    </article>
  );
}
