'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === 'success') {
    if (status === 'success') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-center"
        >
          <p className="text-emerald-400 text-sm font-semibold">You&apos;re in. Watch your inbox.</p>
        </motion.div>
      );
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok || res.status === 409) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.06] to-zinc-950 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-white text-sm font-bold">Get weekly TikTok tips that actually work.</p>
          <p className="text-zinc-500 text-xs mt-1">Hook formulas, algorithm updates, and creator tactics. No spam.</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          aria-label="Dismiss email signup"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {status === 'loading' ? 'Joining...' : 'Subscribe'}
        </button>
      </form>
      <AnimatePresence>
        {status === 'error' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-red-400 text-xs mt-2"
          >
            Something went wrong. Try again.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
