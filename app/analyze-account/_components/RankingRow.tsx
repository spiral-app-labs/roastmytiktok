'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HistoryEntry } from '@/lib/history';
import { useVideoThumbnail } from '@/lib/video-thumbnails';
import ScoreChip from '@/components/ScoreChip';

interface RankingRowProps {
  entry: HistoryEntry;
  rank: number;
  delta?: number | null;
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

export default function RankingRow({ entry, rank, delta = null }: RankingRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const { src, status, containerRef } = useVideoThumbnail(entry.id);
  const title = titleFor(entry);

  const deltaTone =
    delta === null || delta === 0
      ? 'text-zinc-500'
      : delta > 0
      ? 'text-emerald-300'
      : 'text-rose-300';
  const deltaSymbol =
    delta === null || delta === 0 ? '–' : delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: shouldReduceMotion ? 0 : Math.min(0.03 * rank, 0.3),
        duration: 0.3,
      }}
    >
      <Link
        href={`/roast/${entry.id}`}
        ref={containerRef as unknown as React.Ref<HTMLAnchorElement>}
        className={[
          'group flex items-center gap-4 py-3 pl-3 pr-4',
          'border-b border-white/5 last:border-b-0',
          'transition-colors duration-200 hover:bg-white/[0.025]',
        ].join(' ')}
      >
        {/* Rank number */}
        <div
          className={[
            'w-10 shrink-0 text-center font-mono tabular-nums text-2xl font-semibold',
            rank === 1
              ? 'text-amber-300'
              : rank === 2
              ? 'text-zinc-300'
              : rank === 3
              ? 'text-orange-300'
              : 'text-zinc-600',
          ].join(' ')}
        >
          {rank}
        </div>

        {/* Thumbnail */}
        <div className="relative h-[72px] w-[54px] shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900/80">
          {src ? (
            <img
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className={[
                'absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900',
                status === 'loading' ? 'animate-pulse' : '',
              ].join(' ')}
            />
          )}
        </div>

        {/* Title + date */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
            {title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            {getRelativeDate(entry.date)} • {entry.source === 'upload' ? 'upload' : 'link'}
          </p>
        </div>

        {/* Delta */}
        <div className={['hidden sm:block w-16 text-right font-mono text-xs font-semibold', deltaTone].join(' ')}>
          {deltaSymbol}
        </div>

        {/* Score chip */}
        <ScoreChip score={entry.overallScore} size="sm" />

        {/* Chevron */}
        <div className="hidden sm:block w-4 shrink-0 text-right font-mono text-sm text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
          ›
        </div>
      </Link>
    </motion.div>
  );
}
