'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HistoryEntry } from '@/lib/history';
import { useVideoThumbnail } from '@/lib/video-thumbnails';
import ScoreChip, { scoreToGrade } from '@/components/ScoreChip';

interface VideoCardProps {
  entry: HistoryEntry;
  index?: number;
  featured?: boolean;
}

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
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

function titleFor(entry: HistoryEntry): string {
  return entry.filename || entry.url || entry.verdict || 'Untitled roast';
}

export default function VideoCard({ entry, index = 0, featured = false }: VideoCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { src, status, containerRef } = useVideoThumbnail(entry.id);
  const grade = scoreToGrade(entry.overallScore);
  const title = titleFor(entry);
  const relative = getRelativeDate(entry.date);

  const placeholderGradient =
    entry.overallScore >= 80
      ? 'from-emerald-500/30 via-emerald-700/10 to-zinc-900'
      : entry.overallScore >= 60
      ? 'from-amber-500/30 via-orange-700/10 to-zinc-900'
      : 'from-rose-500/30 via-rose-700/10 to-zinc-900';

  const verdictExcerpt =
    featured && entry.verdict
      ? entry.verdict.length > 140
        ? entry.verdict.slice(0, 140) + '…'
        : entry.verdict
      : null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: shouldReduceMotion ? 0 : Math.min(0.04 * index, 0.4),
        duration: 0.35,
        ease: 'easeOut',
      }}
      className="group h-full"
    >
      <Link
        href={`/roast/${entry.id}`}
        ref={containerRef as unknown as React.Ref<HTMLAnchorElement>}
        className="block h-full"
      >
        <div
          className={[
            'relative h-full overflow-hidden rounded-2xl',
            'bg-zinc-900/60 border border-white/6',
            'transition-all duration-300',
            'group-hover:border-orange-400/40 group-hover:shadow-2xl group-hover:shadow-orange-500/10',
            'group-hover:-translate-y-0.5',
          ].join(' ')}
        >
          {/* Thumbnail (or placeholder/skeleton) */}
          <div
            className={[
              'relative w-full overflow-hidden',
              featured ? 'aspect-[4/5] lg:aspect-auto lg:h-full' : 'aspect-[9/16]',
            ].join(' ')}
          >
            {src ? (
              <img
                src={src}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div
                className={[
                  'absolute inset-0 bg-gradient-to-br',
                  placeholderGradient,
                  status === 'loading' ? 'animate-pulse' : '',
                ].join(' ')}
              >
                {status === 'error' && (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                      preview unavailable
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Noise overlay */}
            <div
              className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '3px 3px',
              }}
            />

            {/* Top gradient shade for pill legibility */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />

            {/* Bottom scrim */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />

            {/* Top-left: letter grade pill */}
            <div className="absolute left-3 top-3 z-10">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-md">
                {grade}
              </span>
            </div>

            {/* Top-right: score chip */}
            <div className="absolute right-3 top-3 z-10">
              <ScoreChip score={entry.overallScore} size={featured ? 'md' : 'sm'} />
            </div>

            {/* Bottom overlay content */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-4 sm:p-5">
              <h3
                className={[
                  'font-display font-semibold text-white line-clamp-2',
                  featured ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base',
                ].join(' ')}
              >
                {title}
              </h3>
              {verdictExcerpt && (
                <p className="mt-1 line-clamp-2 text-sm text-white/70 leading-snug">
                  {verdictExcerpt}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                <span>{relative}</span>
                <span className="opacity-40">•</span>
                <span>{entry.source === 'upload' ? 'upload' : 'link'}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
