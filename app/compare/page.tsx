'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageHeader, EmptyState } from '@/components/ui';
import { fetchHistory, getStoredRoast, HistoryEntry } from '@/lib/history';
import { RoastResult } from '@/lib/types';
import { compareRoasts, AgentDelta } from '@/lib/video-comparison';

function getEntryLabel(entry: HistoryEntry) {
  return entry.filename || entry.url || `${entry.overallScore}/100 roast`;
}

function formatConfidence(confidence: 'slight' | 'clear' | 'dominant') {
  if (confidence === 'dominant') return 'dominant edge';
  if (confidence === 'clear') return 'clear edge';
  return 'slight edge';
}

function scoreTone(score: number) {
  if (score >= 75) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
  if (score >= 55) return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
  return 'text-red-400 border-red-500/20 bg-red-500/10';
}

function deltaColor(delta: number) {
  if (delta > 0) return 'text-emerald-400';
  if (delta < 0) return 'text-red-400';
  return 'text-zinc-500';
}

function deltaBg(direction: AgentDelta['direction']) {
  if (direction === 'improved') return 'border-emerald-500/20 bg-emerald-500/5';
  if (direction === 'regressed') return 'border-red-500/20 bg-red-500/5';
  return 'border-zinc-800 bg-zinc-900/50';
}

function formatDelta(delta: number) {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

async function loadRoast(id: string): Promise<RoastResult | null> {
  const stored = getStoredRoast(id);
  if (stored) return stored;

  const res = await fetch(`/api/roast/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export default function ComparePage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const [roastA, setRoastA] = useState<RoastResult | null>(null);
  const [roastB, setRoastB] = useState<RoastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async (nextA: string, nextB: string) => {
    setSelectedA(nextA);
    setSelectedB(nextB);

    if (!nextA || !nextB || nextA === nextB) {
      setRoastA(null);
      setRoastB(null);
      return;
    }

    setComparing(true);
    setError(null);

    try {
      const [a, b] = await Promise.all([loadRoast(nextA), loadRoast(nextB)]);
      setRoastA(a);
      setRoastB(b);
      if (!a || !b) {
        setError('Could not load both roast results for comparison.');
      }
    } catch {
      setError('Comparison failed to load.');
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    fetchHistory().then((items) => {
      const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const nextA = sorted[0]?.id ?? '';
      const nextB = sorted[1]?.id ?? '';
      setHistory(sorted);
      setLoading(false);
      void runComparison(nextA, nextB);
    });
  }, []);

  const entryA = history.find((item) => item.id === selectedA);
  const entryB = history.find((item) => item.id === selectedB);

  const comparison = useMemo(() => {
    if (!roastA || !roastB || !entryA || !entryB || selectedA === selectedB) return null;
    return compareRoasts(roastA, roastB, getEntryLabel(entryA), getEntryLabel(entryB));
  }, [roastA, roastB, entryA, entryB, selectedA, selectedB]);

  if (loading) {
    return <main className="min-h-screen bg-[#080808]" />;
  }

  if (history.length < 2) {
    return (
      <main className="min-h-screen pb-20 relative">
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12">
          <PageHeader title={<span className="fire-text">Compare Two Videos</span>} subtitle="You need at least two roasts before we can crown a winner." backHref="/history" backLabel="← Back to history" />
          <div className="max-w-md mx-auto mt-12">
            <EmptyState icon="⚔️" title="not enough ammo yet" description="roast at least two videos, then come back and we'll tell you which one deserves distribution." cta={{ label: 'Roast another video', href: '/' }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-[520px] bg-gradient-to-b from-orange-500/8 via-pink-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-12 space-y-8">
        <PageHeader
          title={<span className="fire-text">Compare Two Videos</span>}
          subtitle="Pick any two roasts and see exactly what changed across every dimension."
          backHref="/history"
          backLabel="← Back to history"
        />

        {/* Video pickers */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          {[
            { label: 'video a (older)', value: selectedA, role: 'a' as const },
            { label: 'video b (newer)', value: selectedB, role: 'b' as const },
          ].map((picker) => (
            <div key={picker.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">{picker.label}</p>
              <select
                value={picker.value}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  void runComparison(picker.role === 'a' ? nextValue : selectedA, picker.role === 'b' ? nextValue : selectedB);
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 focus:border-orange-500/50 focus:outline-none"
              >
                {history.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {getEntryLabel(entry)} • {entry.overallScore}/100
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {selectedA === selectedB && (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            pick two different videos. comparing a video to itself is a nice confidence exercise, not a feature.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        {comparison && !comparing && entryA && entryB && (
          <>
            {/* Overall score hero */}
            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-zinc-800 bg-zinc-900/75 p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">video a</p>
                    <div className={`text-4xl font-black ${scoreTone(comparison.overallA).split(' ')[0]}`}>{comparison.overallA}</div>
                  </div>
                  <div className="text-center px-4">
                    <div className={`text-2xl font-black ${deltaColor(comparison.overallDelta)}`}>
                      {comparison.overallDelta > 0 ? '→' : comparison.overallDelta < 0 ? '→' : '='} {formatDelta(comparison.overallDelta)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">overall</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">video b</p>
                    <div className={`text-4xl font-black ${scoreTone(comparison.overallB).split(' ')[0]}`}>{comparison.overallB}</div>
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
                    {comparison.winner === 'tie' ? 'coin-flip matchup' : `${formatConfidence(comparison.confidence)} • ${comparison.scoreDelta} point edge`}
                  </div>
                  {comparison.winner !== 'tie' && (
                    <p className="text-xs text-zinc-500">likely winner: <span className="text-white font-semibold">{comparison.winnerLabel}</span></p>
                  )}
                </div>
              </div>
            </motion.section>

            {/* Per-agent score deltas */}
            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">
              <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-orange-400 mb-5">Score by Agent</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {comparison.agentDeltas.map((ad, i) => (
                  <motion.div
                    key={ad.agent}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.04 }}
                    className={`rounded-2xl border p-4 ${deltaBg(ad.direction)}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{ad.emoji}</span>
                      <span className="text-sm font-semibold text-zinc-200">{ad.name}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-xs text-zinc-500">
                        <span className="text-zinc-300 font-mono">{ad.aScore}</span>
                        <span className="mx-1.5">→</span>
                        <span className="text-zinc-300 font-mono">{ad.bScore}</span>
                      </div>
                      <div className={`text-lg font-black ${deltaColor(ad.delta)}`}>
                        {ad.direction === 'unchanged' ? '—' : formatDelta(ad.delta)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* What changed summary */}
            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid gap-4 lg:grid-cols-3">
              {/* What improved */}
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400 mb-4">What Improved</h3>
                {comparison.summary.improved.length === 0 ? (
                  <p className="text-sm text-zinc-500">no improvements detected between these two videos.</p>
                ) : (
                  <div className="space-y-3">
                    {comparison.summary.improved.map((ad) => (
                      <div key={ad.agent} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{ad.emoji}</span>
                          <span className="text-sm text-zinc-200">{ad.name}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">+{ad.delta}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* What got worse */}
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-red-400 mb-4">What Got Worse</h3>
                {comparison.summary.regressed.length === 0 ? (
                  <p className="text-sm text-zinc-500">nothing regressed. solid work across the board.</p>
                ) : (
                  <div className="space-y-3">
                    {comparison.summary.regressed.map((ad) => (
                      <div key={ad.agent} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{ad.emoji}</span>
                          <span className="text-sm text-zinc-200">{ad.name}</span>
                        </div>
                        <span className="text-sm font-bold text-red-400">{ad.delta}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Key lesson */}
              <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400 mb-4">Key Lesson</h3>
                <p className="text-sm text-zinc-200 leading-relaxed">{comparison.summary.keyLesson}</p>
              </div>
            </motion.section>

            {/* Metrics table + reasons */}
            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500 mb-4">Composite Metrics</h3>
                <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr] gap-3 border-b border-zinc-800 pb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <div>metric</div>
                  <div>video a</div>
                  <div>video b</div>
                </div>
                <div className="divide-y divide-zinc-800/80">
                  {comparison.metrics.map((metric) => (
                    <div key={metric.key} className="grid grid-cols-[1.2fr_0.7fr_0.7fr] gap-3 py-4 items-start">
                      <div>
                        <p className="font-semibold text-white">{metric.label}</p>
                        <p className="text-xs text-zinc-500 mt-1">{metric.summary}</p>
                      </div>
                      <div>
                        <div className={`inline-flex rounded-xl border px-3 py-1 text-sm font-bold ${scoreTone(metric.higherIsBetter ? metric.aValue : 100 - metric.aValue)}`}>
                          {metric.aValue}/100
                        </div>
                        {metric.winner === 'a' && <p className="mt-1 text-xs text-emerald-400">wins this lane</p>}
                      </div>
                      <div>
                        <div className={`inline-flex rounded-xl border px-3 py-1 text-sm font-bold ${scoreTone(metric.higherIsBetter ? metric.bValue : 100 - metric.bValue)}`}>
                          {metric.bValue}/100
                        </div>
                        {metric.winner === 'b' && <p className="mt-1 text-xs text-emerald-400">wins this lane</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 mb-2">why it wins</p>
                  <div className="space-y-3">
                    {comparison.reasons.map((reason) => (
                      <div key={`${reason.title}-${reason.winner}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-sm font-semibold text-white">{reason.title}</p>
                        <p className="text-xs text-orange-300 mt-1">{reason.winner === 'a' ? getEntryLabel(entryA) : getEntryLabel(entryB)}</p>
                        <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{reason.detail}</p>
                      </div>
                    ))}
                    {comparison.reasons.length === 0 && (
                      <p className="text-sm text-zinc-500">no clear winner across the key dimensions — both videos are performing at a similar level.</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed italic border-t border-zinc-800 pt-4">{comparison.narrative}</p>
              </div>
            </motion.section>
          </>
        )}

        {comparing && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-6 text-center text-zinc-400">loading both roasts and picking a fight...</div>
        )}

        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <Link href="/history" className="hover:text-orange-400 transition-colors">browse history</Link>
          <span>•</span>
          <Link href="/" className="hover:text-orange-400 transition-colors">roast a new video</Link>
        </div>
      </div>
    </main>
  );
}
