'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const STORAGE_KEY = 'rmt_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          setVisible(true);
        }
      } catch {
        /* SSR or storage unavailable */
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          role="dialog"
          aria-label="Cookie consent"
          className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/50"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-zinc-300 leading-relaxed">
                We use essential cookies for authentication and session management. No third-party advertising cookies.{' '}
                <Link href="/privacy" className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </div>
            <button
              onClick={accept}
              className="shrink-0 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
