'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export function LoadingState() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/8 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/6 blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative space-y-4 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-2 text-5xl"
        >
          🔥
        </motion.div>
        <p className="font-display text-lg font-bold text-white">
          Cooking up your results
        </p>
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-orange-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>
      </motion.div>
    </main>
  );
}

export function ErrorState({ message }: { message: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 text-5xl">😵</div>
        <p className="mb-5 text-zinc-400">{message || 'Roast not found.'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-opacity hover:opacity-90"
        >
          <span>←</span> Try again
        </Link>
      </div>
    </main>
  );
}
