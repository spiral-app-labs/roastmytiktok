'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ANALYSIS_STEPS = [
  { icon: '🎬', label: 'reading the opener + first-frame signals', detail: 'frame analysis, motion detection, text overlay scan' },
  { icon: '🎣', label: 'checking whether the hook earns a stop', detail: 'scroll-stop probability, curiosity gap, pattern interrupt' },
  { icon: '📊', label: 'stack-ranking what to fix first', detail: 'impact scoring across all 6 dimensions' },
  { icon: '🗺️', label: 'packaging your rewrite + reshoot plan', detail: 'generating filmable options you can test today' },
];

const HEADLINE_CYCLE = [
  'building your go viral diagnosis',
  'six agents, one verdict',
  'finding exactly what to fix first',
  'turning data into an action plan',
];

export default function AnalyzeLoading() {
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((p) => (p + 1) % HEADLINE_CYCLE.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((p) => (p < ANALYSIS_STEPS.length - 1 ? p + 1 : p));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const duration = 55000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(Math.round((elapsed / duration) * 100), 92));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden px-4 py-10">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-orange-500/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-pink-500/8 blur-[100px]" />
        <div className="absolute top-1/3 left-0 h-56 w-56 rounded-full bg-indigo-500/6 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-5">

        {/* Main hero card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[28px] border border-orange-500/22 bg-zinc-950/88 p-6 shadow-2xl shadow-orange-500/6 backdrop-blur-xl sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4 flex-1">
              {/* Status */}
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/28 bg-orange-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
                <motion.span
                  className="h-2 w-2 rounded-full bg-orange-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                />
                analysis in progress
              </div>

              {/* Animated headline */}
              <div className="min-h-[3rem]">
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={headlineIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="text-3xl font-black tracking-tight text-white sm:text-4xl"
                  >
                    {HEADLINE_CYCLE[headlineIndex]}
                  </motion.h1>
                </AnimatePresence>
              </div>

              <p className="text-sm leading-relaxed text-zinc-400 sm:text-base max-w-xl">
                not just generating a roast — figuring out whether the opener earns attention,
                what&apos;s dragging retention, and the cleanest fix to film next.
              </p>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>overall progress</span>
                  <span className="text-orange-400 font-semibold tabular-nums">{progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="grid gap-2 sm:grid-cols-2">
                {ANALYSIS_STEPS.map((step, index) => {
                  const isActive = index === activeStep;
                  const isDone = index < activeStep;
                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                      className={`rounded-2xl border px-4 py-3 transition-all duration-500 ${
                        isDone
                          ? 'border-emerald-500/20 bg-emerald-500/8'
                          : isActive
                          ? 'border-orange-500/25 bg-orange-500/8'
                          : 'border-zinc-800/80 bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{step.icon}</span>
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${
                          isDone ? 'text-emerald-400' : isActive ? 'text-orange-300' : 'text-zinc-600'
                        }`}>
                          {isDone ? '✓ done' : isActive ? 'in progress' : `step ${index + 1}`}
                        </span>
                      </div>
                      <p className={`text-sm font-medium transition-colors ${
                        isDone ? 'text-zinc-400' : isActive ? 'text-zinc-200' : 'text-zinc-500'
                      }`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-zinc-600 mt-0.5"
                        >
                          {step.detail}
                        </motion.p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Expected output */}
            <div className="lg:w-60 shrink-0 rounded-[22px] border border-zinc-800/80 bg-black/22 p-5">
              <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <span>expected output</span>
                <span className="text-orange-300 font-semibold">go viral pass</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: '📉', label: 'hook diagnosis' },
                  { icon: '🎯', label: 'priority fixes' },
                  { icon: '📊', label: 'clear score + verdict' },
                  { icon: '🎬', label: 'filmable reshoot options' },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.4 }}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm text-zinc-200"
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Skeleton preview of results layout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]"
        >
          {/* Left skeleton — score + verdict area */}
          <div className="rounded-[28px] border border-zinc-800/70 bg-zinc-950/75 p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-zinc-800/60 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 rounded-lg bg-zinc-800/60 animate-pulse" />
                <div className="h-4 w-full rounded-lg bg-zinc-800/50 animate-pulse" />
                <div className="h-4 w-3/4 rounded-lg bg-zinc-800/40 animate-pulse" />
              </div>
            </div>
            <div className="h-28 rounded-2xl bg-zinc-800/40 animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-zinc-800/40 animate-pulse" />
              ))}
            </div>
          </div>

          {/* Right skeleton — agent cards */}
          <div className="rounded-[28px] border border-zinc-800/70 bg-zinc-950/75 p-5 backdrop-blur-xl space-y-3">
            <div className="h-4 w-28 rounded-lg bg-zinc-800/60 animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-zinc-800/40 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="text-center text-xs text-zinc-700"
        >
          analysis typically takes 30–90 seconds depending on video length
        </motion.p>
      </div>
    </main>
  );
}
