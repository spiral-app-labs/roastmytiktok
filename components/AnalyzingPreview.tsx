'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  thumbDataUrl: string | null;
  thumbWidth: number | null;
  thumbHeight: number | null;
  /**
   * Which dimension is currently being analyzed. Drives both the bubble copy
   * (so the messages match what the AI is actually doing right now) and
   * triggers a pop-out → pop-in transition when the dimension changes.
   */
  activeDimension: string | null;
}

interface Bubble {
  id: string;
  text: string;
  emoji: string;
  side: 'left' | 'right';
  /** Vertical slot index within this side's column (0..2) */
  slot: number;
  /** Order within the full set — drives staggered entry */
  order: number;
}

// Process narration only — describes what the AI is *doing*, never claims
// about what's in the video. Tags map 1:1 to AGENT keys in lib/agents.ts.
const COMMENTARY: Array<{ emoji: string; text: string; tag?: string }> = [
  // Hook (key: 'hook')
  { emoji: '🪝', text: 'grading the first 3 seconds first', tag: 'hook' },
  { emoji: '⏱️', text: 'measuring time-to-first-payoff', tag: 'hook' },
  { emoji: '📉', text: 'mapping where the hook likely loses viewers', tag: 'hook' },
  { emoji: '🎯', text: 'looking for a true scroll-stopper', tag: 'hook' },
  { emoji: '⚡', text: 'scoring hold through 3s and 5s', tag: 'hook' },

  // Visual (key: 'visual')
  { emoji: '🎨', text: 'rating composition + lighting', tag: 'visual' },
  { emoji: '🎬', text: 'tracking first-cut timing', tag: 'visual' },
  { emoji: '📐', text: 'checking how the opening is framed', tag: 'visual' },
  { emoji: '✨', text: 'scanning for visual interest in the hook', tag: 'visual' },
  { emoji: '🌈', text: 'reading the opening color story', tag: 'visual' },

  // Audio (key: 'audio')
  { emoji: '🎧', text: 'checking if audio improves the hook', tag: 'audio' },
  { emoji: '🎵', text: 'measuring music support vs distraction', tag: 'audio' },
  { emoji: '🔊', text: 'measuring vocal clarity', tag: 'audio' },
  { emoji: '🥁', text: 'listening to the music + voice mix', tag: 'audio' },

  // Authenticity (key: 'authenticity')
  { emoji: '👁️', text: 'gauging delivery + energy', tag: 'authenticity' },
  { emoji: '💯', text: 'rating performance feel', tag: 'authenticity' },
  { emoji: '🤝', text: 'reading camera presence in the opener', tag: 'authenticity' },
  { emoji: '🎭', text: 'checking for cringe signals', tag: 'authenticity' },

  // Conversion (key: 'conversion')
  { emoji: '💰', text: 'checking whether value is clear early', tag: 'conversion' },
  { emoji: '📌', text: 'scoring shareability', tag: 'conversion' },
  { emoji: '🔗', text: 'checking searchable keywords', tag: 'conversion' },
  { emoji: '🪄', text: 'spotting the proposition in the opening', tag: 'conversion' },

  // Accessibility (key: 'accessibility')
  { emoji: '📝', text: 'reading on-screen text in the opening', tag: 'accessibility' },
  { emoji: '🔠', text: 'checking text timing and legibility', tag: 'accessibility' },
  { emoji: '👀', text: 'measuring text contrast and safe zones', tag: 'accessibility' },

  // Generic process (no specific tag — fillers when a dimension is thin)
  { emoji: '🧠', text: 'cross-checking proven viral hooks', tag: 'generic' },
  { emoji: '📊', text: 'pulling niche benchmarks', tag: 'generic' },
  { emoji: '📈', text: 'projecting early retention', tag: 'generic' },
  { emoji: '🔍', text: 'reading hook frames one by one', tag: 'generic' },
  { emoji: '🎙️', text: 'transcribing the opener', tag: 'generic' },
  { emoji: '🗺️', text: 'building your reshoot plan', tag: 'generic' },
];

const BUBBLES_PER_SET = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSetForDimension(dimension: string): Bubble[] {
  const specific = COMMENTARY.filter((c) => c.tag === dimension);
  const generic = COMMENTARY.filter((c) => c.tag === 'generic');

  // Prefer dimension-specific messages; backfill with generic if a dimension
  // doesn't have enough of its own to fill the set.
  const specPicks = shuffle(specific).slice(0, Math.min(specific.length, BUBBLES_PER_SET));
  const genPicks = shuffle(generic).slice(0, BUBBLES_PER_SET - specPicks.length);
  const picks = [...specPicks, ...genPicks];

  // Distribute alternating left/right with deterministic slot indices so
  // multiple bubbles never collide vertically inside a column.
  return picks.map((c, i) => ({
    id: `${dimension}-${i}-${c.text}`,
    text: c.text,
    emoji: c.emoji,
    side: i % 2 === 0 ? 'left' : 'right',
    slot: Math.floor(i / 2),
    order: i,
  }));
}

export function AnalyzingPreview({
  thumbDataUrl,
  thumbWidth,
  thumbHeight,
  activeDimension,
}: Props) {
  const [bubbles, setBubbles] = useState<Bubble[]>(() => buildSetForDimension(activeDimension ?? 'generic'));
  const currentDimRef = useRef<string | null>(activeDimension ?? 'generic');

  // Compute aspect ratio for the thumbnail wrapper. Defaults to 9:16 (TikTok)
  // when we don't yet have dimensions.
  const aspectRatio = useMemo(() => {
    if (thumbWidth && thumbHeight) return thumbWidth / thumbHeight;
    return 9 / 16;
  }, [thumbWidth, thumbHeight]);

  // When the active dimension changes (or first mounts), pop the current set
  // out, then bring in a fresh staggered set for the new dimension.
  useEffect(() => {
    const nextDim = activeDimension ?? 'generic';
    if (nextDim === currentDimRef.current) return;

    // Subsequent change — clear (triggers exit pop-out), then refill.
    currentDimRef.current = nextDim;
    const clearTimer = setTimeout(() => {
      setBubbles([]);
    }, 0);
    const t = setTimeout(() => {
      setBubbles(buildSetForDimension(nextDim));
    }, 360);
    return () => {
      clearTimeout(clearTimer);
      clearTimeout(t);
    };
  }, [activeDimension]);

  return (
    <div className="relative w-full flex justify-center px-4 py-6">
      {/* Ambient glow behind everything */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[420px] w-[420px] rounded-full bg-orange-500/20 blur-[100px]" />
        <div className="absolute h-[260px] w-[260px] rounded-full bg-pink-500/15 blur-[80px]" />
        <div className="absolute h-[320px] w-[320px] rounded-full bg-sky-500/10 blur-[110px]" />
      </div>

      {/* Left bubble column — desktop only, sits well off the frame */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden lg:block"
        style={{ width: 'calc(50% - 170px)' }}
      >
        <BubbleColumn bubbles={bubbles.filter((b) => b.side === 'left')} side="left" />
      </div>

      {/* Right bubble column */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
        style={{ width: 'calc(50% - 170px)' }}
      >
        <BubbleColumn bubbles={bubbles.filter((b) => b.side === 'right')} side="right" />
      </div>

      {/* Thumbnail — height-capped at 50vh so the title above and the status
          + progress + check pills below it never get pushed off-screen. */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        className="relative z-10"
        style={{
          height: 'min(50vh, 460px)',
          aspectRatio: `${aspectRatio}`,
        }}
      >
        {/* Thumbnail glow ring */}
        <div className="absolute -inset-3 rounded-[32px] bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.28),transparent_45%),radial-gradient(circle_at_50%_70%,rgba(249,115,22,0.28),transparent_55%)] blur-xl opacity-95" />
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-b from-orange-500/40 via-pink-500/30 to-orange-500/20 blur-md opacity-80" />
        <div className="absolute inset-0 rounded-[26px] ring-1 ring-white/10" />

        {thumbDataUrl ? (
          // Using a plain <img> on purpose: data URLs don't play nicely with next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbDataUrl}
            alt="Your video"
            className="relative h-full w-full rounded-[26px] object-cover shadow-[0_30px_80px_-30px_rgba(251,146,60,0.6)]"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center rounded-[26px] bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-[0_30px_80px_-30px_rgba(251,146,60,0.6)]">
            <span className="text-5xl">🎬</span>
          </div>
        )}

        {/* Scanning line animation */}
        <motion.div
          className="absolute inset-x-0 top-0 h-1/3 rounded-[26px] bg-gradient-to-b from-orange-400/40 via-orange-400/10 to-transparent"
          initial={{ y: 0 }}
          animate={{ y: ['0%', '200%', '0%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Pulsing border */}
        <motion.div
          className="absolute inset-0 rounded-[26px] ring-2 ring-orange-400/0"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(251,146,60,0.5)',
              '0 0 0 12px rgba(251,146,60,0)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.div>
    </div>
  );
}

// 3 evenly-spaced vertical slots per side. Wide gaps so the staggered entry
// reads as a fan-in rather than a stack.
const SLOT_TOPS = ['12%', '42%', '72%'];

function BubbleColumn({ bubbles, side }: { bubbles: Bubble[]; side: 'left' | 'right' }) {
  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {bubbles.map((b) => {
          const top = SLOT_TOPS[b.slot] ?? '50%';
          // Stagger entry across the full set so they don't all pop in at once.
          const enterDelay = b.order * 0.11;
          return (
            <motion.div
              key={b.id}
              initial={{
                opacity: 0,
                y: 12,
                x: side === 'left' ? -20 : 20,
                scale: 0.55,
              }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 0.5,
                y: 4,
                transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
              }}
              transition={{
                type: 'spring',
                stiffness: 360,
                damping: 22,
                mass: 0.7,
                delay: enterDelay,
              }}
              className="absolute pointer-events-none"
              style={{
                top,
                [side]: '6%',
                transformOrigin: side === 'left' ? 'center left' : 'center right',
                maxWidth: '240px',
              }}
            >
              <div
                className={`flex items-start gap-2.5 rounded-2xl ${
                  side === 'left' ? 'rounded-bl-sm' : 'rounded-br-sm'
                } border border-blue-400/40 bg-blue-950/85 backdrop-blur-md px-3.5 py-2.5 shadow-[0_0_24px_-2px_rgba(59,130,246,0.55),0_0_60px_-15px_rgba(59,130,246,0.4),0_8px_24px_-12px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-blue-300/15`}
              >
                <span className="text-base shrink-0 leading-none mt-0.5">{b.emoji}</span>
                <span className="text-[12px] text-blue-50 leading-snug max-w-[200px]">
                  {b.text}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
