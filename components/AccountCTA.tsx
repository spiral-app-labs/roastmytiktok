'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlassCard, GradientButton } from '@/components/ui';

const DISMISSED_KEY = 'rmt_cta_dismissed';
const LINKED_HANDLE_KEY = 'linked_handle';

interface AccountSummaryBarProps {
  handle: string;
}

function AccountSummaryBar({ handle }: AccountSummaryBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full mb-6"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-zinc-900/80 border border-orange-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            @
          </div>
          <div>
            <p className="text-white text-sm font-semibold">@{handle}</p>
            <p className="text-zinc-500 text-xs">account linked</p>
          </div>
        </div>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/15 px-3 py-1.5 rounded-lg transition-all shrink-0"
        >
          View Library →
        </Link>
      </div>
    </motion.div>
  );
}

export function AccountCTA() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [linkedHandle, setLinkedHandle] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(LINKED_HANDLE_KEY);
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
    setLinkedHandle(saved);
    setDismissed(wasDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setSubmitting(true);
    // Normalize: strip @ if user typed it
    const normalized = handle.replace(/^@/, '').trim();
    localStorage.setItem(LINKED_HANDLE_KEY, normalized);
    router.push('/analyze-account?handle=' + normalized);
    setSubmitting(false);
  };

  // Don't render until mounted (avoid SSR hydration mismatch)
  if (!mounted) return null;

  // Linked state: show compact summary bar
  if (linkedHandle) {
    return <AccountSummaryBar handle={linkedHandle} />;
  }

  // Dismissed: nothing to show
  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full mb-6"
      >
        <GlassCard variant="highlighted" className="relative overflow-hidden p-0">
          {/* Fire gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-pink-600/10 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_0%_50%,rgba(251,146,60,0.15),transparent)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-pink-500/10 to-transparent pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center gap-5 px-6 py-5">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-400 transition-colors p-1 rounded-lg hover:bg-zinc-800/60"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Headline + social proof */}
            <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-xl">🔥</span>
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Account Analysis</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                See what&apos;s really going on with your TikTok
              </h2>
              <p className="text-xs text-zinc-400">
                Join 2,000+ creators improving their content.
              </p>
            </div>

            {/* Handle input + CTA */}
            <form onSubmit={handleAnalyze} className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <div className="relative flex-1 sm:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="yourhandle"
                  className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-xl pl-7 pr-3 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-sm"
                />
              </div>
              <GradientButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={!handle.trim() || submitting}
                loading={submitting}
                className="shrink-0 whitespace-nowrap"
              >
                Analyze My Account →
              </GradientButton>
            </form>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}
