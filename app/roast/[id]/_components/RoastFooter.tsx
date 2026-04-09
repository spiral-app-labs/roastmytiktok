'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { getHistory } from '@/lib/history';

type DownloadVariant = 'square' | 'story' | null;

interface RoastFooterProps {
  copied: boolean;
  onCopyLink: () => void;
  onShareOnX: () => void;
  onDownload: (variant: 'square' | 'story') => void;
  downloading: DownloadVariant;
}

export default function RoastFooter({
  copied,
  onCopyLink,
  onShareOnX,
  onDownload,
  downloading,
}: RoastFooterProps) {
  const shouldReduceMotion = useReducedMotion();

  // Read history exactly once per mount, not on every render.
  const [historyCount] = useState(() => getHistory().length);

  return (
    <motion.section
      aria-label="Actions"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.5 }}
      className="mt-16 flex flex-col items-center gap-6 border-t border-white/[0.08] pt-12"
    >
      {/* Primary CTA */}
      <Link
        href="/"
        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-8 py-4 font-display text-base font-bold text-white shadow-[0_20px_50px_-15px_rgba(251,146,60,0.55)] sm:w-auto"
        style={{
          background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ec4899 100%)',
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
          }}
        />
        <span className="relative">🔥</span>
        <span className="relative">Analyze another video</span>
        <span className="relative transition-transform group-hover:translate-x-0.5">→</span>
      </Link>

      {/* Secondary pill bar */}
      <div
        className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md"
        role="group"
        aria-label="Share actions"
      >
        <PillButton
          onClick={onCopyLink}
          label={copied ? 'Copied' : 'Copy link'}
          active={copied}
        >
          {copied ? (
            <svg
              aria-hidden
              className="h-4 w-4 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg
              aria-hidden
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
          )}
        </PillButton>

        <Divider />

        <PillButton onClick={onShareOnX} label="Share on X">
          <svg aria-hidden className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.733-8.835L1.254 2.25H8.08l4.258 5.63L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </PillButton>

        <Divider />

        <PillButton
          onClick={() => onDownload('square')}
          disabled={downloading !== null}
          label="Download image"
        >
          {downloading === 'square' ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-orange-400" />
          ) : (
            <svg
              aria-hidden
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          )}
        </PillButton>
      </div>

      {historyCount > 0 && (
        <Link
          href="/history"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-orange-300"
        >
          View history ({historyCount})
        </Link>
      )}
    </motion.section>
  );
}

function PillButton({
  onClick,
  disabled,
  label,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        'relative flex h-10 w-10 items-center justify-center rounded-full transition-all disabled:opacity-40',
        active ? 'text-emerald-400' : 'text-zinc-400 hover:text-orange-300',
      ].join(' ')}
    >
      <span className="absolute inset-1 rounded-full bg-white/[0.04] opacity-0 transition-opacity hover:opacity-100" />
      <span className="relative">{children}</span>
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-white/10" />;
}
