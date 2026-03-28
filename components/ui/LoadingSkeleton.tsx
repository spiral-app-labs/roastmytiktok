import React from 'react';

interface LoadingSkeletonProps {
  /** 'card' | 'text' | 'avatar' | 'custom' */
  variant?: 'card' | 'text' | 'avatar' | 'custom';
  /** Number of rows (for text variant) */
  rows?: number;
  /** Height class (e.g. 'h-4', 'h-32') — used by card and custom */
  height?: string;
  /** Width class (e.g. 'w-full', 'w-1/2') */
  width?: string;
  className?: string;
}

function ShimmerBase({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/80 rounded-lg relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
    </div>
  );
}

export function LoadingSkeleton({
  variant = 'card',
  rows = 3,
  height = 'h-32',
  width = 'w-full',
  className = '',
}: LoadingSkeletonProps) {
  if (variant === 'avatar') {
    return <ShimmerBase className={`w-10 h-10 rounded-full ${className}`} />;
  }

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <ShimmerBase
            key={i}
            className={`h-4 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-2xl bg-zinc-900/60 border border-zinc-800/50 p-5 space-y-3 ${className}`}>
        <div className="flex items-center gap-3">
          <ShimmerBase className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerBase className="h-4 w-1/2" />
            <ShimmerBase className="h-3 w-1/3" />
          </div>
        </div>
        <ShimmerBase className="h-3 w-full" />
        <ShimmerBase className="h-3 w-4/5" />
        <div className="flex gap-2 pt-1">
          {[1, 2, 3].map(i => (
            <ShimmerBase key={i} className="h-6 w-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // custom
  return <ShimmerBase className={`${height} ${width} ${className}`} />;
}

// Add shimmer keyframe to globals if not present — consumers must add this to their CSS:
// @keyframes shimmer { to { transform: translateX(200%); } }
