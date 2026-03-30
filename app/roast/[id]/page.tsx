'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useSearchParams } from 'next/navigation';
import { RoastResult, DimensionKey, AgentRoast } from '@/lib/types';
import { AgentCard } from '@/components/AgentCard';
import { ScoreRing } from '@/components/ScoreRing';
import { saveToHistory, getChronicIssues, getHistory, getFixedIssues, getEscalationLevel, getEscalatingRoast, ChronicIssue } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import Link from 'next/link';
import { ScriptGenerator } from '@/components/ScriptGenerator';

function getLetterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

const LATE_STAGE_DIMENSIONS: DimensionKey[] = ['conversion', 'caption', 'accessibility'];
const HOLD_DIMENSIONS: DimensionKey[] = ['visual', 'audio'];
const FIRST_GLANCE_DIMENSIONS: DimensionKey[] = ['visual', 'caption', 'algorithm'];
const DOWNSTREAM_DIMENSIONS: DimensionKey[] = ['visual', 'audio', 'caption', 'algorithm', 'authenticity', 'conversion', 'accessibility'];

function getAgentMeta(key: DimensionKey) {
  return AGENTS.find((agent) => agent.key === key);
}

function getDimensionLabel(key: DimensionKey) {
  return getAgentMeta(key)?.name.replace(' Agent', '') ?? key;
}

function averageScore(items: AgentRoast[]) {
  if (items.length === 0) return null;
  return Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
}

function SectionChip({ tone, children }: { tone: 'primary' | 'secondary' | 'neutral'; children: React.ReactNode }) {
  const styles = {
    primary: 'border-red-500/25 bg-red-500/10 text-red-200',
    secondary: 'border-orange-500/20 bg-orange-500/10 text-orange-200',
    neutral: 'border-white/10 bg-white/[0.03] text-zinc-300',
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles[tone]}`}>
      {children}
    </span>
  );
}

function AnalysisEntryCard({
  id,
  eyebrow,
  title,
  body,
  score,
  dims,
  cta,
  tone = 'secondary',
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  score: number | null;
  dims: DimensionKey[];
  cta: string;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <Link
      href={`#${id}`}
      className={[
        'group relative overflow-hidden rounded-[26px] border p-5 transition-all',
        tone === 'primary'
          ? 'border-red-500/25 bg-gradient-to-br from-red-500/[0.12] via-zinc-950 to-zinc-950 hover:border-red-400/40 hover:-translate-y-0.5'
          : 'border-zinc-800/80 bg-zinc-950/80 hover:border-zinc-700 hover:-translate-y-0.5',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_45%)] opacity-60" />
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tone === 'primary' ? 'text-red-300' : 'text-zinc-500'}`}>{eyebrow}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
          </div>
          {score != null && <ScoreRing score={score} size={58} />}
        </div>
        <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
        <div className="flex flex-wrap gap-2">
          {dims.map((dim) => (
            <SectionChip key={dim} tone={tone === 'primary' ? 'primary' : 'neutral'}>{getDimensionLabel(dim)}</SectionChip>
          ))}
        </div>
        <div className={`inline-flex items-center gap-2 text-sm font-medium ${tone === 'primary' ? 'text-red-200' : 'text-zinc-200'}`}>
          <span>{cta}</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
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
          <div className="text-4xl mb-4 animate-pulse">🔥</div>
          <p className="text-zinc-400">Loading your roast...</p>
        </div>
      </main>
    );
  }

  if (error || !roast) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😵</div>
          <p className="text-zinc-400 mb-4">{error || 'Roast not found.'}</p>
          <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">
            &larr; Try again
          </Link>
        </div>
      </main>
    );
  }

  const history = getHistory();
  const findings = Object.fromEntries(roast.agents.map((a) => [a.agent, a.findings.slice(0, 2)])) as Record<DimensionKey, string[]>;
  const chronicIssues = getChronicIssues(history);
  const fixedIssues = getFixedIssues(findings, history);

  const chronicByDimension: Record<string, ChronicIssue[]> = {};
  for (const issue of chronicIssues) {
    if (!chronicByDimension[issue.dimension]) chronicByDimension[issue.dimension] = [];
    chronicByDimension[issue.dimension].push(issue);
  }

  const fixedDimensions = new Set(fixedIssues.map((f) => f.dimension));

  const hasMetadata = roast.metadata.views > 0 || roast.metadata.likes > 0;
  const isHookFirst = roast.analysisMode === 'hook-first' || roast.hookSummary?.strength === 'weak';
  const hookAgent = roast.agents.find((agent) => agent.agent === 'hook') ?? roast.agents[0];
  const orderedAgents = [...roast.agents].sort((a, b) => {
    if (a.agent === 'hook') return -1;
    if (b.agent === 'hook') return 1;
    if (!isHookFirst) return 0;
    const aLate = LATE_STAGE_DIMENSIONS.includes(a.agent);
    const bLate = LATE_STAGE_DIMENSIONS.includes(b.agent);
    if (aLate !== bLate) return aLate ? 1 : -1;
    return 0;
  });

  const primaryAgent = orderedAgents[0];
  const downstreamAgents = orderedAgents.filter((agent) => agent.agent !== 'hook');
  const holdAgents = orderedAgents.filter((agent) => HOLD_DIMENSIONS.includes(agent.agent));
  const firstGlanceAgents = orderedAgents.filter((agent) => FIRST_GLANCE_DIMENSIONS.includes(agent.agent));
  const strategyAgents = orderedAgents.filter((agent) => ['algorithm', 'conversion', 'authenticity', 'accessibility'].includes(agent.agent));
  const downstreamScore = averageScore(downstreamAgents);
  const holdScore = averageScore(holdAgents);
  const firstGlanceScore = averageScore(firstGlanceAgents);
  const strategyScore = averageScore(strategyAgents);
  const priorityStep = roast.actionPlan?.[0];

  return (
    <main className="min-h-screen pb-20 relative bg-[#050506]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[980px] h-[620px] bg-gradient-to-b from-orange-500/8 via-red-500/5 to-transparent blur-3xl" />
        <div className="absolute top-[28%] right-0 w-[420px] h-[420px] bg-fuchsia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[460px] h-[460px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <Link href="/" className="text-sm text-zinc-500 hover:text-orange-400 transition-colors inline-block">
            &larr; Roast another
          </Link>
        </motion.div>

        <section className="mb-8 rounded-[32px] border border-white/10 bg-zinc-950/80 p-5 sm:p-7 shadow-[0_0_80px_rgba(0,0,0,0.35)]">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <SectionChip tone={isHookFirst ? 'primary' : 'secondary'}>
                  {isHookFirst ? 'hook emergency' : 'balanced review'}
                </SectionChip>
                <SectionChip tone="neutral">roast report</SectionChip>
                {priorityStep && <SectionChip tone="neutral">{priorityStep.priority} queued</SectionChip>}
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="shrink-0">
                  <ScoreRing score={roast.overallScore} size={190} showGrade={getLetterGrade(roast.overallScore)} />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">overall verdict</p>
                    <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
                      {isHookFirst ? 'your opening is dragging the whole video down' : 'the hook is doing enough to care about the rest'}
                    </h1>
                  </div>
                  <p className="max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">{roast.verdict}</p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex text-sm font-bold px-4 py-2 rounded-full border ${
                      roast.overallScore >= 80 ? 'bg-green-500/15 text-green-400 border-green-500/25' :
                      roast.overallScore >= 60 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' :
                      roast.overallScore >= 40 ? 'bg-orange-500/15 text-orange-400 border-orange-500/25' :
                      'bg-red-500/15 text-red-400 border-red-500/25'
                    }`}>
                      {roast.overallScore >= 80 ? 'Actually decent' :
                       roast.overallScore >= 60 ? 'Room for improvement' :
                       roast.overallScore >= 40 ? 'Needs serious work' :
                       'We need to talk'}
                    </span>
                    {roast.biggestBlocker && (
                      <span className="text-sm text-zinc-400">
                        biggest blocker: <span className="text-zinc-200">{roast.biggestBlocker}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/30 p-5 sm:p-6">
              <div className={`rounded-[24px] border p-5 ${isHookFirst ? 'border-red-500/25 bg-red-500/[0.08]' : 'border-emerald-500/25 bg-emerald-500/[0.08]'}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${isHookFirst ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                    <span className="text-2xl">{isHookFirst ? '🎣' : '✅'}</span>
                  </div>
                  <div className="space-y-2">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isHookFirst ? 'text-red-300' : 'text-emerald-300'}`}>
                      {isHookFirst ? 'primary leverage point' : 'opening cleared'}
                    </p>
                    <h2 className="text-xl font-semibold text-white">{roast.hookSummary?.headline ?? hookAgent.roastText}</h2>
                    <p className="text-sm leading-relaxed text-zinc-300">{roast.hookSummary?.distributionRisk ?? hookAgent.findings[0]}</p>
                    <p className={`text-sm font-medium ${isHookFirst ? 'text-red-200' : 'text-emerald-200'}`}>{roast.hookSummary?.focusNote ?? hookAgent.improvementTip}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">product logic</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {isHookFirst
                      ? 'if you cannot get the ball over the net, strategy and placement are secondary. fix the opening first, then worry about downstream polish.'
                      : 'the ball is getting over the net, so downstream improvements can now compound instead of trying to rescue a dead opening.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">what to ignore for now</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {isHookFirst
                      ? 'caption polish, CTA tweaks, and late-video fixes are available below, but they are support work until the first seconds stop bleeding attention.'
                      : 'nothing is hidden, but the deeper labs below are where the next wins live now that the opening is not the bottleneck.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-red-500/20 bg-gradient-to-br from-red-500/[0.11] via-zinc-950/95 to-zinc-950 p-5 sm:p-6" id="hook-breakdown">
            <div className="flex flex-wrap items-center gap-2">
              <SectionChip tone="primary">layer 1</SectionChip>
              <SectionChip tone="primary">hook breakdown</SectionChip>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">make the hook impossible to miss</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">{hookAgent.roastText}</p>
                <div className="mt-5 space-y-3">
                  {hookAgent.findings.slice(0, 3).map((finding, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-2xl border border-red-500/15 bg-black/20 px-4 py-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xs font-semibold text-red-200">{index + 1}</div>
                      <p className="text-sm leading-relaxed text-zinc-300">{finding}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-[24px] border border-red-500/20 bg-red-500/[0.08] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-300">first thing to fix</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-100">{hookAgent.improvementTip}</p>
                </div>
                {roast.actionPlan?.length ? (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">execution queue</p>
                    <div className="mt-3 space-y-2.5">
                      {roast.actionPlan.slice(0, 3).map((step) => (
                        <div key={`${step.priority}-${step.dimension}`} className="rounded-2xl border border-white/8 bg-black/20 p-3">
                          <p className="text-sm font-semibold text-white">{step.priority} · {step.issue}</p>
                          <p className="mt-1 text-xs text-zinc-400">{step.whyItMatters}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-zinc-950/85 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SectionChip tone="secondary">deeper analysis map</SectionChip>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">go deeper, in the right order</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">secondary lanes are still here. they just should not masquerade as equal urgency when the opening is weak.</p>
            <div className="mt-5 grid gap-3">
              <AnalysisEntryCard
                id="first-glance-attention"
                eyebrow="layer 2"
                title="first-glance attention"
                body="thumbnail energy, first frame readability, and early visual clarity. this is where you verify whether the opening even earns the chance to be watched."
                score={firstGlanceScore}
                dims={FIRST_GLANCE_DIMENSIONS}
                cta="inspect first-frame issues"
                tone={isHookFirst ? 'secondary' : 'primary'}
              />
              <AnalysisEntryCard
                id="hold-strength"
                eyebrow="layer 3"
                title="estimated hold strength"
                body="once the hook survives, this is the handoff into pacing, visual continuity, and sound support that determines whether viewers keep watching."
                score={holdScore}
                dims={HOLD_DIMENSIONS}
                cta="open retention drivers"
              />
              <AnalysisEntryCard
                id="deeper-strategy"
                eyebrow="layer 4"
                title="distribution and conversion"
                body="captions, CTA, accessibility, and algorithm packaging. useful, but clearly downstream from whether strangers stop scrolling in the first place."
                score={strategyScore}
                dims={['algorithm', 'conversion', 'accessibility']}
                cta="view downstream levers"
              />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2" id="first-glance-attention">
          <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">first-glance attention</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">can a stranger tell this is worth a second look?</h3>
              </div>
              {firstGlanceScore != null && <ScoreRing score={firstGlanceScore} size={62} />}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">this layer blends hook setup with first-frame packaging. if this reads muddy, static, or delayed, viewers bounce before the story starts.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {FIRST_GLANCE_DIMENSIONS.map((dim) => (
                <SectionChip key={dim} tone="neutral">{getDimensionLabel(dim)}</SectionChip>
              ))}
            </div>
          </div>
          <div className={`rounded-[28px] border p-5 sm:p-6 ${isHookFirst ? 'border-red-500/20 bg-red-500/[0.06]' : 'border-white/10 bg-zinc-950/80'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isHookFirst ? 'text-red-300' : 'text-zinc-500'}`}>read this with the hook in mind</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              {isHookFirst
                ? 'these notes matter because they shape the first impression, but they are still support beams for the opening. do not confuse better framing with a solved hook.'
                : 'with the hook no longer failing outright, these first-glance details become meaningful top-of-funnel multipliers.'}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {firstGlanceAgents.map((agentRoast, i) => {
            const dimChronic = chronicByDimension[agentRoast.agent];
            const isFixed = fixedDimensions.has(agentRoast.agent);
            const maxOccurrences = dimChronic ? Math.max(...dimChronic.map((c) => c.occurrences)) : 0;
            const escalatedRoast = maxOccurrences >= 2
              ? { ...agentRoast, roastText: getEscalatingRoast(agentRoast.roastText, agentRoast.agent, maxOccurrences) }
              : agentRoast;

            return (
              <div key={agentRoast.agent} className="relative">
                {isFixed && <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-500/30">FIXED</div>}
                {maxOccurrences >= 2 && !isFixed && <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30">{maxOccurrences}x REPEAT</div>}
                <AgentCard roast={escalatedRoast} index={i + 1} badge={isHookFirst ? 'supporting layer' : 'top leverage'} />
              </div>
            );
          })}
        </div>

        <section className="mb-6 grid gap-4 lg:grid-cols-2" id="hold-strength">
          <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">estimated hold strength</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">what keeps people watching after the opening lands?</h3>
              </div>
              {holdScore != null && <ScoreRing score={holdScore} size={62} />}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">this is the retention handoff. pacing, visual continuity, and sound design only compound if the first seconds earned the right to keep playing.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {HOLD_DIMENSIONS.map((dim) => (
                <SectionChip key={dim} tone="neutral">{getDimensionLabel(dim)}</SectionChip>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">how to use this section</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              diagnose these after you have internalized the hook problem. otherwise you end up polishing watch-time mechanics on a video that never earns enough early attention to benefit.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {holdAgents.map((agentRoast, i) => {
            const dimChronic = chronicByDimension[agentRoast.agent];
            const isFixed = fixedDimensions.has(agentRoast.agent);
            const maxOccurrences = dimChronic ? Math.max(...dimChronic.map((c) => c.occurrences)) : 0;
            const escalatedRoast = maxOccurrences >= 2
              ? { ...agentRoast, roastText: getEscalatingRoast(agentRoast.roastText, agentRoast.agent, maxOccurrences) }
              : agentRoast;

            return (
              <div key={agentRoast.agent} className="relative">
                {isFixed && <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-500/30">FIXED</div>}
                {maxOccurrences >= 2 && !isFixed && <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30">{maxOccurrences}x REPEAT</div>}
                <AgentCard roast={escalatedRoast} index={i + 3} badge="retention layer" />
              </div>
            );
          })}
        </div>

        <section className="mb-6 grid gap-4 lg:grid-cols-2" id="deeper-strategy">
          <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">deeper strategy</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">packaging, distribution, and conversion</h3>
              </div>
              {downstreamScore != null && <ScoreRing score={downstreamScore} size={62} />}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">these are real levers. they just should read like layer 4, not the headline, when the hook is the thing setting money on fire.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DOWNSTREAM_DIMENSIONS.filter((dim) => !HOLD_DIMENSIONS.includes(dim) && !FIRST_GLANCE_DIMENSIONS.includes(dim)).map((dim) => (
                <SectionChip key={dim} tone="neutral">{getDimensionLabel(dim)}</SectionChip>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">ship order</p>
            <ol className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>1. fix the opening and first-frame clarity.</li>
              <li>2. tighten hold strength and pacing.</li>
              <li>3. then spend time on caption, distribution, CTA, and accessibility optimization.</li>
            </ol>
          </div>
        </section>

        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <AgentCard roast={primaryAgent} index={0} variant="primary" badge={isHookFirst ? 'dominant issue' : 'lead analysis'} />
            </div>
            {downstreamAgents.filter((agent) => !firstGlanceAgents.some((item) => item.agent === agent.agent) && !holdAgents.some((item) => item.agent === agent.agent)).map((agentRoast, i) => {
              const dimChronic = chronicByDimension[agentRoast.agent];
              const isFixed = fixedDimensions.has(agentRoast.agent);
              const maxOccurrences = dimChronic ? Math.max(...dimChronic.map((c) => c.occurrences)) : 0;
              const escalatedRoast = maxOccurrences >= 2
                ? { ...agentRoast, roastText: getEscalatingRoast(agentRoast.roastText, agentRoast.agent, maxOccurrences) }
                : agentRoast;

              return (
                <div key={agentRoast.agent} className="relative">
                  {isFixed && <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-500/30">FIXED</div>}
                  {maxOccurrences >= 2 && !isFixed && <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30">{maxOccurrences}x REPEAT</div>}
                  <AgentCard roast={escalatedRoast} index={i + 5} badge="downstream layer" />
                </div>
              );
            })}
          </div>
        </div>

        {fixedIssues.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mb-6 bg-green-500/5 border border-green-500/20 rounded-2xl p-5">
            <p className="text-green-400 font-semibold mb-2">Progress Detected</p>
            {fixedIssues.map((f, i) => (
              <p key={i} className="text-sm text-zinc-400">
                You finally fixed <span className="text-green-400 font-medium">{f.dimension}</span>: {f.finding.slice(0, 60)}. We&apos;re proud. Genuinely.
              </p>
            ))}
          </motion.div>
        )}

        {chronicIssues.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mb-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
            <p className="text-red-400 font-bold text-lg mb-1">CHRONIC ISSUES</p>
            <p className="text-sm text-zinc-400 mb-3">These problems keep appearing across your roasts. We&apos;re keeping count.</p>
            <div className="space-y-3">
              {chronicIssues.slice(0, 5).map((c, i) => {
                const agent = AGENTS.find((a) => a.key === c.dimension);
                const { level, label } = getEscalationLevel(c.occurrences);
                const levelColors = ['', 'border-yellow-500/30 bg-yellow-500/5', 'border-orange-500/30 bg-orange-500/5', 'border-red-500/30 bg-red-500/10'];
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${levelColors[level] || levelColors[1]}`}>
                    <span className="text-xl shrink-0">{agent?.emoji ?? '⚠️'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-zinc-200">{agent?.name ?? c.dimension}</span>
                        <span className="text-xs font-bold text-red-400">{c.occurrences}x</span>
                        {level >= 2 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">LVL {level}</span>}
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

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm font-semibold hover:border-orange-500/50 hover:text-orange-400 transition-all">
            {copied ? <><span>✓</span><span>Copied!</span></> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg><span>Copy Link</span></>}
          </button>
          <button onClick={() => handleShareOnX(roast.overallScore)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black border border-zinc-700 text-white text-sm font-semibold hover:border-white/30 hover:bg-zinc-900 transition-all">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.733-8.835L1.254 2.25H8.08l4.258 5.63L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            <span>Share on X</span>
          </button>
          {history.length >= 2 && <Link href="/compare" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm font-semibold hover:border-orange-500/40 hover:bg-orange-500/15 transition-all"><span>⚔️</span><span>Compare videos</span></Link>}
        </motion.div>

        {hasMetadata && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-5 text-xs text-zinc-600">
            <span>{roast.metadata.views.toLocaleString()} views</span>
            <span>·</span>
            <span>{roast.metadata.likes} likes</span>
            <span>·</span>
            <span>{roast.metadata.comments} comments</span>
            <span>·</span>
            <span>{roast.metadata.duration}s</span>
            {roast.metadata.hashtags.length > 0 && <><span>·</span><span>{roast.metadata.hashtags.join(' ')}</span></>}
          </motion.div>
        )}

        <div className="mt-10 rounded-[30px] border border-white/10 bg-zinc-950/85 p-5 sm:p-6">
          {roast.actionPlan && roast.actionPlan.length > 0 ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-300">fix this next</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">execution plan</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {roast.actionPlan.map((step) => {
                  const agent = AGENTS.find((item) => item.key === step.dimension);
                  const evidence = Array.isArray(step.evidence) ? step.evidence : [];
                  return (
                    <div key={`${step.priority}-${step.dimension}-${step.issue}`} className="rounded-[24px] border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{step.priority} · {step.issue}</p>
                        <p className="text-xs text-zinc-500 mt-1">{agent?.emoji} {agent?.name ?? step.dimension} · {step.whyItMatters}</p>
                      </div>
                      {evidence.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Evidence</p>
                          <ul className="space-y-1">
                            {evidence.map((item, index) => (
                              <li key={index} className="text-xs text-zinc-400 flex gap-2"><span className="text-orange-400 shrink-0">•</span><span>{item}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="rounded-2xl bg-blue-500/8 border border-blue-500/15 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-1">Do this</p>
                        <p className="text-sm text-zinc-200">{step.doThis}</p>
                        <p className="text-xs text-zinc-400 mt-1">example: {step.example}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : roast.nextSteps && roast.nextSteps.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">Next Steps (by impact)</p>
              <ol className="space-y-1.5">
                {roast.nextSteps.map((step, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-blue-400 font-bold shrink-0">{i + 1}.</span><span>{step}</span></li>
                ))}
              </ol>
            </div>
          ) : null}

          {roast.encouragement && (
            <div className="border-t border-zinc-800/50 pt-4 mt-4">
              <p className="text-sm text-emerald-400 italic">{roast.encouragement}</p>
            </div>
          )}
        </div>

        <ScriptGenerator roast={roast} />

        {roast.viralPotential != null && roast.viralPotential > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: orderedAgents.length * 0.12 }} className="mt-4 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                <div>
                  <h3 className="font-bold text-white">Viral Potential</h3>
                  <p className="text-xs text-zinc-500">Predicted viral probability based on hook patterns, engagement signals, and niche fit</p>
                </div>
              </div>
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${
                roast.viralPotential >= 60 ? 'border-emerald-500 text-emerald-400' :
                roast.viralPotential >= 40 ? 'border-yellow-500 text-yellow-400' :
                roast.viralPotential >= 20 ? 'border-orange-500 text-orange-400' :
                'border-red-500 text-red-400'
              }`}>
                <span className="text-sm font-bold">{roast.viralPotential}</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              {roast.viralPotential >= 80 ? 'This video is engineered to go viral. Ship it.' :
               roast.viralPotential >= 60 ? 'Real breakout potential here. Fix the blockers and this could pop off.' :
               roast.viralPotential >= 40 ? 'Could hit a few thousand views but needs work to break through.' :
               roast.viralPotential >= 20 ? 'Likely to stall at a few hundred views. Check the next steps above.' :
               'Dead on arrival in its current form. But the fixes above can change that.'}
            </p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-10 rounded-2xl bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent border border-orange-500/20 p-8 text-center space-y-4">
          <p className="text-zinc-400 text-sm">Think you can do better?</p>
          <Link href="/" className="inline-flex items-center gap-2 fire-gradient text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-lg">
            <span>🔥</span>
            Roast YOUR TikTok →
          </Link>
          <p className="text-zinc-600 text-xs">6 AI agents. Brutally honest. Free.</p>
          {history.length > 0 && (
            <div className="pt-1">
              <Link href="/history" className="text-xs text-zinc-600 hover:text-orange-400 transition-colors">
                View your roast history ({history.length})
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
