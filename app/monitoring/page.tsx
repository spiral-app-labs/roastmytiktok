'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getMonitors, toggleMonitor, removeMonitor, MonitorEntry, getScoreTrend } from '@/lib/monitoring';
import { MonitorCard } from '@/components/MonitorCard';

function StatBox({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 text-center backdrop-blur-sm">
      {icon && <p className="text-lg mb-1">{icon}</p>}
      <p className="text-3xl font-black" style={color ? { color } : { color: '#ffffff' }}>{value}</p>
      <p className="text-xs text-zinc-500 mt-1 font-medium uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default function MonitoringPage() {
  const [monitors, setMonitors] = useState<MonitorEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setMonitors(getMonitors());
    setLoaded(true);
  }, []);

  function handleToggle(id: string) {
    toggleMonitor(id);
    setMonitors(getMonitors());
  }

  function handleRemove(id: string) {
    removeMonitor(id);
    setMonitors(getMonitors());
  }

  const active = monitors.filter(m => m.isActive);
  const paused = monitors.filter(m => !m.isActive);
  const improving = monitors.filter(m => getScoreTrend(m) === 'improving').length;
  const declining = monitors.filter(m => getScoreTrend(m) === 'declining').length;
  const avgScore = monitors.length > 0
    ? Math.round(monitors.reduce((a, m) => a + m.lastScore, 0) / monitors.length)
    : 0;

  if (!loaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-4xl"
        >
          📡
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-orange-500/6 via-red-500/4 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/" className="text-sm text-zinc-500 hover:text-orange-400 transition-colors mb-4 inline-block">
            ← Back
          </Link>
          <h1 className="text-4xl font-black fire-text mb-2">Video Monitoring</h1>
          <p className="text-zinc-400">
            Track your content over time. See how your scores evolve with every re-roast.
          </p>
        </motion.div>

        {monitors.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center py-20 px-6"
          >
            <div className="text-7xl mb-5">📡</div>
            <h2 className="text-2xl font-bold text-white mb-2">No monitors yet</h2>
            <p className="text-zinc-500 max-w-sm mx-auto mb-8 text-sm">
              Upload and roast a video, then enable monitoring to track how your scores
              change over time. Proof you&apos;re actually getting better.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 fire-gradient text-white font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
            >
              <span>🔥</span> Upload a Video
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
            >
              <StatBox label="Monitored" value={monitors.length} icon="📹" />
              <StatBox label="Active" value={active.length} icon="🟢" color="#4ade80" />
              <StatBox label="Improving" value={improving} icon="📈" color="#4ade80" />
              <StatBox
                label={declining > 0 ? 'Avg Score' : 'Avg Score'}
                value={avgScore}
                icon={avgScore >= 70 ? '🏆' : avgScore >= 50 ? '👀' : '🔥'}
                color={avgScore >= 70 ? '#4ade80' : avgScore >= 50 ? '#facc15' : '#f87171'}
              />
            </motion.div>

            {/* Trend summary */}
            {(improving > 0 || declining > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-3 mb-6"
              >
                {improving > 0 && (
                  <div className="flex-1 bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-center">
                    <span className="text-green-400 font-bold text-sm">📈 {improving} improving</span>
                  </div>
                )}
                {declining > 0 && (
                  <div className="flex-1 bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                    <span className="text-red-400 font-bold text-sm">📉 {declining} declining</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Active monitors */}
            {active.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Active ({active.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {active.map((m, i) => (
                    <MonitorCard
                      key={m.id}
                      monitor={m}
                      index={i}
                      onToggle={handleToggle}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paused monitors */}
            {paused.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
                  Paused ({paused.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paused.map((m, i) => (
                    <MonitorCard
                      key={m.id}
                      monitor={m}
                      index={i}
                      onToggle={handleToggle}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Add more CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-8"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-400 transition-colors"
              >
                + Upload another video to monitor
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}
