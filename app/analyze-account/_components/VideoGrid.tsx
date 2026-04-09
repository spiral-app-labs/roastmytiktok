'use client';

import { HistoryEntry } from '@/lib/history';
import VideoCard from './VideoCard';

interface VideoGridProps {
  entries: HistoryEntry[];
}

export default function VideoGrid({ entries }: VideoGridProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className={[
        'grid gap-4 lg:gap-5',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        // Featured pattern on lg+: first card spans 2×2 to act as the hero
        '[&>*:first-child]:lg:col-span-2 [&>*:first-child]:lg:row-span-2',
      ].join(' ')}
    >
      {entries.map((entry, i) => (
        <VideoCard key={entry.id} entry={entry} index={i} featured={i === 0} />
      ))}
    </div>
  );
}
