'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AGENTS } from '@/lib/agents';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    // For MVP, go straight to the demo roast
    router.push(`/analyze/demo-001?url=${encodeURIComponent(url)}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background fire glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-red-500/5 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 max-w-3xl w-full text-center space-y-8">
        {/* Logo / Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="fire-text">Roast</span>{' '}
            <span className="text-white">My TikTok</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-zinc-400 max-w-xl mx-auto">
            Your TikTok is cringe.{' '}
            <span className="text-zinc-200 font-medium">Watch AI prove it.</span>
          </p>
        </motion.div>

        {/* URL Input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="flex gap-3 max-w-xl mx-auto">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your TikTok URL..."
              className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-5 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="fire-gradient text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Roasting...
                </span>
              ) : (
                'Roast It'
              )}
            </button>
          </div>
        </motion.form>

        {/* Agent Preview Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto mt-12"
        >
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 text-left hover:border-orange-500/30 transition-colors group"
            >
              <div className="text-2xl mb-2">{agent.emoji}</div>
              <div className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                {agent.name}
              </div>
              <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {agent.oneLiner}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-xs text-zinc-600 mt-8"
        >
          6 AI agents. 100+ data points. Zero mercy.
        </motion.p>
      </div>
    </main>
  );
}
