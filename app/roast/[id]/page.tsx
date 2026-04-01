'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useSearchParams } from 'next/navigation';
import { RoastResult, DimensionKey } from '@/lib/types';
import { getDetectedHookType, getFirstGlanceChecks, getHoldAssessment, getHookRewriteWorkflow, getHookTypeLenses, getHookWorkshop, getReshootPlanner, getReshootTakes } from '@/lib/hook-help';
import { getPersonalizedHookPatterns } from '@/lib/viral-hooks';
import { AgentCard } from '@/components/AgentCard';
import { ScoreRing } from '@/components/ScoreRing';
import { DeepDiveNav } from '@/components/DeepDiveNav';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { saveToHistory, getChronicIssues, getHistory, getFixedIssues, getEscalationLevel, getEscalatingRoast, ChronicIssue } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ScriptGenerator = dynamic(() => import('@/components/ScriptGenerator').then(m => m.ScriptGenerator), { ssr: false });
import { HookHierarchyDiagram, HookExamplesBank, HookExplainerBanner, EducationalTooltip } from '@/components/HookEducation';
import { EmailCapture } from '@/components/EmailCapture';
import { useToast } from '@/components/ui';

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
  const { toast } = useToast();

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/roast/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      toast('Link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [id, toast]);

  const handleShareOnX = useCallback((score: number) => {
    const url = `${window.location.origin}/roast/${id}`;
    const text = `My TikTok just got roasted by 6 AI agents and scored ${score}/100 🔥`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  }, [id]);

  useEffect(() => {
    async function loadRoast() {
      try {
        const cached = sessionStorage.getItem(`roast_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as RoastResult;
          setRoast(parsed);
          setLoading(false);
          const source = searchParams.get('source') === 'upload' ? 'upload' : 'url';
          const filename = searchParams.get('filename') ?? undefined;
          saveToHistory(parsed, source, filename);
          return;
        }
      } catch { /* ignore */ }

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

  return <RoastContent roast={roast} copied={copied} handleCopyLink={handleCopyLink} handleShareOnX={handleShareOnX} />;
}

/* ---- Extracted so hooks are unconditional in the outer component ---- */

function RoastContent({
  roast, copied, handleCopyLink, handleShareOnX,
}: {
  roast: RoastResult;
  copied: boolean;
  handleCopyLink: () => void;
  handleShareOnX: (score: number) => void;
}) {
  const history = getHistory();
  const findings = Object.fromEntries(
    roast.agents.map(a => [a.agent, a.findings.slice(0, 2)])
  ) as Record<DimensionKey, string[]>;
  const chronicIssues = getChronicIssues(history);
  const fixedIssues = getFixedIssues(findings, history);

  const chronicByDimension: Record<string, ChronicIssue[]> = {};
  for (const issue of chronicIssues) {
    if (!chronicByDimension[issue.dimension]) chronicByDimension[issue.dimension] = [];
    chronicByDimension[issue.dimension].push(issue);
  }
  const fixedDimensions = new Set(fixedIssues.map(f => f.dimension));

  const hasMetadata = roast.metadata.views > 0 || roast.metadata.likes > 0;
  const isHookWeak = roast.analysisMode === 'hook-first' || roast.hookSummary?.strength === 'weak';
  const hookWorkshop = getHookWorkshop(roast);
  const detectedHookType = getDetectedHookType(roast);
  const hookTypeLenses = getHookTypeLenses(roast);
  const hookRewriteWorkflow = getHookRewriteWorkflow(roast);
  const reshootPlanner = getReshootPlanner(roast);
  const reshootTakes = getReshootTakes(roast);
  const hookPatterns = getPersonalizedHookPatterns(roast, 6);
  const holdAssessment = roast.holdAssessment ?? getHoldAssessment(roast);
  const firstGlanceChecks = getFirstGlanceChecks(roast);

  const hookAgent = roast.agents.find(a => a.agent === 'hook');
  const hookScore = hookAgent?.score ?? roast.hookSummary?.score ?? 50;
  const weakHookPenalty = Math.max(0, 70 - hookScore);
  const downstreamImpactSummary = isHookWeak
    ? `until the opener improves, the rest of this feedback is support work, not the main event.`
    : `the hook is good enough that the supporting levers below can actually move performance.`;

  // Deep-dive navigation items
  const navItems = useMemo(() => {
    const items = [
      { id: 'score-hero', label: 'Score', emoji: '🎯' },
    ];
    if (isHookWeak) {
      items.push({ id: 'hook-gate', label: 'Hook Alert', emoji: '🚨' });
    }
    items.push(
      { id: 'hook-workshop', label: 'Hook Breakdown', emoji: '🎣' },
      { id: 'hook-education', label: 'Hook School', emoji: '🎓' },
      { id: 'hook-examples', label: 'Hook Examples', emoji: '📚' },
      { id: 'hold-strength', label: 'Watch Strength', emoji: '⏱️' },
      { id: 'first-glance', label: 'First Glance', emoji: '👁️' },
      { id: 'reshoot-planner', label: 'Reshoot Plan', emoji: '🎬' },
      { id: 'agent-cards', label: isHookWeak ? 'Secondary Feedback' : 'Full Analysis', emoji: '🔬' },
    );
    return items;
  }, [isHookWeak]);

  const deepDiveCards = [
    {
      id: 'hook-workshop',
      eyebrow: isHookWeak ? 'start here' : 'best next move',
      title: 'hook breakdown',
      summary: isHookWeak
        ? 'see exactly why the opener misses and steal stronger rewrites.'
        : 'tighten the opener without rewriting the whole video.',
      emoji: '🎣',
      accent: isHookWeak ? 'border-red-500/30 bg-red-500/[0.08] text-red-100' : 'border-orange-500/20 bg-orange-500/[0.05] text-orange-100',
    },
    {
      id: 'hold-strength',
      eyebrow: 'estimated watch time',
      title: 'watch strength read',
      summary: 'understand how likely the opening beats are to hold attention.',
      emoji: '⏱️',
      accent: 'border-yellow-500/20 bg-yellow-500/[0.05] text-yellow-100',
    },
    {
      id: 'first-glance',
      eyebrow: 'eyeball test',
      title: 'first-glance attention',
      summary: 'gut-check frame one clarity, mute-mode readability, and scroll-stop signal.',
      emoji: '👁️',
      accent: 'border-cyan-500/20 bg-cyan-500/[0.05] text-cyan-100',
    },
    {
      id: 'reshoot-planner',
      eyebrow: 'make it teachable',
      title: 'reshoot planner',
      summary: 'turn the diagnosis into a cleaner next take you can film today.',
      emoji: '🎬',
      accent: 'border-blue-500/20 bg-blue-500/[0.05] text-blue-100',
    },
  ];

  // Split agents: hook card is shown separately when hook is weak
  const hookAgentRoast = roast.agents.find(a => a.agent === 'hook');
  const otherAgents = roast.agents.filter(a => a.agent !== 'hook');

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
          <Link href="/" className="text-sm text-zinc-500 hover:text-orange-400 transition-colors inline-block">
            &larr; Roast another
          </Link>
        </motion.div>

        {/* Deep-dive navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <DeepDiveNav items={navItems} hookGate={isHookWeak} />
        </motion.div>

        {/* ========== SCORE HERO ========== */}
        <div id="score-hero" className="text-center mb-10 scroll-mt-20">
          {/* Premium score card with gradient border */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="relative max-w-2xl mx-auto rounded-[28px] p-px bg-gradient-to-br from-orange-500/30 via-zinc-800/50 to-pink-500/30 mb-8"
          >
            <div className="rounded-[27px] bg-zinc-950/90 backdrop-blur-xl px-6 py-8 sm:px-10 sm:py-10">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.25 }}
                className="relative inline-block mb-4"
              >
                <ScoreRing score={roast.overallScore} size={180} showGrade={getLetterGrade(roast.overallScore)} />
              </motion.div>

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

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="mb-4"
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

              {/* Agent score strip — scannable at-a-glance */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-zinc-800/60"
              >
                {roast.agents.map((a) => {
                  const agent = AGENTS.find(ag => ag.key === a.agent);
                  return (
                    <div key={a.agent} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60 text-xs">
                      <span>{agent?.emoji}</span>
                      <span className={`font-bold ${a.score >= 70 ? 'text-green-400' : a.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {a.score}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>

          {/* Verdict card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="max-w-2xl mx-auto bg-zinc-900/60 border border-zinc-800/50 rounded-2xl px-6 py-5 space-y-4"
          >
            {/* Niche benchmark context — competitive positioning */}
            {roast.nichePercentile && (
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/8 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-1">vs. your niche</p>
                <p className="text-sm text-zinc-200">{roast.nichePercentile}</p>
              </div>
            )}

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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.02, duration: 0.45 }}
            className="mx-auto mt-6 max-w-4xl text-left"
          >
            <div className={`rounded-3xl border p-5 sm:p-6 ${isHookWeak ? 'border-red-500/30 bg-gradient-to-br from-red-500/[0.11] via-zinc-950/80 to-zinc-950' : 'border-zinc-800/80 bg-zinc-900/70'}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${isHookWeak ? 'text-red-300' : 'text-zinc-400'}`}>
                    {isHookWeak ? 'ball over the net' : 'where to go deeper'}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                    {isHookWeak ? 'the hook is the assignment. everything else is supporting analysis.' : 'your next layer of feedback is organized by what actually changes performance.'}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {isHookWeak
                      ? `your hook score is ${hookScore}/100, which puts you ${weakHookPenalty} points below the bar where the rest of the video starts to matter. ${downstreamImpactSummary}`
                      : downstreamImpactSummary}
                  </p>
                </div>
                {isHookWeak && (
                  <div className="rounded-2xl border border-red-500/25 bg-black/20 px-4 py-3 lg:max-w-xs">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">why later notes are demoted</p>
                    <p className="mt-1 text-sm text-zinc-300">if people bounce in the first second, better captions and stronger strategy still lose because nobody sticks around long enough to see them.</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {deepDiveCards.map((card) => (
                  <a
                    key={card.id}
                    href={`#${card.id}`}
                    className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-white/20 ${card.accent}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">{card.eyebrow}</p>
                        <h3 className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-white">{card.title}</h3>
                      </div>
                      <span className="text-xl">{card.emoji}</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{card.summary}</p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400 group-hover:text-white">
                      <span>open</span>
                      <span aria-hidden="true">→</span>
                    </div>
                  </a>
                ))}
              </div>
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
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
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
              <svg aria-hidden="true" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.733-8.835L1.254 2.25H8.08l4.258 5.63L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Share on X</span>
            </button>
          </motion.div>

          {/* Metadata */}
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

        {/* ========== HOOK GATE — only when hook is weak ========== */}
        {isHookWeak && (
          <motion.div
            id="hook-gate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5 }}
            className="scroll-mt-20 mb-10"
          >
            {/* Dominant hook-gate banner — can't-miss alert framing */}
            <div className="relative overflow-hidden rounded-[32px] border-2 border-red-500/50 bg-gradient-to-br from-red-500/20 via-red-900/12 to-zinc-950 p-8 sm:p-10 shadow-2xl shadow-red-500/10">
              {/* Pulsing background glow — larger for dominance */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-red-500/12 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-red-500/8 rounded-full blur-[80px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-[120px]" />
              </div>

              <div className="relative z-10">
                {/* Alert banner strip */}
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/15 px-5 py-3">
                  <span className="text-red-400 text-xl animate-pulse">🚨</span>
                  <p className="text-sm sm:text-base font-bold text-red-200 uppercase tracking-wide">
                    Hook failure detected — everything below depends on fixing this first
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8 mb-8">
                  <div className="shrink-0">
                    <ScoreRing score={hookScore} size={120} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">Your <EducationalTooltip tooltipKey="hook">hook</EducationalTooltip> isn&apos;t getting the ball over the net</h2>
                    <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
                      Nothing else matters until this is fixed. Strategy, visuals, captions, audio — they&apos;re all <EducationalTooltip tooltipKey="downstream-advice">downstream</EducationalTooltip> of getting someone to <EducationalTooltip tooltipKey="scroll-stop">stop scrolling</EducationalTooltip>. Right now, that&apos;s not happening.
                    </p>
                    <p className="mt-2 text-xs text-red-300/80">
                      Hook score {hookScore}/100 — {weakHookPenalty} points below the bar where other feedback starts to matter.
                    </p>
                  </div>
                </div>

                {roast.hookSummary && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3 mb-5">
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-red-400 mb-1.5">The problem</p>
                        <p className="text-sm text-zinc-200">{roast.hookSummary.headline}</p>
                      </div>
                      <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-red-400/80 mb-1.5">Distribution risk</p>
                        <p className="text-sm text-zinc-300">{roast.hookSummary.distributionRisk}</p>
                      </div>
                      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400 mb-1.5">Focus here</p>
                        <p className="text-sm text-zinc-200 font-medium">{roast.hookSummary.focusNote}</p>
                      </div>
                    </div>
                    {roast.hookSummary.earlyDropNote && (
                      <div className="mb-5 rounded-xl border border-zinc-700/50 bg-zinc-950/60 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">why distribution dies early</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{roast.hookSummary.earlyDropNote}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Inline hook agent card when hook is weak */}
                {hookAgentRoast && (
                  <div className="mt-5">
                    <AgentCard roast={hookAgentRoast} index={0} variant="primary" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Hook summary for non-weak hooks */}
        {!isHookWeak && roast.hookSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.92, duration: 0.4 }}
            className="max-w-3xl mx-auto mb-8 rounded-2xl px-5 py-4 border bg-emerald-500/10 border-emerald-500/30"
          >
            <div className="flex items-start gap-3 text-left">
              <div className="text-2xl text-emerald-400">✅</div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">hook cleared</p>
                <p className="text-sm sm:text-base text-zinc-200">{roast.hookSummary.headline}</p>
                <p className="text-xs sm:text-sm text-zinc-400">{roast.hookSummary.distributionRisk}</p>
                <p className="text-xs sm:text-sm font-medium text-emerald-300">{roast.hookSummary.focusNote}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========== DEEP-DIVE SECTIONS ========== */}

        {/* Hook workshop */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.45 }}
          className="mb-6"
        >
          <CollapsibleSection
            id="hook-workshop"
            eyebrow="Hook rewrite workshop"
            title="what to reshoot in the first beat"
            emoji="🎣"
            tier={isHookWeak ? 1 : 2}
            accent={isHookWeak ? 'border-orange-500/30 bg-orange-500/[0.06]' : 'border-orange-500/20 bg-zinc-900/60'}
            defaultOpen
          >
            <div className="space-y-3 text-left">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">current opener</p>
                <p className="text-sm text-zinc-200">{hookWorkshop.openerLine}</p>
              </div>
              <div className={`rounded-xl border p-3 ${detectedHookType.type !== 'none' ? 'border-indigo-500/20 bg-indigo-500/[0.06]' : 'border-zinc-700/40 bg-zinc-950/40'}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">detected hook type</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${detectedHookType.confidence === 'likely' ? 'text-emerald-300' : detectedHookType.confidence === 'possible' ? 'text-yellow-300' : 'text-zinc-500'}`}>
                    {detectedHookType.confidence}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-100">{detectedHookType.label}</p>
                <p className="text-xs text-zinc-400 mt-1">{detectedHookType.explanation}</p>
                <p className="text-xs text-orange-200 mt-2"><span className="text-orange-400">upgrade:</span> {detectedHookType.upgrade}</p>
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
              {/* Hook anatomy — educational layer distinguishing all 6 hook types */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">hook anatomy</p>
                    <p className="text-xs text-zinc-400 mt-1">great hooks stack multiple levers: visual, spoken, text, motion, <EducationalTooltip tooltipKey="open-loop">curiosity</EducationalTooltip>, and attractiveness. here&apos;s how yours scores on each.</p>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 shrink-0">
                    teachable layer
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {hookTypeLenses.map((lens) => (
                    <div key={lens.key} className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-zinc-100">{lens.label}</p>
                        <span className={`text-[11px] font-bold uppercase tracking-widest shrink-0 ${lens.status === 'working' ? 'text-emerald-300' : 'text-red-300'}`}>
                          {lens.score}/100 · {lens.status === 'working' ? 'working' : 'needs work'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{lens.whatItMeans}</p>
                      <p className="mt-2 text-xs text-zinc-300">{lens.note}</p>
                      <p className="mt-2 text-xs text-orange-200"><span className="text-orange-400">upgrade:</span> {lens.fix}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-zinc-500 italic">if these opening levers are weak, CTA, caption, and distribution advice become secondary — viewers never stay long enough to feel the payoff.</p>
              </div>

              <div className="rounded-2xl border border-orange-500/15 bg-zinc-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-orange-300">rewrite workflow</p>
                    <h4 className="mt-1 text-sm font-semibold text-white">{hookRewriteWorkflow.headline}</h4>
                  </div>
                  <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-200">
                    usable, not magic
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">{hookRewriteWorkflow.summary}</p>
                <div className="mt-4 space-y-2.5">
                  {hookRewriteWorkflow.steps.map((step) => (
                    <div key={step.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-orange-300">{step.label}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-100">{step.instruction}</p>
                      <p className="mt-1 text-xs text-zinc-400">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Hook education layer — beginner explainer + hierarchy + examples bank */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.115, duration: 0.45 }}
          className="mb-6"
        >
          <CollapsibleSection
            id="hook-education"
            eyebrow="Hook school"
            title="understand why hooks gate everything"
            emoji="🎓"
            tier={isHookWeak ? 1 : 2}
            accent={isHookWeak ? 'border-red-500/20 bg-red-500/[0.04]' : 'border-zinc-800/70 bg-zinc-900/60'}
            defaultOpen={isHookWeak}
          >
            <div className="space-y-4">
              <HookExplainerBanner />
              <HookHierarchyDiagram isHookWeak={isHookWeak} />
              <HookExamplesBank detectedType={detectedHookType} />
            </div>
          </CollapsibleSection>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.13, duration: 0.45 }}
          className="mb-6"
        >
          <CollapsibleSection
            id="hook-examples"
            eyebrow="Top hook examples"
            title="steal a proven pattern, not just a note"
            emoji="📚"
            tier={isHookWeak ? 1 : 2}
            accent="border-emerald-500/20 bg-zinc-900/60"
          >
            <div className="text-left">
              <p className="text-sm text-zinc-400 mb-4">
                these are matched from our viral hook bank based on your topic and the kind of opener weakness this video has. use one as-is or remix the structure.
              </p>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {hookPatterns.map((pattern) => (
                  <div key={pattern.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">{pattern.pattern}</p>
                        <p className="mt-1 text-xs text-zinc-500">{pattern.angle}</p>
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        top fit
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">&ldquo;{pattern.line}&rdquo;</p>
                    <p className="mt-2 text-xs text-zinc-400">{pattern.whyItWorks}</p>
                    <p className="mt-3 text-xs text-emerald-200/90">{pattern.personalizationNote}</p>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Hold-strength + First-glance — downstream when hook is weak */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.45 }}
          className="grid gap-4 lg:grid-cols-2 mb-6"
        >
          <CollapsibleSection
            id="hold-strength"
            eyebrow="Hold-strength read"
            title={holdAssessment.headline}
            emoji="⏱️"
            tier={isHookWeak ? 3 : 2}
            gated={isHookWeak}
            accent={holdAssessment.riskBand === 'high' ? 'border-red-500/25 bg-red-500/8' : holdAssessment.riskBand === 'medium' ? 'border-yellow-500/25 bg-yellow-500/8' : 'border-emerald-500/25 bg-emerald-500/8'}
          >
            <div className="text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className={`rounded-full border px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest shrink-0 ${holdAssessment.riskBand === 'high' ? 'border-red-500/30 text-red-300' : holdAssessment.riskBand === 'medium' ? 'border-yellow-500/30 text-yellow-300' : 'border-emerald-500/30 text-emerald-300'}`}>
                  {holdAssessment.holdBand} hold
                </div>
              </div>
              <p className="text-sm text-zinc-300">{holdAssessment.summary}</p>
              <p className="mt-2 text-[11px] text-zinc-500 italic">this is a qualitative read based on what we can see in the opening beats, not a watch-time prediction. no tool can tell you your exact retention curve from a video file.</p>
              <ul className="mt-3 space-y-1.5">
                {holdAssessment.reasons.map((reason, index) => (
                  <li key={index} className="flex gap-2 text-sm text-zinc-300">
                    <span className="text-orange-400">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="first-glance"
            eyebrow="First-glance diagnostic"
            title="frame-one gut check"
            emoji="👁️"
            tier={isHookWeak ? 3 : 2}
            gated={isHookWeak}
            accent="border-zinc-800 bg-zinc-900/60"
          >
            <div className="text-left">
              <p className="text-sm text-zinc-500 mb-3">an honest <EducationalTooltip tooltipKey="frame-one">frame-one</EducationalTooltip> gut check for a cold viewer.</p>
              <div className="space-y-2">
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
          </CollapsibleSection>
        </motion.div>

        {/* Reshoot planner */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.45 }}
          className="mb-8"
        >
          <CollapsibleSection
            id="reshoot-planner"
            eyebrow="Opening reshoot planner"
            title="film this version next"
            emoji="🎬"
            tier={isHookWeak ? 2 : 3}
            accent="border-blue-500/20 bg-zinc-900/60"
          >
            <div className="text-left">
              <div className="grid gap-3 md:grid-cols-2">
                {reshootPlanner.map((step) => (
                  <div key={step.label} className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-1">{step.label}</p>
                    <p className="text-sm font-semibold text-zinc-100">{step.direction}</p>
                    <p className="text-xs text-zinc-400 mt-1">{step.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-blue-500/15 bg-zinc-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">filmable take options</p>
                    <h4 className="mt-1 text-sm font-semibold text-white">pick one and refilm it clean</h4>
                  </div>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-200">
                    a/b/c test
                  </span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {reshootTakes.map((take) => (
                    <div key={take.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">{take.label}</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">spoken line</p>
                          <p className="mt-1 text-sm text-white">{take.spokenLine}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">visual</p>
                          <p className="mt-1 text-xs text-zinc-300">{take.visual}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">camera / framing</p>
                          <p className="mt-1 text-xs text-zinc-300">{take.cameraNote}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">timing</p>
                          <p className="mt-1 text-xs text-blue-200/80">{take.timing}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">text overlay</p>
                          <p className="mt-1 text-xs text-zinc-200">{take.textOverlay}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">why this take works</p>
                          <p className="mt-1 text-xs text-zinc-400">{take.whyItWorks}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* ========== AGENT CARDS + DOWNSTREAM CONTENT ========== */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.45 }}
          className="mb-8"
        >
          <CollapsibleSection
            id="agent-cards"
            eyebrow={isHookWeak ? 'Secondary feedback' : 'Full analysis'}
            title={isHookWeak ? 'fix hook first — these stay benched until it lands' : 'detailed breakdown by dimension'}
            emoji="🔬"
            tier={isHookWeak ? 3 : 1}
            gated={isHookWeak}
            accent={isHookWeak ? 'border-zinc-800/50 bg-zinc-950/40' : 'border-zinc-800/70 bg-zinc-900/60'}
          >
            <div>
              {/* Dimmed overlay hint when hook is weak */}
              {isHookWeak && (
                <div className="mb-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 flex items-center gap-3">
                  <span className="text-zinc-600 text-lg">🔇</span>
                  <p className="text-sm text-zinc-500">
                    These scores matter less until the hook is fixed. Improving these won&apos;t help if viewers never make it past the first second.
                  </p>
                </div>
              )}

              {/* Fixed issues celebration */}
              {fixedIssues.length > 0 && (
                <div className="mb-6 bg-green-500/5 border border-green-500/20 rounded-2xl p-5">
                  <p className="text-green-400 font-semibold mb-2">Progress Detected</p>
                  {fixedIssues.map((f, i) => (
                    <p key={i} className="text-sm text-zinc-400">
                      You finally fixed <span className="text-green-400 font-medium">{f.dimension}</span>: {f.finding.slice(0, 60)}. We&apos;re proud. Genuinely.
                    </p>
                  ))}
                </div>
              )}

              {/* Chronic issues */}
              {chronicIssues.length > 0 && (
                <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
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
                </div>
              )}

              {/* Detected Sound chip — shown when we extracted real sound data from the TikTok URL */}
              {roast.detectedSound && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-4 flex items-start gap-3">
                  <span className="text-lg mt-0.5">🎵</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">sound used in this video</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{roast.detectedSound.name}</p>
                      {roast.detectedSound.isOriginal ? (
                        <span className="rounded-full border border-sky-500/30 text-sky-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">original audio</span>
                      ) : (
                        <span className="rounded-full border border-violet-500/30 text-violet-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">licensed sound</span>
                      )}
                    </div>
                    {roast.detectedSound.author && !roast.detectedSound.isOriginal && (
                      <p className="text-xs text-zinc-500 mt-0.5">by {roast.detectedSound.author}</p>
                    )}
                    {roast.detectedSound.soundUrl && (
                      <a
                        href={roast.detectedSound.soundUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1 inline-block"
                      >
                        view on TikTok →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Agent cards grid */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isHookWeak ? '[&>*]:opacity-80 [&>*]:saturate-[0.7]' : ''}`}>
                {/* When hook is weak, hook card was shown above in the gate — show others here */}
                {(isHookWeak ? otherAgents : roast.agents).map((agentRoast, i) => {
                  const dimChronic = chronicByDimension[agentRoast.agent];
                  const isFixed = fixedDimensions.has(agentRoast.agent);
                  const maxOccurrences = dimChronic ? Math.max(...dimChronic.map(c => c.occurrences)) : 0;
                  const escalatedRoast = maxOccurrences >= 2
                    ? { ...agentRoast, roastText: getEscalatingRoast(agentRoast.roastText, agentRoast.agent, maxOccurrences) }
                    : agentRoast;

                  return (
                    <div key={agentRoast.agent} className="relative">
                      {isFixed && (
                        <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-500/30">
                          FIXED
                        </div>
                      )}
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
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Generate Reshoot Script CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-10"
        >
          <Link
            href={`/scripts/create?mode=reshoot&roastId=${roast.id}&score=${roast.overallScore}&feedback=${encodeURIComponent(JSON.stringify(roast.agents.map(a => ({ agent: a.agent, findings: a.findings.slice(0, 2), tip: a.improvementTip }))))}`}
            className="block w-full rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-pink-500/10 p-6 hover:border-orange-500/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-2xl shrink-0">
                ✍️
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-white group-hover:text-orange-200 transition-colors">Generate Reshoot Script</p>
                <p className="text-sm text-zinc-400 mt-0.5">Auto-feeds all agent feedback into Script Studio to create a complete fix-it script</p>
              </div>
              <span className="text-zinc-500 group-hover:text-orange-400 transition-colors text-lg">→</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {roast.agents.filter(a => a.score < 70).map(a => (
                <span key={a.agent} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {a.agent}: {a.improvementTip?.slice(0, 50)}...
                </span>
              ))}
            </div>
          </Link>
        </motion.div>

        {/* Bottom CTA — next steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-10 space-y-4"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">what to do next</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href="#hook-workshop"
              className="group rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] p-4 hover:border-orange-500/40 transition-all"
            >
              <span className="text-xl">🎣</span>
              <p className="text-sm font-semibold text-white mt-2">Hook rewrite workshop</p>
              <p className="text-xs text-zinc-400 mt-1">Steal a stronger opener you can film today.</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400 mt-3 group-hover:text-orange-300">jump to section →</p>
            </a>
            <Link
              href={`/scripts/create?mode=reshoot&roastId=${roast.id}&score=${roast.overallScore}`}
              className="group rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-4 hover:border-green-500/40 transition-all"
            >
              <span className="text-xl">✍️</span>
              <p className="text-sm font-semibold text-white mt-2">Script Studio</p>
              <p className="text-xs text-zinc-400 mt-1">Generate a complete reshoot script from your roast.</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-green-400 mt-3 group-hover:text-green-300">create script →</p>
            </Link>
            <div
              className="group rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4 cursor-pointer hover:border-zinc-500 transition-all"
              onClick={() => handleShareOnX(roast.overallScore)}
            >
              <span className="text-xl">📣</span>
              <p className="text-sm font-semibold text-white mt-2">Share your results</p>
              <p className="text-xs text-zinc-400 mt-1">Post your score to X and tag your creator friends.</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mt-3 group-hover:text-white">share on X →</p>
            </div>
            <Link
              href="/"
              className="group rounded-2xl border border-pink-500/20 bg-pink-500/[0.06] p-4 hover:border-pink-500/40 transition-all"
            >
              <span className="text-xl">🔥</span>
              <p className="text-sm font-semibold text-white mt-2">Roast another TikTok</p>
              <p className="text-xs text-zinc-400 mt-1">Upload a new video and compare your scores.</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-pink-400 mt-3 group-hover:text-pink-300">analyze again →</p>
            </Link>
          </div>
          {/* Email capture CTA */}
          <EmailCapture />

          {history.length > 0 && (
            <div className="text-center pt-1">
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
