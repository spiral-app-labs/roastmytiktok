'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useSearchParams } from 'next/navigation';
import { RoastResult, DimensionKey } from '@/lib/types';
import { AgentCard } from '@/components/AgentCard';
import { ScoreRing } from '@/components/ScoreRing';
import { saveToHistory, getChronicIssues, getHistory, getFixedIssues, getEscalationLevel, getEscalatingRoast, ChronicIssue } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import Link from 'next/link';

function getLetterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export default function RoastPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoast() {
      // Try sessionStorage first (set by analyze page)
      try {
        const cached = sessionStorage.getItem(`roast_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as RoastResult;
          setRoast(parsed);
          setLoading(false);

          // Save to history
          const source = searchParams.get('source') === 'upload' ? 'upload' : 'url';
          const filename = searchParams.get('filename') ?? undefined;
          saveToHistory(parsed, source, filename);
          return;
        }
      } catch { /* ignore */ }

      // Fallback: fetch from API (Supabase)
      try {
        const res = await fetch(`/api/roast/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRoast(data);

          const source = searchParams.get('source') === 'upload' ? 'upload' : 'url';
          const filename = searchParams.get('filename') ?? undefined;
          saveToHistory(data, source, filename);
        } else {
          setError('Roast not found. It may have expired.');
        }
      } catch {
        setError('Failed to load roast results.');
      }

      setLoading(false);
    }

    loadRoast();
  }, [id, searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">&#128293;</div>
          <p className="text-zinc-400">Loading your roast...</p>
        </div>
      </main>
    );
  }

  if (error || !roast) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#128565;</div>
          <p className="text-zinc-400 mb-4">{error || 'Roast not found.'}</p>
          <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">
            &larr; Try again
          </Link>
        </div>
      </main>
    );
  }

  // Detect chronic issues and fixed issues for escalation UI
  const history = getHistory();
  const findings = Object.fromEntries(
    roast.agents.map(a => [a.agent, a.findings.slice(0, 2)])
  ) as Record<DimensionKey, string[]>;
  const chronicIssues = getChronicIssues(history);
  const fixedIssues = getFixedIssues(findings, history);

  // Build a map of chronic dimensions for quick lookup
  const chronicByDimension: Record<string, ChronicIssue[]> = {};
  for (const issue of chronicIssues) {
    if (!chronicByDimension[issue.dimension]) chronicByDimension[issue.dimension] = [];
    chronicByDimension[issue.dimension].push(issue);
  }

  // Build set of fixed dimensions
  const fixedDimensions = new Set(fixedIssues.map(f => f.dimension));

  // Check if metadata has real data
  const hasMetadata = roast.metadata.views > 0 || roast.metadata.likes > 0;

  return (
    <main className="min-h-screen pb-20 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-red-500/5 via-orange-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-orange-400 transition-colors mb-6 inline-block"
          >
            &larr; Roast another
          </Link>

          {/* Overall Score with Letter Grade */}
          <div className="flex flex-col items-center mt-4">
            <div className="flex items-center gap-6">
              <ScoreRing score={roast.overallScore} size={100} />
              <div className="flex flex-col items-center">
                <span className="text-6xl font-black fire-text leading-none">
                  {getLetterGrade(roast.overallScore)}
                </span>
                <span className="text-zinc-400 text-lg font-semibold mt-1">
                  {roast.overallScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* TL;DR Verdict */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 max-w-2xl mx-auto"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-3">
              TL;DR
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {roast.verdict}
            </p>
          </motion.div>

          {/* Metadata (only show if we have real data) */}
          {hasMetadata && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-zinc-500"
            >
              <span>{roast.metadata.views.toLocaleString()} views</span>
              <span className="text-zinc-700">|</span>
              <span>{roast.metadata.likes} likes</span>
              <span className="text-zinc-700">|</span>
              <span>{roast.metadata.comments} comments</span>
              <span className="text-zinc-700">|</span>
              <span>{roast.metadata.duration}s duration</span>
              <span className="text-zinc-700">|</span>
              <span>{roast.metadata.hashtags.join(' ')}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Fixed issues celebration */}
        {fixedIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-6 bg-green-500/5 border border-green-500/20 rounded-2xl p-5"
          >
            <p className="text-green-400 font-semibold mb-2">Progress Detected</p>
            {fixedIssues.map((f, i) => (
              <p key={i} className="text-sm text-zinc-400">
                You finally fixed <span className="text-green-400 font-medium">{f.dimension}</span>: {f.finding.slice(0, 60)}. We&apos;re proud. Genuinely.
              </p>
            ))}
          </motion.div>
        )}

        {/* CHRONIC ISSUES section */}
        {chronicIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-5"
          >
            <p className="text-red-400 font-bold text-lg mb-1">CHRONIC ISSUES</p>
            <p className="text-sm text-zinc-400 mb-3">These problems keep appearing across your roasts. We&apos;re keeping count.</p>
            <div className="space-y-3">
              {chronicIssues.slice(0, 5).map((c, i) => {
                const agent = AGENTS.find(a => a.key === c.dimension);
                const { level, label } = getEscalationLevel(c.occurrences);
                const levelColors = [
                  '',
                  'border-yellow-500/30 bg-yellow-500/5',
                  'border-orange-500/30 bg-orange-500/5',
                  'border-red-500/30 bg-red-500/10',
                ];
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${levelColors[level] || levelColors[1]}`}>
                    <span className="text-xl shrink-0">{agent?.emoji ?? '\u26a0\ufe0f'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-zinc-200">{agent?.name ?? c.dimension}</span>
                        <span className="text-xs font-bold text-red-400">{c.occurrences}x</span>
                        {level >= 2 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">
                            LVL {level}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">{c.finding.slice(0, 80)}</p>
                      <p className="text-xs text-red-400 mt-1 italic font-medium">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/history" className="mt-3 inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors">
              View full history &rarr;
            </Link>
          </motion.div>
        )}

        {/* Agent Roast Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roast.agents.map((agentRoast, i) => {
            const dimChronic = chronicByDimension[agentRoast.agent];
            const isFixed = fixedDimensions.has(agentRoast.agent);
            const maxOccurrences = dimChronic ? Math.max(...dimChronic.map(c => c.occurrences)) : 0;

            // Escalate roast text if chronic
            const escalatedRoast = maxOccurrences >= 2
              ? { ...agentRoast, roastText: getEscalatingRoast(agentRoast.roastText, agentRoast.agent, maxOccurrences) }
              : agentRoast;

            return (
              <div key={agentRoast.agent} className="relative">
                {/* FIXED badge */}
                {isFixed && (
                  <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-500/30">
                    FIXED
                  </div>
                )}
                {/* Chronic badge */}
                {maxOccurrences >= 2 && !isFixed && (
                  <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30">
                    {maxOccurrences}x REPEAT
                  </div>
                )}
                <AgentCard roast={escalatedRoast} index={i} />
              </div>
            );
          })}
        </div>

        {/* Viral Potential — Coming Soon placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: roast.agents.length * 0.15 }}
          className="mt-4 relative bg-zinc-900/40 border-2 border-dashed border-zinc-700/50 rounded-2xl p-6 opacity-60"
        >
          <div className="absolute -top-2 -right-2 z-10 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-amber-500/30">
            COMING SOON
          </div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              <div>
                <h3 className="font-bold text-white">Viral Potential</h3>
                <p className="text-xs text-zinc-500">Predicts your video&apos;s viral probability based on hook patterns, trending audio, and engagement signals</p>
              </div>
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-zinc-700 flex items-center justify-center">
              <span className="text-zinc-600 text-sm font-bold">?</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500 italic">
            &ldquo;This agent is still training on viral patterns... stay tuned.&rdquo;
          </p>
        </motion.div>

        {/* Watch Live Roast CTA — after agent cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-10"
        >
          <Link
            href={`/roast/${id}/live`}
            className="inline-flex items-center gap-2 fire-gradient text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            <span className="text-lg">&#9654;</span>
            Watch Live Roast
          </Link>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center mt-8 space-y-3"
        >
          <Link
            href="/"
            className="inline-block fire-gradient text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
          >
            Roast Another TikTok
          </Link>
          {history.length > 0 && (
            <div>
              <Link
                href="/history"
                className="text-sm text-zinc-500 hover:text-orange-400 transition-colors"
              >
                View roast history ({history.length})
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
