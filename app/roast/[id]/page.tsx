'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/roast/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [id]);

  const handleShareOnX = useCallback((score: number) => {
    const url = `${window.location.origin}/roast/${id}`;
    const text = `My TikTok just got roasted by 6 AI agents and scored ${score}/100 🔥`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  }, [id]);

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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-orange-500/8 via-pink-500/4 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-orange-500/3 rounded-full blur-3xl" />
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

          {/* Overall Score — dramatic reveal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
            className="flex flex-col items-center mt-4"
          >
            <div className="flex items-center gap-8">
              <ScoreRing score={roast.overallScore} size={110} />
              <div className="flex flex-col items-start">
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-7xl font-black fire-text leading-none"
                >
                  {getLetterGrade(roast.overallScore)}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-zinc-400 text-xl font-semibold mt-1"
                >
                  {roast.overallScore}<span className="text-zinc-600 text-sm">/100</span>
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className={`text-xs font-semibold mt-2 px-2.5 py-1 rounded-full ${
                    roast.overallScore >= 80 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    roast.overallScore >= 60 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    roast.overallScore >= 40 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {roast.overallScore >= 80 ? `🔥 Actually decent` :
                   roast.overallScore >= 60 ? `⚡ Work to do` :
                   roast.overallScore >= 40 ? `💀 Needs help` :
                   `🚨 We need to talk`}
                </motion.span>
              </div>
            </div>
          </motion.div>

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

          {/* Share buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="flex items-center justify-center gap-3 mt-6"
          >
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm font-semibold hover:border-orange-500/50 hover:text-orange-400 transition-all"
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleShareOnX(roast.overallScore)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black border border-zinc-700 text-white text-sm font-semibold hover:border-white/30 hover:bg-zinc-900 transition-all"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.733-8.835L1.254 2.25H8.08l4.258 5.63L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Share on X</span>
            </button>
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
          transition={{ delay: 1.3 }}
          className="mt-10 rounded-2xl bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent border border-orange-500/20 p-8 text-center space-y-4"
        >
          <p className="text-zinc-400 text-sm">Think you can do better?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 fire-gradient text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-lg"
          >
            <span>🔥</span>
            Roast YOUR TikTok →
          </Link>
          <p className="text-zinc-600 text-xs">6 AI agents. Brutally honest. Free.</p>
          {history.length > 0 && (
            <div className="pt-1">
              <Link
                href="/history"
                className="text-xs text-zinc-600 hover:text-orange-400 transition-colors"
              >
                View your roast history ({history.length})
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
