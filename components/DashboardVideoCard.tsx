'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Crown, Loader2, Pause, Play, TriangleAlert } from 'lucide-react';
import type { HistoryEntry } from '@/lib/history';
import { getSignedVideoUrl, useVideoThumbnail } from '@/lib/video-thumbnails';

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
  dateLabel,
  isBest = false,
}: {
  entry: HistoryEntry;
  dateLabel: string;
  isBest?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { src: thumbnailSrc, status, containerRef } = useVideoThumbnail(entry.id);
  const [signedUrl, setSignedUrl] = useState<string | null>(() => readCachedSignedUrl(entry.id));
  const [showVideo, setShowVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaHovered, setMediaHovered] = useState(false);

  const hasPlayableVideo = entry.source === 'upload' || Boolean(thumbnailSrc || signedUrl || showVideo);
  const displayScore = entry.viralPotential ?? entry.overallScore;
  const scoreLabel = entry.viralPotential !== undefined ? 'Viral score' : 'Score';
  const toneClass = scoreTone(displayScore);

  useEffect(() => {
    setVideoReady(false);
  }, [signedUrl]);

  useEffect(() => {
    if (!hasPlayableVideo || signedUrl || status !== 'ready') return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const url = await getSignedVideoUrl(entry.id, controller.signal);
          if (!url || controller.signal.aborted) return;
          writeCachedSignedUrl(entry.id, url);
          setSignedUrl(url);
        } catch {
          /* silent warm-up failure */
        }
      })();
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [entry.id, hasPlayableVideo, signedUrl, status]);

  useEffect(() => {
    if (!playRequested || !showVideo || !signedUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled) return;
      void video.play().catch(() => {
        /* keep overlay visible so the user can retry */
      });
    };

    if (video.readyState >= 2) {
      tryPlay();
      return () => {
        cancelled = true;
      };
    }

    video.addEventListener('loadeddata', tryPlay, { once: true });
    video.addEventListener('canplay', tryPlay, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('canplay', tryPlay);
    };
  }, [playRequested, showVideo, signedUrl]);

  async function handleMediaToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!hasPlayableVideo) return;

    if (showVideo && playing) {
      setPlayRequested(false);
      videoRef.current?.pause();
      setPlaying(false);
      return;
    }

    if (showVideo && signedUrl) {
      setPlayRequested(true);
      setLoading(false);
      void videoRef.current?.play().catch(() => {
        /* keep overlay visible so the user can retry */
      });
      return;
    }

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

      setPlayRequested(true);
      setShowVideo(true);
      setPlaying(false);
    } catch {
      setPlayRequested(false);
      setError('Preview unavailable for this roast.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="group">
      <div
        ref={containerRef as unknown as React.Ref<HTMLDivElement>}
        className="relative aspect-[9/16] overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#fff7ed,#f4f4f5)] transition-transform duration-300 group-hover:-translate-y-1 dark:bg-[linear-gradient(180deg,#111318,#18181b)]"
        onMouseEnter={() => setMediaHovered(true)}
        onMouseLeave={() => setMediaHovered(false)}
      >
        <div className="h-full w-full">
          {signedUrl ? (
            <video
              ref={videoRef}
              src={`${signedUrl}#t=0.1`}
              preload="auto"
              muted
              playsInline
              controls={false}
              className={`h-full w-full bg-black object-cover transition-opacity duration-200 ${showVideo ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}`}
              onLoadedData={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
          ) : null}

          {!showVideo && thumbnailSrc && (
            <img src={thumbnailSrc} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          )}

          {!showVideo && !thumbnailSrc && !signedUrl && (
            <div
              className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#fed7aa,transparent_55%),linear-gradient(180deg,#fff7ed,#f5f5f2)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.28),transparent_42%),linear-gradient(180deg,#18181b,#111318)] ${status === 'loading' ? 'animate-pulse' : ''}`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-zinc-950 shadow-[0_12px_30px_rgba(15,23,42,0.1)] dark:bg-white/10 dark:text-white">
                <Play className="ml-0.5 h-5 w-5" />
              </div>
            </div>
          )}
        </div>

        {!playing && !showVideo && (
          <div className="pointer-events-none absolute inset-0 z-[11] bg-gradient-to-t from-black/30 via-black/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        )}

        {hasPlayableVideo && (loading || !showVideo || !playing || mediaHovered) && (
          <button
            type="button"
            onClick={handleMediaToggle}
            className="absolute left-1/2 top-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
            aria-label={`${playing ? 'Pause' : 'Play'} ${entry.filename || 'video preview'}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/18 bg-black/28 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] ring-1 ring-black/8 backdrop-blur-xl transition-all duration-200 group-hover:scale-[1.06] group-hover:bg-black/38 dark:border-white/14 dark:bg-white/12 dark:text-white dark:group-hover:bg-white/16">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : playing ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : showVideo && !videoReady ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              )}
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

      <Link
        href={`/roast/${entry.id}`}
        className="mt-2 block cursor-pointer rounded-[16px] px-1 py-1 transition-colors hover:bg-black/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f5f2] dark:hover:bg-white/[0.03] dark:focus-visible:ring-offset-[#09090b]"
        aria-label={`Open roast details for ${entry.filename || 'untitled video'}`}
      >
        <div className="flex items-baseline justify-between gap-2">
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

        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[11px] text-zinc-400 transition-colors group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400">
            {entry.filename || 'Open full roast'}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600/85 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-sky-300/85">
            Open
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </Link>

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
          <TriangleAlert className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}
    </article>
  );
}
