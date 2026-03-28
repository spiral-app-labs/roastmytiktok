import React from 'react';
import { colors } from '@/lib/design-tokens';

type ScoreBadgeSize = 'sm' | 'md' | 'lg';

interface ScoreBadgeProps {
  score: number;
  size?: ScoreBadgeSize;
  className?: string;
  showLabel?: boolean;
}

function getScoreConfig(score: number) {
  if (score >= 70) {
    return {
      text: 'text-green-300',
      bg: 'bg-green-500/15',
      ring: 'ring-green-500/30',
      emoji: '🟢',
    };
  }
  if (score >= 50) {
    return {
      text: 'text-yellow-300',
      bg: 'bg-yellow-500/15',
      ring: 'ring-yellow-500/30',
      emoji: '🟡',
    };
  }
  return {
    text: 'text-red-300',
    bg: 'bg-red-500/15',
    ring: 'ring-red-500/30',
    emoji: '🔴',
  };
}

const sizeClasses: Record<ScoreBadgeSize, { wrapper: string; score: string; label: string }> = {
  sm: { wrapper: 'w-12 h-12', score: 'text-lg', label: 'text-[9px]' },
  md: { wrapper: 'w-16 h-16', score: 'text-2xl', label: 'text-[10px]' },
  lg: { wrapper: 'w-20 h-20', score: 'text-3xl', label: 'text-xs' },
};

export function ScoreBadge({ score, size = 'md', className = '', showLabel = true }: ScoreBadgeProps) {
  const cfg = getScoreConfig(score);
  const sz = sizeClasses[size];

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl ring-1 ${sz.wrapper} ${cfg.bg} ${cfg.ring} shrink-0 ${className}`}
    >
      <span className={`font-black leading-none ${sz.score} ${cfg.text}`}>{score}</span>
      {showLabel && (
        <span className={`text-zinc-500 mt-0.5 ${sz.label}`}>/ 100</span>
      )}
    </div>
  );
}
