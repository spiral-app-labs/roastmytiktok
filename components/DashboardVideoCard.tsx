'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Crown, Loader2, Play, TriangleAlert } from 'lucide-react';
import type { HistoryEntry } from '@/lib/history';

function scoreTone(score: number) {
  if (score >= 80) {
    return 'text-emerald-700 dark:text-emerald-300';
  }
  if (score >= 60) {
    return 'text-amber-700 dark:text-amber-300';
  }
  if (score >= 40) {
    return 'text-orange-700 dark:text-orange-300';
  }
  return 'text-rose-700 dark:text-rose-300';
}

const URL_CACHE_TTL = 50 * 60 * 1000; // 50 minutes (signed URLs expire at 60)

function readCachedSignedUrl(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`videoUrl_${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: string; ts?: number };
    if (!parsed.url || !parsed.ts) return null;
    if (Date.now() - parsed.ts > URL_CACHE_TTL) return null;
    return parsed.url;
  } catch {
    return null;
  }
}

function writeCachedSignedUrl(id: string, url: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`videoUrl_${id}`, JSON.stringify({ url, ts: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

export default function DashboardVideoCard({
  entry,
  posterUrl,
  dateLabel,
  isBest = false,
}: {
  entry: HistoryEntry;
  posterUrl?: string | null;
  dateLabel: string;
  isBest?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(() => readCachedSignedUrl(entry.id));
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPlayableVideo = entry.source === 'upload';
  const displayScore = entry.viralPotential ?? entry.overallScore;
  const scoreLabel = entry.viralPotential !== undefined ? 'Viral score' : 'Score';
  const toneClass = scoreTone(displayScore);

  // Auto-fetch the signed URL on mount so the real first frame renders as the thumbnail.
  useEffect(() => {
    if (!hasPlayableVideo || signedUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/roast/${entry.id}/video`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data?.url) {
          writeCachedSignedUrl(entry.id, data.url);
          setSignedUrl(data.url);
        }
      } catch {
        /* silent — tile still renders via poster/placeholder */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entry.id, hasPlayableVideo, signedUrl]);

  async function handlePlay(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!hasPlayableVideo || playing) return;

    setLoading(true);
    setError(null);

    try {
      let url = signedUrl;
      if (!url) {
        const response = await fetch(`/api/roast/${entry.id}/video`);
        if (!response.ok) throw new Error('Preview unavailable');
        const data = await response.json();
        if (!data?.url) throw new Error('Preview unavailable');
        writeCachedSignedUrl(entry.id, data.url);
        url = data.url;
        setSignedUrl(url);
      }

      setPlaying(true);
      // Give React a tick to apply controls/autoplay attributes before calling play()
      requestAnimationFrame(() => {
        videoRef.current?.play().catch(() => {
          /* user gesture still present; ignore promise rejection */
        });
      });
    } catch {
      setError('Preview unavailable for this upload.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="group">
      <Link
        href={`/roast/${entry.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f5f2] dark:focus-visible:ring-offset-[#09090b] rounded-[20px]"
        aria-label={`Open roast for ${entry.filename || 'untitled video'}`}
      >
        <div className="relative aspect-[9/16] overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#fff7ed,#f4f4f5)] transition-transform duration-300 group-hover:-translate-y-1 dark:bg-[linear-gradient(180deg,#111318,#18181b)]">
          {signedUrl ? (
            <video
              ref={videoRef}
              src={`${signedUrl}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              controls={playing}
              className="h-full w-full bg-black object-cover"
              onClick={(e) => {
                if (!playing) e.preventDefault();
              }}
            />
          ) : posterUrl ? (
            <img src={posterUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#fed7aa,transparent_55%),linear-gradient(180deg,#fff7ed,#f5f5f2)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.28),transparent_42%),linear-gradient(180deg,#18181b,#111318)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-zinc-950 shadow-[0_12px_30px_rgba(15,23,42,0.1)] dark:bg-white/10 dark:text-white">
                <Play className="ml-0.5 h-5 w-5" />
              </div>
            </div>
          )}

          {hasPlayableVideo && !playing && (
            <button
              type="button"
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 hover:bg-black/20 focus:outline-none"
              aria-label={`Play ${entry.filename || 'video preview'}`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.18)] transition-transform group-hover:scale-[1.05] dark:bg-white/92">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="ml-0.5 h-6 w-6" />}
              </span>
            </button>
          )}

          {isBest && (
            <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(16,185,129,0.38)] ring-1 ring-white/30 backdrop-blur-sm">
              <Crown className="h-3 w-3" />
              Top score
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className={`font-display text-xl font-semibold leading-none tracking-tight ${toneClass}`}>
            {displayScore}
          </span>
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {scoreLabel}
          </span>
        </div>
        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</span>
      </div>

      {entry.filename && (
        <p className="mt-1 truncate text-[11px] text-zinc-400 dark:text-zinc-500">
          {entry.filename}
        </p>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
          <TriangleAlert className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}
    </article>
  );
}
