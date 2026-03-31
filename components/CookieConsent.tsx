'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const STORAGE_KEY = 'rmt_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  async function acknowledge() {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'acknowledged');
      await fetch('/api/consent/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_choice: 'acknowledged',
          analytics_storage: false,
          consent_source: 'cookie_banner',
        }),
      });
    } catch (error) {
      console.error('[cookie-consent] failed to persist choice', error);
    } finally {
      setVisible(false);
      setSaving(false);
    }
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
          aria-label="Cookie notice"
          className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/50"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-zinc-300 leading-relaxed">
                We only use essential cookies for authentication, security, and keeping your session alive. We do not run optional analytics or advertising cookies right now.{' '}
                <Link href="/privacy" className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors">
                  Privacy Policy
                </Link>
              </p>
              <p className="mt-2 text-xs text-zinc-500">We save this acknowledgement in Supabase so the notice is auditable instead of living only in local storage.</p>
            </div>
            <button
              onClick={acknowledge}
              disabled={saving}
              className="shrink-0 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60 transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
