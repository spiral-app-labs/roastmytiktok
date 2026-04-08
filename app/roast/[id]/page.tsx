'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RoastResult, ActionPlanStep, AgentRoast, DimensionKey } from '@/lib/types';
import { ScoreCard } from '@/components/ScoreCard';
import { useScoreCardDownload } from '@/hooks/useScoreCardDownload';
import { ViewProjection } from '@/components/ViewProjection';
import { saveToHistory, getHistory } from '@/lib/history';
import { buildViewProjection } from '@/lib/view-projection';
import { getViewImpact } from '@/lib/view-count-tiers';
import { sanitizeUserFacingText } from '@/lib/analysis-safety';
import { useToast } from '@/components/ui';
import { RetentionCurve } from '@/components/RetentionCurve';
import { AGENTS } from '@/lib/agents';

type EvidenceTone = 'observed' | 'inferred' | 'speculative';

type EvidenceItem = {
  text: string;
  tone: EvidenceTone;
};

type DiagnosisSummary = {
  failureMode: string;
  overallLabel: string;
  calibration: string;
  biggestBlocker: string;
  bestNextAction: string;
  supportingWhy: string;
};

type DimensionCard = {
  key: 'hook' | 'pacing' | 'audio' | 'captions' | 'cta';
  title: string;
  dimension: DimensionKey;
  score?: number;
  diagnosis: string;
  recommendation: string;
  evidence: EvidenceItem[];
};

function isAgentFailed(a: { failed?: boolean; findings?: string[] }): boolean {
  if (a.failed) return true;
  if (a.findings?.[0]?.startsWith('Analysis error')) return true;
  return false;
}

function formatTimestamp(step: ActionPlanStep): string {
  if (step.timestampLabel) return step.timestampLabel;
  if (typeof step.timestampSeconds !== 'number') return '';
  const rounded = Math.max(0, Math.round(step.timestampSeconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function cleanText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.toLowerCase();
    if (!item.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classifyEvidence(text: string): EvidenceTone {
  const normalized = text.toLowerCase();
  if (
    normalized.includes('"') ||
    normalized.includes('“') ||
    normalized.includes('caption') ||
    normalized.includes('spoken') ||
    normalized.includes('first words') ||
    normalized.includes('frame') ||
    normalized.includes('onscreen') ||
    normalized.includes('on-screen') ||
    /\b\d{1,2}:\d{2}\b/.test(normalized) ||
    /\b\d+(?:\.\d+)?s\b/.test(normalized)
  ) {
    return 'observed';
  }
  if (
    normalized.includes('likely') ||
    normalized.includes('risk') ||
    normalized.includes('estimated') ||
    normalized.includes('predicted') ||
    normalized.includes('could') ||
    normalized.includes('may')
  ) {
    return 'speculative';
  }
  return 'inferred';
}

function evidenceFromText(text: string | null | undefined, tone?: EvidenceTone): EvidenceItem | null {
  const cleaned = cleanText(text);
  if (!cleaned) return null;
  return { text: cleaned, tone: tone ?? classifyEvidence(cleaned) };
}

function getScoreCalibration(score: number): string {
  if (score >= 80) return 'Calibrated as strong packaging. This should earn stops if the niche fit is right.';
  if (score >= 65) return 'Calibrated as salvageable. The idea can work, but execution is suppressing reach.';
  if (score >= 50) return 'Calibrated as fragile. One or two failures are likely killing distribution early.';
  return 'Calibrated as high risk. Viewers are probably exiting before the value lands.';
}

function inferFailureMode(roast: RoastResult, topStep?: ActionPlanStep): string {
  const issue = `${topStep?.issue ?? ''} ${roast.biggestBlocker ?? ''} ${roast.verdict}`.toLowerCase();
  const dimension = topStep?.dimension;

  if (dimension === 'hook') {
    if (issue.includes('promise')) return 'Confused Promise';
    if (issue.includes('pace') || issue.includes('drag')) return 'Pacing Decay After Hook';
    return 'Weak Hook Stop Power';
  }
  if (dimension === 'audio') {
    if (issue.includes('music') || issue.includes('sound')) return 'Audio Signal Is Fighting The Message';
    return 'Muddy Audio Delivery';
  }
  if (dimension === 'conversion') {
    return 'Weak CTA Conversion';
  }
  if (dimension === 'accessibility') {
    return 'Caption Clarity Breakdown';
  }
  if (dimension === 'visual' || dimension === 'authenticity') {
    if (issue.includes('pace') || issue.includes('drag')) return 'Pacing Decay After Hook';
    if (issue.includes('trust') || issue.includes('believ')) return 'Low Trust Delivery';
    return 'Mid-Video Attention Loss';
  }
  return 'Execution Gap Is Blocking Reach';
}

function buildDiagnosisSummary(roast: RoastResult, actionPlan: ActionPlanStep[]): DiagnosisSummary {
  const topStep = actionPlan[0];
  const failureMode = inferFailureMode(roast, topStep);
  const overallLabel = roast.overallScore >= 70 ? 'Promising, but still leaking attention' : 'Needs a clearer first fix before reposting';

  return {
    failureMode,
    overallLabel,
    calibration: getScoreCalibration(roast.overallScore),
    biggestBlocker: cleanText(roast.biggestBlocker) || cleanText(topStep?.issue) || cleanText(roast.verdict),
    bestNextAction: cleanText(topStep?.doThis) || cleanText(roast.nextSteps?.[0]) || 'Tighten the opening before you publish again.',
    supportingWhy: cleanText(topStep?.whyItMatters) || cleanText(roast.verdict),
  };
}

function getAgent(roast: RoastResult, dimension: DimensionKey): AgentRoast | undefined {
  return roast.agents.find((agent) => agent.agent === dimension && !isAgentFailed(agent));
}

function getStep(actionPlan: ActionPlanStep[], dimension: DimensionKey): ActionPlanStep | undefined {
  return actionPlan.find((step) => step.dimension === dimension);
}

function buildDimensionCards(roast: RoastResult, actionPlan: ActionPlanStep[]): DimensionCard[] {
  const pacingSource =
    getStep(actionPlan, 'visual') ||
    getStep(actionPlan, 'authenticity') ||
    actionPlan.find((step) => step.dimension !== 'hook');
  const pacingDimension = pacingSource?.dimension ?? 'visual';

  const cards: Array<Omit<DimensionCard, 'evidence'> & { evidenceSources: Array<EvidenceItem | null | undefined> }> = [
    {
      key: 'hook',
      title: 'Hook',
      dimension: 'hook',
      score: getAgent(roast, 'hook')?.score,
      diagnosis: cleanText(getAgent(roast, 'hook')?.roastText) || cleanText(getStep(actionPlan, 'hook')?.issue) || 'The opener is not creating enough stop power.',
      recommendation: cleanText(getStep(actionPlan, 'hook')?.doThis) || cleanText(getAgent(roast, 'hook')?.improvementTip) || 'Rewrite the first line so the payoff is obvious immediately.',
      evidenceSources: [
        evidenceFromText(roast.hookIdentification?.spokenWords ? `First spoken words: "${roast.hookIdentification.spokenWords}"` : null, 'observed'),
        evidenceFromText(roast.hookIdentification?.textOnScreen ? `Opening on-screen line: "${roast.hookIdentification.textOnScreen}"` : null, 'observed'),
        evidenceFromText(roast.hookIdentification?.visualDescription ? `Opening frame: ${roast.hookIdentification.visualDescription}` : null, 'observed'),
        ...(roast.firstFiveSecondsDiagnosis?.evidence ?? []).map((item) => evidenceFromText(item)),
        ...(getStep(actionPlan, 'hook')?.evidence ?? []).map((item) => evidenceFromText(item)),
      ],
    },
    {
      key: 'pacing',
      title: 'Pacing',
      dimension: pacingDimension,
      score: getAgent(roast, pacingDimension)?.score,
      diagnosis: cleanText(getAgent(roast, pacingDimension)?.roastText) || cleanText(pacingSource?.issue) || 'Momentum drops after the opener.',
      recommendation: cleanText(pacingSource?.doThis) || cleanText(getAgent(roast, pacingDimension)?.improvementTip) || 'Cut faster and front-load the payoff before the middle starts to sag.',
      evidenceSources: [
        evidenceFromText(roast.firstFiveSecondsDiagnosis?.likelyDropWindow ? `Likely drop window: ${roast.firstFiveSecondsDiagnosis.likelyDropWindow}` : null, 'speculative'),
        ...(roast.holdAssessment?.reasons ?? []).map((item) => evidenceFromText(item)),
        ...(pacingSource?.evidence ?? []).map((item) => evidenceFromText(item)),
      ],
    },
    {
      key: 'audio',
      title: 'Audio',
      dimension: 'audio',
      score: getAgent(roast, 'audio')?.score,
      diagnosis: cleanText(getAgent(roast, 'audio')?.roastText) || cleanText(getStep(actionPlan, 'audio')?.issue) || 'The audio track is not helping the story land cleanly.',
      recommendation: cleanText(getStep(actionPlan, 'audio')?.doThis) || cleanText(getAgent(roast, 'audio')?.improvementTip) || 'Rebalance voice, music, and clarity so the message is easy to process.',
      evidenceSources: [
        evidenceFromText(roast.audioSegments?.[0] ? `First transcript segment ${roast.audioSegments[0].start.toFixed(1)}s-${roast.audioSegments[0].end.toFixed(1)}s: "${roast.audioSegments[0].text}"` : null, 'observed'),
        evidenceFromText(roast.detectedSound?.name ? `Detected sound: ${roast.detectedSound.name} by ${roast.detectedSound.author}` : null, 'observed'),
        ...(getStep(actionPlan, 'audio')?.evidence ?? []).map((item) => evidenceFromText(item)),
      ],
    },
    {
      key: 'captions',
      title: 'Captions',
      dimension: 'accessibility',
      score: getAgent(roast, 'accessibility')?.score,
      diagnosis: cleanText(getAgent(roast, 'accessibility')?.roastText) || cleanText(getStep(actionPlan, 'accessibility')?.issue) || 'Caption clarity is reducing comprehension.',
      recommendation: cleanText(getStep(actionPlan, 'accessibility')?.doThis) || cleanText(getAgent(roast, 'accessibility')?.improvementTip) || 'Make captions faster to parse and easier to read on a phone.',
      evidenceSources: [
        evidenceFromText(roast.transcriptQualityNote, roast.transcriptQuality === 'usable' ? 'observed' : 'speculative'),
        ...(getStep(actionPlan, 'accessibility')?.evidence ?? []).map((item) => evidenceFromText(item)),
      ],
    },
    {
      key: 'cta',
      title: 'CTA',
      dimension: 'conversion',
      score: getAgent(roast, 'conversion')?.score,
      diagnosis: cleanText(getAgent(roast, 'conversion')?.roastText) || cleanText(getStep(actionPlan, 'conversion')?.issue) || 'The payoff or ask is not converting intent cleanly.',
      recommendation: cleanText(getStep(actionPlan, 'conversion')?.doThis) || cleanText(getAgent(roast, 'conversion')?.improvementTip) || 'State the ask and reward more explicitly before the video ends.',
      evidenceSources: [
        evidenceFromText(roast.metadata.description ? `Caption/description: "${roast.metadata.description}"` : null, 'observed'),
        ...(getStep(actionPlan, 'conversion')?.evidence ?? []).map((item) => evidenceFromText(item)),
      ],
    },
  ];

  return cards.map((card) => ({
    ...card,
    evidence: dedupeEvidence(card.evidenceSources.filter(Boolean) as EvidenceItem[]).slice(0, 4),
  }));
}

function getPriorityStyles(index: number) {
  if (index === 0) {
    return {
      shell: 'border-red-500/35 bg-red-500/[0.08] shadow-[0_0_0_1px_rgba(239,68,68,0.08)]',
      badge: 'bg-red-500 text-white border-red-400/70',
      title: 'text-white text-lg sm:text-xl',
      accent: 'text-red-300',
    };
  }
  if (index === 1) {
    return {
      shell: 'border-amber-500/25 bg-zinc-950/90',
      badge: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      title: 'text-zinc-100 text-base',
      accent: 'text-amber-300',
    };
  }
  return {
    shell: 'border-zinc-800/80 bg-zinc-950/90',
    badge: 'bg-zinc-900 text-zinc-300 border-zinc-700',
    title: 'text-zinc-100 text-base',
    accent: 'text-zinc-300',
  };
}

function EvidenceBadge({ tone }: { tone: EvidenceTone }) {
  const styles = {
    observed: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200',
    inferred: 'border-amber-500/30 bg-amber-500/12 text-amber-200',
    speculative: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  } satisfies Record<EvidenceTone, string>;

  const labels = {
    observed: 'Observed',
    inferred: 'Inferred',
    speculative: 'Speculative',
  } satisfies Record<EvidenceTone, string>;

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles[tone]}`}>
      {labels[tone]}
    </span>
  );
}

function DiagnosisPanel({ roast, summary, viewProjection }: { roast: RoastResult; summary: DiagnosisSummary; viewProjection: ReturnType<typeof buildViewProjection> }) {
  return (
    <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-200">
            Dominant Failure Mode
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{summary.failureMode}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">{summary.overallLabel}</p>
          </div>
        </div>
        <div className="min-w-[140px] rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-left sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Overall Score</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-white">{roast.overallScore}</p>
          <p className="mt-1 text-xs text-zinc-500">out of 100</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200">Best Next Action</p>
          <p className="mt-3 text-lg font-semibold leading-7 text-white">{summary.bestNextAction}</p>
          <p className="mt-3 text-sm leading-6 text-red-100/75">{summary.supportingWhy}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-800/80 bg-black/25 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Why This Failed</p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">{summary.biggestBlocker}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Score Context</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{summary.calibration}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            <ViewProjection projection={viewProjection} />
          </div>
        </div>
      </div>
    </section>
  );
}

function RankedActionPlan({
  roast,
  actionPlan,
  viewProjection,
}: {
  roast: RoastResult;
  actionPlan: ActionPlanStep[];
  viewProjection: ReturnType<typeof buildViewProjection>;
}) {
  const [showAll, setShowAll] = useState(false);
  const primary = actionPlan.slice(0, 3);
  const secondary = actionPlan.slice(3);

  return (
    <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-5 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Ranked Action Plan</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Do these in order</h2>
        </div>
        <p className="max-w-xs text-right text-xs leading-5 text-zinc-500">Action #1 is intentionally dominant because it should get fixed before anything else.</p>
      </div>

      <div className="mt-5 space-y-4">
        {primary.length === 0 && (
          <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
            <p className="text-sm leading-6 text-zinc-300">
              The analysis did not return a ranked action list for this video. Re-run the roast to generate evidence-backed priorities.
            </p>
          </div>
        )}

        {primary.map((step, index) => {
          const styles = getPriorityStyles(index);
          const timestamp = formatTimestamp(step);
          const agent = AGENTS.find((candidate) => candidate.key === step.dimension);
          const improvedScore = getViewImpact(
            roast.overallScore,
            Math.min(100, roast.overallScore + (index === 0 ? 14 : index === 1 ? 9 : 6)),
          );

          return (
            <article key={`${step.priority}-${step.dimension}-${index}`} className={`rounded-3xl border p-4 sm:p-5 ${styles.shell}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${styles.badge}`}>
                    #{index + 1} {step.priority}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{agent?.displayName ?? step.dimension}</p>
                    <h3 className={`mt-1 font-semibold leading-7 ${styles.title}`}>{step.doThis}</h3>
                  </div>
                </div>
                {timestamp && (
                  <div className="rounded-full border border-zinc-800 bg-black/25 px-3 py-1 text-xs font-medium tabular-nums text-zinc-300">
                    {timestamp}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Evidence First</p>
                    <div className="mt-3 space-y-2">
                      {step.evidence.length > 0 ? step.evidence.slice(0, 3).map((item, itemIndex) => (
                        <div key={itemIndex} className="rounded-2xl border border-zinc-800/80 bg-black/25 p-3">
                          <div className="mb-2">
                            <EvidenceBadge tone={classifyEvidence(item)} />
                          </div>
                          <p className="text-sm leading-6 text-zinc-200">{item}</p>
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-zinc-800/80 bg-black/25 p-3">
                          <div className="mb-2">
                            <EvidenceBadge tone="inferred" />
                          </div>
                          <p className="text-sm leading-6 text-zinc-200">{step.issue}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-800/80 bg-black/25 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Diagnosis</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-200">{step.issue}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800/80 bg-black/25 p-4">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${styles.accent}`}>Why This Matters</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-200">{step.whyItMatters}</p>
                    <p className="mt-3 text-xs font-medium text-zinc-500">{improvedScore.delta}</p>
                  </div>
                  {index === 0 && (
                    <div className="rounded-2xl border border-zinc-800/80 bg-black/25 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Expected Reach Change</p>
                      <div className="mt-3">
                        <ViewProjection projection={viewProjection} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {secondary.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
          >
            {showAll ? 'Hide additional actions' : `Show ${secondary.length} additional action${secondary.length > 1 ? 's' : ''}`}
          </button>

          {showAll && (
            <div className="mt-4 space-y-3">
              {secondary.map((step, index) => {
                const agent = AGENTS.find((candidate) => candidate.key === step.dimension);
                return (
                  <article key={`${step.priority}-${step.dimension}-extra-${index}`} className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{agent?.displayName ?? step.dimension}</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-100">{step.doThis}</p>
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        {step.priority}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DimensionCardSection({ cards }: { cards: DimensionCard[] }) {
  return (
    <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-5 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Dimension Evidence</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Evidence first, diagnosis second</h2>
        </div>
        <p className="max-w-xs text-right text-xs leading-5 text-zinc-500">Each card leads with what the analysis actually saw before it tells the user what to do.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.key} className="rounded-3xl border border-zinc-800/80 bg-black/20 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{card.title}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{card.diagnosis}</h3>
              </div>
              {typeof card.score === 'number' && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Score</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{card.score}</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Evidence</p>
              <div className="mt-3 space-y-2">
                {card.evidence.length > 0 ? card.evidence.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-3">
                    <div className="mb-2">
                      <EvidenceBadge tone={item.tone} />
                    </div>
                    <p className="text-sm leading-6 text-zinc-200">{item.text}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-3">
                    <div className="mb-2">
                      <EvidenceBadge tone="speculative" />
                    </div>
                    <p className="text-sm leading-6 text-zinc-200">No direct evidence snippet was returned for this dimension, so treat the diagnosis below as lower confidence.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Recommended Fix</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{card.recommendation}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function UtilityActions({
  roast,
  copied,
  handleCopyLink,
  handleShareOnX,
  download,
  downloading,
  historyCount,
}: {
  roast: RoastResult;
  copied: boolean;
  handleCopyLink: () => void;
  handleShareOnX: (score: number) => void;
  download: (variant: 'square' | 'story') => Promise<void>;
  downloading: 'square' | 'story' | null;
  historyCount: number;
}) {
  return (
    <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Next Step</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Ship the fix, then compare the revision</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
            The useful loop here is diagnose, rewrite, refilm, then analyze the new take. Sharing utilities are intentionally lower priority than acting on the diagnosis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Analyze another video
          </Link>
          {historyCount > 0 && (
            <Link href="/history" className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white">
              View history ({historyCount})
            </Link>
          )}
          <Link href="/learn" className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white">
            Learn about hooks
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={handleCopyLink}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
        >
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        <button
          onClick={() => handleShareOnX(roast.overallScore)}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
        >
          Share on X
        </button>
        <button
          onClick={() => download('square')}
          disabled={downloading !== null}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
        >
          {downloading === 'square' ? 'Generating…' : 'Download scorecard'}
        </button>
      </div>
    </section>
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
    const text = `My TikTok just got a Viral Score of ${score}/100`;
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
      } catch {
        // ignore
      }

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
      <main className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Preparing report</p>
          <p className="mt-3 text-lg font-semibold text-white">Building your evidence-led diagnosis…</p>
        </div>
      </main>
    );
  }

  if (error || !roast) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{error || 'Roast not found.'}</p>
          <Link href="/" className="mt-4 inline-flex text-sm text-zinc-400 transition hover:text-white">
            ← Try again
          </Link>
        </div>
      </main>
    );
  }

  return <RoastContent roast={roast} copied={copied} handleCopyLink={handleCopyLink} handleShareOnX={handleShareOnX} />;
}

function RoastContent({
  roast,
  copied,
  handleCopyLink,
  handleShareOnX,
}: {
  roast: RoastResult;
  copied: boolean;
  handleCopyLink: () => void;
  handleShareOnX: (score: number) => void;
}) {
  const history = getHistory();
  const viewProjection = useMemo(() => buildViewProjection(roast), [roast]);
  const [isPaid] = useState(() => {
    if (typeof document === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    const hasPaidCookie = document.cookie.split(';').some((cookie) => cookie.trim().startsWith('rmt_paid_bypass=1'));
    const hasPlan = !!localStorage.getItem('plan');
    return hasPaidCookie || hasPlan;
  });

  const { squareRef, storyRef, download, downloading } = useScoreCardDownload(roast);

  const failedDimensions = new Set(
    roast.agents.filter((agent) => isAgentFailed(agent)).map((agent) => agent.agent)
  );
  const filteredActionPlan = (roast.actionPlan ?? []).filter(
    (step) => !failedDimensions.has(step.dimension)
  );
  const hasPartialResults = failedDimensions.size > 0;

  const dimensionOrder: Partial<Record<string, number>> = {
    hook: 0,
    visual: 1,
    audio: 2,
    conversion: 3,
    authenticity: 4,
    accessibility: 5,
  };

  const actionPlan = [...filteredActionPlan].sort((a, b) => {
    const dimensionA = dimensionOrder[a.dimension] ?? 6;
    const dimensionB = dimensionOrder[b.dimension] ?? 6;
    if (dimensionA !== dimensionB) return dimensionA - dimensionB;
    const priorityA = parseInt(a.priority?.replace(/\D/g, '') || '3', 10);
    const priorityB = parseInt(b.priority?.replace(/\D/g, '') || '3', 10);
    return priorityA - priorityB;
  });

  const summary = useMemo(() => buildDiagnosisSummary(roast, actionPlan), [roast, actionPlan]);
  const dimensionCards = useMemo(() => buildDimensionCards(roast, actionPlan), [roast, actionPlan]);

  return (
    <main className="min-h-screen bg-black pb-16">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white">
            <span>←</span>
            <span>Analyze another video</span>
          </Link>
        </motion.div>

        {hasPartialResults && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/[0.06] px-4 py-3"
          >
            <p className="text-sm leading-6 text-yellow-100/85">
              <span className="font-semibold text-yellow-200">Partial results.</span> {failedDimensions.size} dimension{failedDimensions.size > 1 ? 's were' : ' was'} unavailable, so recommendations reflect only the completed analysis.
            </p>
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-6">
            <div className="space-y-6">
              <DiagnosisPanel roast={roast} summary={summary} viewProjection={viewProjection} />

              <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Summary</p>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {sanitizeUserFacingText(roast.verdict, 'Analysis complete. See the ranked action plan for the first fix.')}
                </p>
                {roast.metadata.views > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl border border-zinc-800 bg-black/25 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Views</p>
                      <p className="mt-1 text-sm font-semibold text-white">{roast.metadata.views.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-black/25 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Likes</p>
                      <p className="mt-1 text-sm font-semibold text-white">{roast.metadata.likes}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-black/25 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Length</p>
                      <p className="mt-1 text-sm font-semibold text-white">{roast.metadata.duration}s</p>
                    </div>
                  </div>
                )}
                {!isPaid && (
                  <p className="mt-4 text-xs leading-5 text-zinc-500">
                    Compare this diagnosis against a revised version after you refilm. That loop is where the product becomes useful.
                  </p>
                )}
              </section>
            </div>
          </aside>

          <section className="space-y-6">
            <RankedActionPlan roast={roast} actionPlan={actionPlan} viewProjection={viewProjection} />

            <DimensionCardSection cards={dimensionCards} />

            <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Retention Context</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Modeled risk, not ground truth</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
                This curve is an estimate based on the hook score and the ranked failure points above. Use it to locate likely drop zones, not as an exact replay of audience retention.
              </p>
              <div className="mt-5">
                <RetentionCurve
                  hookScore={roast.agents.find((agent) => agent.agent === 'hook')?.score ?? roast.hookSummary?.score ?? 50}
                  overallScore={roast.overallScore}
                  videoDurationSeconds={roast.metadata.duration > 0 ? roast.metadata.duration : 30}
                  timestamps={actionPlan
                    .filter((step) => typeof step.timestampSeconds === 'number')
                    .slice(0, 5)
                    .map((step) => ({
                      seconds: step.timestampSeconds as number,
                      label: formatTimestamp(step),
                    }))}
                />
              </div>
            </section>

            <UtilityActions
              roast={roast}
              copied={copied}
              handleCopyLink={handleCopyLink}
              handleShareOnX={handleShareOnX}
              download={download}
              downloading={downloading}
              historyCount={history.length}
            />
          </section>
        </div>

        <div aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <ScoreCard ref={squareRef} roast={roast} variant="square" />
          <ScoreCard ref={storyRef} roast={roast} variant="story" />
        </div>
      </div>
    </main>
  );
}
