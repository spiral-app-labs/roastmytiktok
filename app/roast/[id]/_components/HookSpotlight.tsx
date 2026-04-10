'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { RoastResult } from '@/lib/types';
import { scoreToTone } from '@/components/ScoreChip';

interface HookSpotlightProps {
  roast: RoastResult;
  videoId: string;
}

const CLIP_END = 5;

export default function HookSpotlight({ roast, videoId }: HookSpotlightProps) {
  const shouldReduceMotion = useReducedMotion();
  const { hookSummary, firstFiveSecondsDiagnosis, hookIdentification } = roast;
  const hookAnalysis = roast.hookAnalysis;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch the signed URL for the video.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/roast/${videoId}/video`);
        if (!res.ok) {
          if (!cancelled) setVideoError(true);
          return;
        }
        const data = (await res.json()) as { url?: string };
        if (cancelled) return;
        if (data.url) setVideoUrl(data.url);
        else setVideoError(true);
      } catch {
        if (!cancelled) setVideoError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Loop the first CLIP_END seconds.
  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.currentTime >= CLIP_END) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  // Nothing to show if we have no hook data at all AND no video.
  const hasHookData = Boolean(
    hookSummary || firstFiveSecondsDiagnosis || hookIdentification,
  );
  if (!hasHookData && videoError) return null;

  const score = hookSummary?.score ?? null;
  // Prefer the diagnosis body text as the main read; fall back to the summary
  // headline only when no diagnosis is available. Never render the raw summary
  // headline as a big title — it tends to be long, bold AI prose.
  const summaryHeadline = hookSummary?.headline ?? null;
  const bodyText = firstFiveSecondsDiagnosis?.hookRead || summaryHeadline || null;
  const dropWindow = firstFiveSecondsDiagnosis?.likelyDropWindow;
  const nextTimeFix = firstFiveSecondsDiagnosis?.nextTimeFix;
  const scoreTone = score != null ? scoreToTone(score) : null;

  // Short human strength label — drives the small chip next to the section
  // header so the long AI headline never needs to be rendered as a big title.
  const verdictMap: Record<string, { label: string; className: string }> = {
    working: { label: 'Working', className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' },
    fragile: { label: 'Fragile', className: 'border-amber-400/25 bg-amber-500/10 text-amber-300' },
    failing: { label: 'Failing', className: 'border-rose-400/25 bg-rose-500/10 text-rose-300' },
    weak: { label: 'Weak', className: 'border-rose-400/25 bg-rose-500/10 text-rose-300' },
    mixed: { label: 'Mixed', className: 'border-amber-400/25 bg-amber-500/10 text-amber-300' },
    strong: { label: 'Strong', className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' },
  };
  const strengthKey =
    firstFiveSecondsDiagnosis?.verdict ?? hookSummary?.strength ?? null;
  const strengthChip =
    strengthKey && verdictMap[strengthKey] ? verdictMap[strengthKey] : null;

  return (
    <motion.section
      aria-label="Hook spotlight"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.15 }}
      className="mt-8 sm:mt-10"
    >
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            The hook · first 5 seconds
          </div>
          {strengthChip && (
            <span
              className={[
                'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em]',
                strengthChip.className,
              ].join(' ')}
            >
              {strengthChip.label}
            </span>
          )}
        </div>
        {score != null && scoreTone && (
          <div className={['font-mono text-xs tabular-nums', scoreTone.text].join(' ')}>
            {score}
            <span className="text-zinc-600"> / 100</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm sm:p-6 lg:grid-cols-[280px_1fr] lg:gap-7 lg:p-7">
        {/* Video clip panel */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_35%_35%,rgba(56,189,248,0.2),transparent_38%),radial-gradient(circle_at_65%_68%,rgba(99,102,241,0.2),transparent_46%),radial-gradient(circle_at_55%_48%,rgba(139,92,246,0.16),transparent_52%)] blur-2xl" />
          <div className="pointer-events-none absolute -inset-10 rounded-[42px] bg-[radial-gradient(circle,rgba(59,130,246,0.14),transparent_55%)] blur-[70px]" />
          <div className="relative aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-[0_26px_80px_-34px_rgba(59,130,246,0.45),0_18px_48px_-28px_rgba(99,102,241,0.32)]">
            {videoUrl && !videoError ? (
              <video
                ref={videoRef}
                src={videoUrl}
                muted
                autoPlay
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {videoError ? (
                  <div className="text-center">
                    <div className="text-2xl" aria-hidden>🎬</div>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                      Preview unavailable
                    </p>
                  </div>
                ) : (
                  <div
                    className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60"
                    aria-label="Loading video"
                  />
                )}
              </div>
            )}

            {/* Overlay: clip badge + live indicator */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm">
                <span
                    className={[
                      'h-1.5 w-1.5 rounded-full',
                    isPlaying ? 'bg-sky-400 animate-pulse' : 'bg-zinc-500',
                  ].join(' ')}
                />
                0:00 – 0:05
              </span>
              <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/70 backdrop-blur-sm">
                muted · loop
              </span>
            </div>
          </div>
        </div>

        {/* Hook content */}
        <div className="min-w-0 self-start">
          {bodyText && (
            <p
              className="text-[13px] leading-relaxed text-zinc-200 sm:text-sm"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bodyText}
            </p>
          )}

          {(dropWindow || nextTimeFix) && (
            <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2 sm:gap-5">
              {dropWindow && (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Likely drop
                  </dt>
                  <dd
                    className="mt-1 text-[12px] leading-snug text-zinc-300"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {dropWindow}
                  </dd>
                </div>
              )}
              {nextTimeFix && (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Next time
                  </dt>
                  <dd
                    className="mt-1 text-[12px] leading-snug text-zinc-300"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {nextTimeFix}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {hookAnalysis && (
            <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-3 sm:gap-5">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Hook type
                </dt>
                <dd className="mt-1 text-[12px] leading-snug text-zinc-300">
                  {hookAnalysis.labels.mechanisms.join(', ').replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Clear by
                </dt>
                <dd className="mt-1 text-[12px] leading-snug text-zinc-300">
                  {hookAnalysis.timing.propositionTimeSec != null ? `${hookAnalysis.timing.propositionTimeSec.toFixed(1)}s` : 'not clear in the hook'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Main failure
                </dt>
                <dd className="mt-1 text-[12px] leading-snug text-zinc-300">
                  {hookAnalysis.labels.primaryFail.replace(/_/g, ' ')}
                </dd>
              </div>
            </dl>
          )}

          {hookIdentification?.textOnScreen && (
            <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                On screen
              </div>
              <div
                className="mt-0.5 font-mono text-[11px] text-zinc-400"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                &ldquo;{hookIdentification.textOnScreen}&rdquo;
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
