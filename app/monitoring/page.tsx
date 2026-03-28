'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getMonitors, toggleMonitor, removeMonitor, MonitorEntry, getScoreTrend } from '@/lib/monitoring';
import { MonitorCard } from '@/components/MonitorCard';

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
  const avgScore = monitors.length > 0
    ? Math.round(monitors.reduce((a, m) => a + m.lastScore, 0) / monitors.length)
    : 0;

  if (!loaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">📡</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-orange-500/5 via-red-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold fire-text mb-2">Video Monitoring</h1>
          <p className="text-sm text-zinc-400">
            Track your videos over time. See how your scores change with each re-roast.
          </p>
        </motion.div>

        {monitors.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-6">📡</div>
            <h2 className="text-xl font-bold text-white mb-2">No monitors yet</h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
              Upload and roast a video, then hit &ldquo;Monitor This Video&rdquo; to start tracking
              your improvement over time.
            </p>
            <Link
              href="/"
              className="inline-block fire-gradient text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Upload a Video
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
              <StatBox label="Monitored" value={monitors.length} />
              <StatBox label="Active" value={active.length} />
              <StatBox label="Improving" value={improving} color="#4ade80" />
              <StatBox label="Avg Score" value={avgScore} />
            </motion.div>

            {/* Active monitors */}
            {active.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
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
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
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
              className="text-center mt-10"
            >
              <Link
                href="/"
                className="text-sm text-zinc-500 hover:text-orange-400 transition-colors"
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

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
      <p className="text-2xl font-bold" style={color ? { color } : undefined}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}
