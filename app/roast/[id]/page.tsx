'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useSearchParams } from 'next/navigation';
import { RoastResult, DimensionKey } from '@/lib/types';
import { getFirstGlanceChecks, getHoldAssessment, getHookWorkshop, getReshootPlanner } from '@/lib/hook-help';
import { AgentCard } from '@/components/AgentCard';
import { ScoreRing } from '@/components/ScoreRing';
import { saveToHistory, getChronicIssues, getHistory, getFixedIssues, getEscalationLevel, getEscalatingRoast, ChronicIssue } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import Link from 'next/link';
import { ScriptGenerator } from '@/components/ScriptGenerator';
import { getContentFormat } from '@/lib/content-formats';

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
  const isHookFirst = roast.analysisMode === 'hook-first' || roast.hookSummary?.strength === 'weak';
  const hookWorkshop = getHookWorkshop(roast);
  const reshootPlanner = getReshootPlanner(roast);
  const holdAssessment = roast.holdAssessment ?? getHoldAssessment(roast);
  const firstGlanceChecks = getFirstGlanceChecks(roast);
  const primaryFormat = roast.formatDiagnosis ? getContentFormat(roast.formatDiagnosis.primaryFormatId) : undefined;

  return (
    <main className="min-h-screen pb-20 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-orange-500/8 via-pink-500/4 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-orange-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-orange-400 transition-colors inline-block"
          >
            &larr; Roast another
          </Link>
        </motion.div>

        {/* Score Hero */}
        <div className="text-center mb-14">
          {/* Ring with letter grade inside */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.15 }}
            className="relative inline-block mb-5"
          >
            <ScoreRing score={roast.overallScore} size={180} showGrade={getLetterGrade(roast.overallScore)} />
          </motion.div>

          {/* Score number */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className={`text-3xl sm:text-4xl font-bold mb-2 ${
              roast.overallScore >= 80 ? 'text-green-400' :
              roast.overallScore >= 60 ? 'text-yellow-400' :
              roast.overallScore >= 40 ? 'text-orange-400' :
              'text-red-400'
            }`}
          >
            {roast.overallScore} <span className="text-zinc-600 text-lg font-medium">/ 100</span>
          </motion.p>

          {/* Status label */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="mb-8"
          >
            <span className={`inline-block text-sm font-bold px-5 py-2 rounded-full ${
              roast.overallScore >= 80 ? 'bg-green-500/15 text-green-400 border border-green-500/25' :
              roast.overallScore >= 60 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25' :
              roast.overallScore >= 40 ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' :
              'bg-red-500/15 text-red-400 border border-red-500/25'
            }`}>
              {roast.overallScore >= 80 ? 'Actually decent' :
               roast.overallScore >= 60 ? 'Room for improvement' :
               roast.overallScore >= 40 ? 'Needs serious work' :
               'We need to talk'}
            </span>
          </motion.div>

          {roast.hookSummary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.92, duration: 0.4 }}
              className={`max-w-3xl mx-auto mb-6 rounded-2xl px-5 py-4 border ${isHookFirst ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}
            >
              <div className="flex items-start gap-3 text-left">
                <div className={`text-2xl ${isHookFirst ? 'text-red-400' : 'text-emerald-400'}`}>{isHookFirst ? '🎣' : '✅'}</div>
                <div className="space-y-2">
                  <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isHookFirst ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isHookFirst ? 'hook-first diagnosis' : 'hook cleared'}
                  </p>
                  <p className="text-sm sm:text-base text-zinc-200">{roast.hookSummary.headline}</p>
                  <p className="text-xs sm:text-sm text-zinc-400">{roast.hookSummary.distributionRisk}</p>
                  <p className={`text-xs sm:text-sm font-medium ${isHookFirst ? 'text-red-300' : 'text-emerald-300'}`}>{roast.hookSummary.focusNote}</p>
                </div>
              </div>
            </motion.div>
          )}

          {roast.formatDiagnosis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.97, duration: 0.4 }}
              className="max-w-4xl mx-auto mb-6 rounded-2xl border border-violet-500/20 bg-violet-500/8 px-5 py-5 text-left"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2 max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">format diagnosis</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-white">you are making a {roast.formatDiagnosis.primaryFormatName.toLowerCase()}</h3>
                    <span className="rounded-full border border-violet-400/20 bg-zinc-950/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-violet-200">rank #{roast.formatDiagnosis.rank} / 20</span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-300">{roast.formatDiagnosis.confidence} confidence</span>
                  </div>
                  <p className="text-sm text-zinc-200">{roast.formatDiagnosis.whyThisFormat}</p>
                  <p className="text-sm text-violet-100/90">{roast.formatDiagnosis.distributionFit}</p>
                  {roast.formatDiagnosis.runnerUpFormatName && (
                    <p className="text-xs text-zinc-400">runner-up fit: {roast.formatDiagnosis.runnerUpFormatName}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 min-w-[220px]">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">playbook baseline</p>
                  <p className="text-sm font-semibold text-white">{primaryFormat?.summary ?? 'format-aware guidance loaded'}</p>
                  {primaryFormat?.bestFor && <p className="text-xs text-zinc-400 mt-1">best for: {primaryFormat.bestFor}</p>}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">must-haves for this format</p>
                  <ul className="space-y-2">
                    {roast.formatDiagnosis.mustHaves.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm text-zinc-200">
                        <span className="text-violet-300">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">how to make this format hit harder</p>
                  <ul className="space-y-2">
                    {roast.formatDiagnosis.upgrades.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm text-zinc-200">
                        <span className="text-orange-300">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="max-w-2xl mx-auto bg-zinc-900/60 border border-zinc-800/50 rounded-2xl px-6 py-5 space-y-4"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">TL;DR</p>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{roast.verdict}</p>
            </div>

            {roast.biggestBlocker && (
              <div className="border-t border-zinc-800/50 pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">Biggest Blocker</p>
                <p className="text-sm text-zinc-300">{roast.biggestBlocker}</p>
              </div>
            )}

            {roast.actionPlan && roast.actionPlan.length > 0 ? (
              <div className="border-t border-zinc-800/50 pt-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Fix This Next</p>
                {roast.actionPlan.map((step) => {
                  const agent = AGENTS.find((item) => item.key === step.dimension);
                  const evidence = Array.isArray(step.evidence) ? step.evidence : [];
                  return (
                    <div key={`${step.priority}-${step.dimension}-${step.issue}`} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{step.priority} • {step.issue}</p>
                          <p className="text-xs text-zinc-500">{agent?.emoji} {agent?.name ?? step.dimension} • {step.whyItMatters}</p>
                        </div>
                      </div>
                      {evidence.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Evidence</p>
                          <ul className="space-y-1">
                            {evidence.map((item, index) => (
                              <li key={index} className="text-xs text-zinc-400 flex gap-2">
                                <span className="text-orange-400 shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="rounded-lg bg-blue-500/8 border border-blue-500/15 p-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-1">Do this</p>
                        <p className="text-sm text-zinc-200">{step.doThis}</p>
                        <p className="text-xs text-zinc-400 mt-1">example: {step.example}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : roast.nextSteps && roast.nextSteps.length > 0 ? (
              <div className="border-t border-zinc-800/50 pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Next Steps (by impact)</p>
                <ol className="space-y-1.5">
                  {roast.nextSteps.map((step, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2">
                      <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {roast.encouragement && (
              <div className="border-t border-zinc-800/50 pt-3">
                <p className="text-sm text-emerald-400 italic">{roast.encouragement}</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.45 }}
            className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="rounded-2xl border border-orange-500/20 bg-zinc-900/60 p-5 text-left">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Hook rewrite workshop</p>
                  <h3 className="text-lg font-bold text-white mt-1">what to reshoot in the first beat</h3>
                </div>
                <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-orange-300">
                  opener first
                </span>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">current opener</p>
                  <p className="text-sm text-zinc-200">{hookWorkshop.openerLine}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">why it is leaking</p>
                  <ul className="space-y-1.5">
                    {hookWorkshop.diagnosis.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm text-zinc-300">
                        <span className="text-red-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">stronger rewrites</p>
                  <div className="space-y-2">
                    {hookWorkshop.rewrites.map((rewrite) => (
                      <div key={rewrite.label} className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-1">{rewrite.label}</p>
                        <p className="text-sm text-white">{rewrite.line}</p>
                        <p className="text-xs text-zinc-400 mt-1">{rewrite.whyItWorks}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`rounded-2xl border p-5 text-left ${holdAssessment.riskBand === 'high' ? 'border-red-500/25 bg-red-500/8' : holdAssessment.riskBand === 'medium' ? 'border-yellow-500/25 bg-yellow-500/8' : 'border-emerald-500/25 bg-emerald-500/8'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Hold-strength read</p>
                    <h3 className="text-lg font-bold text-white mt-1">{holdAssessment.headline}</h3>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${holdAssessment.riskBand === 'high' ? 'border-red-500/30 text-red-300' : holdAssessment.riskBand === 'medium' ? 'border-yellow-500/30 text-yellow-300' : 'border-emerald-500/30 text-emerald-300'}`}>
                    {holdAssessment.holdBand} hold • {holdAssessment.riskBand} drop-off risk
                  </div>
                </div>
                <p className="text-sm text-zinc-300">{holdAssessment.summary}</p>
                <ul className="mt-3 space-y-1.5">
                  {holdAssessment.reasons.map((reason, index) => (
                    <li key={index} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-orange-400">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">First-glance diagnostic</p>
                <p className="text-sm text-zinc-500 mt-1">not eye-tracking theater. just an honest frame-one gut check for a cold viewer.</p>
                <div className="mt-3 space-y-2">
                  {firstGlanceChecks.map((item) => (
                    <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${item.status === 'working' ? 'text-emerald-300' : 'text-red-300'}`}>
                          {item.status === 'working' ? 'working' : 'needs work'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.12, duration: 0.45 }}
            className="mt-4 rounded-2xl border border-blue-500/20 bg-zinc-900/60 p-5 text-left"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Opening reshoot planner</p>
                <h3 className="text-lg font-bold text-white mt-1">film this version next</h3>
              </div>
              <span className="text-xs text-zinc-500">built for same-day reshoots</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {reshootPlanner.map((step) => (
                <div key={step.label} className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-1">{step.label}</p>
                  <p className="text-sm font-semibold text-zinc-100">{step.direction}</p>
                  <p className="text-xs text-zinc-400 mt-1">{step.detail}</p>
                </div>
              ))}
            </div>
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
              transition={{ delay: 1.2 }}
              className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-5 text-xs text-zinc-600"
            >
              <span>{roast.metadata.views.toLocaleString()} views</span>
              <span>&#183;</span>
              <span>{roast.metadata.likes} likes</span>
              <span>&#183;</span>
              <span>{roast.metadata.comments} comments</span>
              <span>&#183;</span>
              <span>{roast.metadata.duration}s</span>
              {roast.metadata.hashtags.length > 0 && (
                <>
                  <span>&#183;</span>
                  <span>{roast.metadata.hashtags.join(' ')}</span>
                </>
              )}
            </motion.div>
          )}
        </div>

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

        {/* Script Generator */}
        <ScriptGenerator roast={roast} />

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
