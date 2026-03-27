'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { AGENTS } from '@/lib/agents';

export default function AnalyzePage() {
  const router = useRouter();
  const params = useParams();
  const [activeAgent, setActiveAgent] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    // Simulate agents analyzing one by one
    const interval = setInterval(() => {
      setActiveAgent((prev) => {
        const next = prev + 1;
        setCompleted((c) => [...c, prev]);
        if (next >= AGENTS.length) {
          clearInterval(interval);
          // Navigate to results after short delay
          setTimeout(() => {
            router.push(`/roast/${params.id}`);
          }, 800);
          return prev;
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [router, params.id]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="fire-text">Analyzing</span> your TikTok...
          </h1>
          <p className="text-zinc-500 mt-2 text-sm">
            6 agents are tearing your video apart right now
          </p>
        </motion.div>

        {/* Agent Progress Cards */}
        <div className="space-y-3 text-left">
          {AGENTS.map((agent, i) => {
            const isActive = i === activeAgent;
            const isDone = completed.includes(i);
            const isPending = !isActive && !isDone;

            return (
              <motion.div
                key={agent.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                  isActive
                    ? 'bg-zinc-900/80 border-orange-500/50 card-glow'
                    : isDone
                      ? 'bg-zinc-900/40 border-green-500/30'
                      : 'bg-zinc-900/20 border-zinc-800/30 opacity-50'
                }`}
              >
                <span className="text-2xl">{agent.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{agent.name}</div>
                  <div className="text-xs text-zinc-500">{agent.analyzes}</div>
                </div>
                <div className="text-sm">
                  {isDone ? (
                    <span className="text-green-400">Done</span>
                  ) : isActive ? (
                    <span className="text-orange-400 flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing
                    </span>
                  ) : (
                    <span className="text-zinc-600">Waiting</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
