'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DetectedHookType, HookTypeLens } from '@/lib/hook-help';
import {
  HOOK_EXAMPLES_BANK,
  HOOK_HIERARCHY,
  HOOK_TOOLTIPS,
  getExamplesForHookType,
  type HookExample,
  type HookTooltip,
} from '@/lib/hook-education';

/* ------------------------------------------------------------------ */
/*  Tooltip - hover/tap to reveal a concept definition                 */
/* ------------------------------------------------------------------ */

export function EducationalTooltip({ tooltipKey, children }: { tooltipKey: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const tip = HOOK_TOOLTIPS[tooltipKey];
  if (!tip) return <>{children}</>;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={() => setOpen(o => !o)}
    >
      <span className="underline decoration-dotted decoration-zinc-500 underline-offset-4 cursor-help">{children}</span>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl pointer-events-none text-left"
          >
            <span className="block text-[11px] font-bold uppercase tracking-widest text-orange-400 mb-1">{tip.term}</span>
            <span className="block text-xs text-zinc-300 leading-relaxed">{tip.definition}</span>
            <span className="block text-xs text-zinc-500 mt-1.5 leading-relaxed">{tip.whyItMatters}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook Hierarchy Diagram - the "fix the hook first" visual           */
/* ------------------------------------------------------------------ */

export function HookHierarchyDiagram({ isHookWeak }: { isHookWeak: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-left">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">why hook quality gates everything</p>
          <h4 className="mt-1 text-sm font-bold text-white">
            <EducationalTooltip tooltipKey="hook-hierarchy">the hook hierarchy</EducationalTooltip>
          </h4>
        </div>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 shrink-0">
          beginner guide
        </span>
      </div>
      <p className="text-xs text-zinc-400 mb-4">
        every element in your video sits behind a gate. the{' '}
        <EducationalTooltip tooltipKey="hook">hook</EducationalTooltip>{' '}
        is the gate. if it fails, nothing downstream gets seen.
      </p>

      <div className="space-y-1.5">
        {HOOK_HIERARCHY.map((level, i) => {
          const isBlocked = isHookWeak && level.gated;
          return (
            <div
              key={level.label}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                i === 0
                  ? isHookWeak
                    ? 'border-red-500/40 bg-red-500/10'
                    : 'border-emerald-500/30 bg-emerald-500/8'
                  : isBlocked
                    ? 'border-zinc-800/60 bg-zinc-950/30 opacity-45'
                    : 'border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0
                  ? isHookWeak ? 'bg-red-500/25 text-red-300' : 'bg-emerald-500/25 text-emerald-300'
                  : isBlocked ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${
                  i === 0
                    ? isHookWeak ? 'text-red-200' : 'text-emerald-200'
                    : isBlocked ? 'text-zinc-600' : 'text-zinc-200'
                }`}>
                  {level.label}
                </p>
                <p className={`text-xs ${isBlocked ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  {level.description}
                </p>
              </div>
              {i === 0 && isHookWeak && (
                <span className="shrink-0 text-xs font-bold text-red-400 uppercase tracking-widest">blocked</span>
              )}
              {i === 0 && !isHookWeak && (
                <span className="shrink-0 text-xs font-bold text-emerald-400 uppercase tracking-widest">cleared</span>
              )}
              {isBlocked && i > 0 && (
                <span className="shrink-0 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">gated</span>
              )}
            </div>
          );
        })}
      </div>

      {isHookWeak && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-300 font-semibold">
            Your hook is not clearing the gate right now.
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            That means every improvement below - better captions, stronger CTA, smarter hashtags - gets wasted because viewers never make it past the first second. Fix the hook first, then come back and polish the rest.
          </p>
        </div>
      )}
      {!isHookWeak && (
        <p className="mt-3 text-xs text-zinc-500 italic">
          your hook is clearing the gate, so improvements to the downstream layers can actually reach your audience.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook Examples Bank - strong vs weak by type                        */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  visual: 'Visual Hook',
  spoken: 'Spoken Hook',
  text: 'Text Hook',
  motion: 'Motion Hook',
  curiosity: 'Curiosity Hook',
  attractiveness: 'Attractiveness Hook',
};

export function HookExamplesBank({ detectedType }: { detectedType: DetectedHookType }) {
  const [selectedType, setSelectedType] = useState<string>(detectedType.type === 'none' ? 'curiosity' : detectedType.type);
  const types = Object.keys(TYPE_LABELS);

  const strong = HOOK_EXAMPLES_BANK.find(e => e.hookType === selectedType && e.strength === 'strong');
  const weak = HOOK_EXAMPLES_BANK.find(e => e.hookType === selectedType && e.strength === 'weak');

  // Also get the matched pair for the detected type
  const matchedPair = getExamplesForHookType(detectedType);

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-5 text-left">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400">hook examples bank</p>
          <h4 className="mt-1 text-sm font-bold text-white">
            see what strong vs weak looks like for each{' '}
            <EducationalTooltip tooltipKey="hook-type">hook type</EducationalTooltip>
          </h4>
        </div>
        <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-violet-300 shrink-0">
          learn by example
        </span>
      </div>
      <p className="text-xs text-zinc-400 mb-4">
        a strong hook earns the pause in the first second. a weak one lets the viewer leave without friction. tap a type to compare.
      </p>

      {/* Type selector pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border transition-all ${
              selectedType === t
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Detected type callout */}
      {detectedType.type !== 'none' && selectedType === detectedType.type && (
        <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">your detected type</p>
          <p className="text-xs text-zinc-300">{detectedType.explanation}</p>
        </div>
      )}

      {/* Strong vs weak comparison */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedType}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="grid gap-3 md:grid-cols-2"
        >
          {strong && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">strong example</p>
              </div>
              <p className="text-sm text-white leading-relaxed">{strong.line}</p>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{strong.breakdown}</p>
            </div>
          )}
          {weak && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-red-300">weak example</p>
              </div>
              <p className="text-sm text-white leading-relaxed">{weak.line}</p>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{weak.breakdown}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-4 text-xs text-zinc-500 italic">
        the difference is not production value - it is whether the first beat gives a cold viewer a reason to stay.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  "What is a hook?" beginner explainer - always shown                */
/* ------------------------------------------------------------------ */

export function HookExplainerBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">new to hooks?</p>
          <h4 className="mt-1 text-sm font-bold text-white">
            what is a <EducationalTooltip tooltipKey="hook">hook</EducationalTooltip> and why does it decide everything?
          </h4>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          {expanded ? 'collapse' : 'read more'}
        </button>
      </div>

      <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
        A hook is the first 1-2 seconds of your video. It is the only part every viewer sees - and for most of them, it is also the last.
        TikTok tests each video on a small batch of strangers. If they swipe away in the first second, the algorithm never shows it to more people.
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">the 1-second rule</p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  The average TikTok viewer decides whether to keep watching within the first second. Not three seconds, not five - one. Your hook has to earn their attention before the brain even finishes processing the image.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">what makes a strong hook</p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Strong hooks do one or more of these instantly: show a surprising visual, make a bold claim, ask a question the viewer wants answered, or display text that creates an{' '}
                  <EducationalTooltip tooltipKey="open-loop">open loop</EducationalTooltip>.
                  The best hooks stack multiple types - a curiosity line over a bold visual with motion.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">why everything else is secondary</p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  If 80% of viewers leave in the first second, then your perfect CTA, your clever caption, and your trending hashtag all reach only the 20% who stayed. Fixing the hook is the only way to make all that other work actually count.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  <EducationalTooltip tooltipKey="mute-mode">mute-mode</EducationalTooltip> matters
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  About half of TikTok viewers browse with sound off. If your hook relies entirely on a spoken line, you are invisible to half your potential audience. Strong hooks work on mute - through visuals, motion, and on-screen text.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
