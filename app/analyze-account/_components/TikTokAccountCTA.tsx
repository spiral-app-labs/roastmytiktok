'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

export default function TikTokAccountCTA() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = handle.trim().replace(/^@/, '').replace(/\s+/g, '');
    if (!clean) {
      setError('Enter a TikTok handle to analyze.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/analyze-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: clean }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422) {
          setError(
            `Could not fetch @${clean}. Make sure the account is public and the handle is correct.`
          );
        } else if (res.status === 404) {
          setError(
            `No videos found for @${clean}. The account may be private or have no public videos.`
          );
        } else {
          setError(data.error || 'Analysis failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      try {
        sessionStorage.setItem(`account_${clean}`, JSON.stringify(data));
      } catch {
        /* ignore */
      }
      router.push(`/account/${encodeURIComponent(clean)}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={[
        'relative overflow-hidden',
        'rounded-3xl border border-white/6',
        'bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-950/80',
        'p-6 sm:p-8',
      ].join(' ')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-orange-500/20 to-pink-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-pink-500/15 to-orange-500/5 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange-300/80">
            Bulk pattern analysis
          </div>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold leading-tight text-white">
            Analyze an entire{' '}
            <span className="fire-text">TikTok account</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl">
            Drop any public handle and we&apos;ll fetch the last 30 videos, score them, and surface
            the patterns you should actually care about.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 lg:min-w-[420px]">
          <div className="flex items-center rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 focus-within:border-orange-400/50 transition-colors">
            <span className="select-none text-zinc-500 text-sm">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setError(null);
              }}
              placeholder="tiktokhandle"
              disabled={loading}
              className="ml-1 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !handle.trim()}
            className={[
              'rounded-2xl px-5 py-3',
              'bg-gradient-to-r from-orange-500 to-pink-500',
              'text-sm font-semibold text-white',
              'shadow-lg shadow-orange-500/25',
              'transition-all duration-200',
              'hover:opacity-95 hover:shadow-orange-500/40',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2',
            ].join(' ')}
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyzing…
              </>
            ) : (
              <>Analyze account →</>
            )}
          </button>

          {loading && (
            <p className="text-[11px] text-zinc-500 animate-pulse">
              Fetching videos + running analysis — this takes 20–40 seconds.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}
        </form>
      </div>
    </motion.section>
  );
}
