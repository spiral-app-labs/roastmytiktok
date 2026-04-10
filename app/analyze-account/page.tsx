'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { fetchHistory, HistoryEntry } from '@/lib/history';
import { EmptyState } from '@/components/ui';

import StatsMasthead from './_components/StatsMasthead';
import TabBar, { TabDef } from './_components/TabBar';
import VideoGrid from './_components/VideoGrid';
import RankingsSection from './_components/RankingsSection';
import PlaybookSection from './_components/PlaybookSection';
import TikTokAccountCTA from './_components/TikTokAccountCTA';
import {
  getAvgScore,
  getUserTier,
} from './_components/helpers';

type TabId = 'library' | 'rankings' | 'playbook';

function toneForScore(score: number): 'good' | 'warn' | 'bad' | 'neutral' {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  if (score > 0) return 'bad';
  return 'neutral';
}

export default function AnalyzeAccountPage() {
  const shouldReduceMotion = useReducedMotion();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('library');

  useEffect(() => {
    fetchHistory().then((h) => {
      const sorted = [...h].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setHistory(sorted);
      setLoading(false);
    });
  }, []);

  const totalRoasts = history.length;
  const avgScore = getAvgScore(history);
  const bestScore = history.length ? Math.max(...history.map((e) => e.overallScore)) : 0;
  const tier = getUserTier(avgScore);
  const tierShort = tier.split(' ')[0];

  const stats = useMemo(
    () => [
      { label: 'Videos', value: String(totalRoasts), tone: 'neutral' as const },
      {
        label: 'Avg score',
        value: totalRoasts ? String(avgScore) : '–',
        tone: toneForScore(avgScore),
      },
      {
        label: 'Best',
        value: totalRoasts ? String(bestScore) : '–',
        tone: toneForScore(bestScore),
      },
      { label: 'Tier', value: totalRoasts ? tierShort : '–', tone: toneForScore(avgScore) },
    ],
    [totalRoasts, avgScore, bestScore, tierShort]
  );

  const tabs: TabDef<TabId>[] = [
    { id: 'library', label: 'My videos', count: totalRoasts },
    { id: 'rankings', label: 'Rankings', count: null },
    { id: 'playbook', label: 'Playbook', count: null },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-500/10 via-blue-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[500px] rounded-full bg-gradient-to-tl from-violet-500/8 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-14">
        {/* Header */}
        <motion.header
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-sky-300"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Your account{' '}
            <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">analysis</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
            Every roast in one place. Patterns, rankings, and the next move — private, only you can
            see this.
          </p>
        </motion.header>

        {/* Bulk analyzer */}
        <div className="mb-10">
          <TikTokAccountCTA />
        </div>

        {loading ? (
          <LoadingState />
        ) : totalRoasts === 0 ? (
          <div className="rounded-3xl border border-white/6 bg-zinc-900/40 py-16">
            <EmptyState
              icon="📭"
              title="No roasts yet"
              description="Roast your first TikTok and come back to see your personal library, rankings, and playbook."
              cta={{ label: 'Roast a TikTok', href: '/dashboard' }}
            />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <StatsMasthead stats={stats} />
            </div>

            <div className="mb-8">
              <TabBar<TabId>
                tabs={tabs}
                activeId={activeTab}
                onChange={setActiveTab}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'library' && <VideoGrid entries={history} />}
                {activeTab === 'rankings' && <RankingsSection entries={history} />}
                {activeTab === 'playbook' && <PlaybookSection entries={history} />}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Loading state ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/6 bg-white/[0.015] h-[120px] animate-pulse" />
      <div className="h-10 w-64 rounded-lg bg-white/[0.04] animate-pulse" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="aspect-[9/16] rounded-2xl bg-zinc-900/60 border border-white/6 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
