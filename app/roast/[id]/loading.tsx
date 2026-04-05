'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENTS = [
  { emoji: '💀', name: 'Hook Agent', task: 'dissecting your first 3 seconds...', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/8' },
  { emoji: '🎨', name: 'Visual Agent', task: 'rating your cinematography choices...', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/8' },
  { emoji: '🔮', name: 'Algorithm Agent', task: 'predicting your FYP fate...', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/8' },
  { emoji: '💰', name: 'Conversion Agent', task: 'evaluating your CTA strategy...', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/8' },
  { emoji: '👁️', name: 'Authenticity Agent', task: 'scanning for cringe signals...', color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/8' },
  { emoji: '🎧', name: 'Audio Agent', task: 'performing audio autopsy...', color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/8' },
];

const LOADING_MESSAGES = [
  'analyzing your first 3 seconds...',
  'checking scroll-stop strength...',
  'diagnosing the hook...',
  'stack-ranking what to fix...',
  'building your reshoot plan...',
  'packaging the go viral verdict...',
];

function AgentRow({ agent, index }: { agent: typeof AGENTS[0]; index: number }) {
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const startDelay = setTimeout(() => setActive(true), index * 400 + 300);
    return () => clearTimeout(startDelay);
  }, [index]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 + 0.1, duration: 0.4 }}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-500 ${
        active ? `${agent.border} ${agent.bg}` : 'border-zinc-800/60 bg-zinc-900/40'
      }`}
    >
      <span className="text-xl shrink-0">{agent.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold transition-colors duration-500 ${active ? agent.color : 'text-zinc-500'}`}>
            {agent.name}
          </p>
          <div className="shrink-0">
            {active ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex gap-1"
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className={`w-1 h-1 rounded-full ${agent.color.replace('text-', 'bg-')}`}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </motion.div>
            ) : (
              <span className="w-2 h-2 rounded-full bg-zinc-700 block" />
            )}
          </div>
        </div>
        {active && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-zinc-500 mt-0.5 truncate"
          >
            {agent.task}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

export default function RoastLoading() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((p) => (p + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(msgInterval);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const duration = 55000; // ~55s expected analysis time
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const raw = Math.min((elapsed / duration) * 100, 92); // cap at 92% until real result
      setProgress(Math.round(raw));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[35rem] w-[35rem] -translate-x-1/2 rounded-full bg-orange-500/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-pink-500/8 blur-[120px]" />
        <div className="absolute top-1/2 left-0 h-64 w-64 rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-6">

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[28px] border border-orange-500/25 bg-zinc-950/90 p-6 sm:p-8 shadow-2xl shadow-orange-500/8 backdrop-blur-xl"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4 flex-1">
              {/* Status badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                <motion.span
                  className="h-2 w-2 rounded-full bg-orange-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                6 agents analyzing
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  building your go viral verdict
                </h1>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="mt-3 text-sm text-zinc-400 sm:text-base"
                  >
                    {LOADING_MESSAGES[messageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>analysis progress</span>
                  <span className="text-orange-400 font-semibold">{progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Expected output panel */}
            <div className="lg:w-56 shrink-0 rounded-[20px] border border-zinc-800/80 bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 mb-3">
                you&apos;ll get
              </p>
              <div className="space-y-2">
                {[
                  { icon: '📉', label: 'hook diagnosis' },
                  { icon: '🎯', label: 'priority fixes' },
                  { icon: '📊', label: 'score + verdict' },
                  { icon: '🎬', label: 'filmable reshoot' },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 + 0.3 }}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-800/60 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-200"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Agent activity grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-[28px] border border-zinc-800/70 bg-zinc-950/75 p-5 backdrop-blur-xl"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500 mb-4">agents at work</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AGENTS.map((agent, i) => (
              <AgentRow key={agent.name} agent={agent} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Bottom hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center text-xs text-zinc-700"
        >
          analysis typically takes 30–90 seconds depending on video length
        </motion.div>
      </div>
    </main>
  );
}
