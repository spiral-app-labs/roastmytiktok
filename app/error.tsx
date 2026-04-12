'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RMT error boundary]', error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_70%)]" />
      </div>

      <div className="relative space-y-6">
        <p className="text-6xl">💥</p>
        <h1 className="text-2xl font-bold text-white">Something broke</h1>
        <p className="text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
          Even our AI agents couldn&apos;t save this one. Try again - if it keeps happening, the team is probably already on it.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 font-semibold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 px-6 py-3 text-sm rounded-xl"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 transition-all px-6 py-3 text-sm rounded-xl"
          >
            Go Home
          </Link>
        </div>

        {error.digest && (
          <p className="text-zinc-600 text-xs">Error ID: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
