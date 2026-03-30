import type { CaptionQualityReport } from '@/lib/caption-quality';
import type { ActionPlanStep, DimensionKey } from '@/lib/types';

type AgentResult = {
  score: number;
  roastText: string;
  findings: string[];
  improvementTip: string;
};

export interface StrategicSummary {
  verdict: string;
  viralPotential: number;
  biggestBlocker: string;
  actionPlan: ActionPlanStep[];
  encouragement: string;
}

export function buildEvidenceLedger(params: {
  agentResults: Record<string, AgentResult>;
  transcriptText?: string;
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
  captionQuality?: CaptionQualityReport | null;
  durationSec?: number;
  nicheLabel: string;
}) {
  const { agentResults, transcriptText, transcriptSegments, captionQuality, durationSec, nicheLabel } = params;
  const dims = Object.entries(agentResults)
    .sort(([, a], [, b]) => a.score - b.score)
    .map(([dimension, result]) => {
      const findings = result.findings.slice(0, 2).map((finding) => `- finding: ${finding}`);
      const roastSentence = firstSentence(result.roastText);
      const tip = cleanLine(result.improvementTip);
      return [
        `${dimension} (${result.score}/100)`,
        roastSentence ? `- summary: ${roastSentence}` : '',
        ...findings,
        tip ? `- prescribed fix: ${tip}` : '',
      ].filter(Boolean).join('\n');
    });

  const transcriptEvidence = transcriptSegments?.length
    ? transcriptSegments.slice(0, 4).map((segment) => `${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s: "${cleanLine(segment.text)}"`).join('\n')
    : transcriptText
      ? cleanLine(transcriptText).slice(0, 240)
      : 'No transcript evidence available.';

  const captionEvidence = captionQuality
    ? [
        `Captions detected: ${captionQuality.hasCaptions ? 'yes' : 'no'}`,
        `Timing: first caption ${captionQuality.firstCaptionTimeSec ?? 'unknown'}s, speech ${captionQuality.speechStartTimeSec ?? 'unknown'}s, gap ${captionQuality.captionSpeechGapSec ?? 'unknown'}s, grade ${captionQuality.timingGrade}`,
        `Readability: ${captionQuality.readabilityScore}/100 (${captionQuality.overallReadability})`,
        `Issues: ${captionQuality.notableIssues.slice(0, 3).join(' | ') || 'none logged'}`,
        `Recommended fixes: ${captionQuality.actionableRecommendations.slice(0, 2).join(' | ') || 'none logged'}`,
      ].join('\n')
    : 'No caption audit available.';

  return `Evidence ledger for this ${nicheLabel} TikTok${durationSec ? ` (${durationSec.toFixed(0)}s)` : ''}:

Weakest-to-strongest dimensions:
${dims.join('\n\n')}

Transcript evidence:
${transcriptEvidence}

Caption audit:
${captionEvidence}`;
}

export function parseStrategicSummary(
  text: string,
  fallbackDimension: DimensionKey,
  fallbackPlan: ActionPlanStep[] = []
): StrategicSummary | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<StrategicSummary> & { actionPlan?: Array<Partial<ActionPlanStep>> };
    const fallbackSeed = fallbackPlan.length > 0
      ? fallbackPlan
      : [{
          priority: 'P1' as const,
          dimension: fallbackDimension,
          issue: 'The current video still has a major execution gap.',
          evidence: [],
          doThis: 'Rebuild this section before posting again.',
          example: 'Ship a tighter, more specific version.',
          whyItMatters: WHY_IT_MATTERS_BY_DIMENSION[fallbackDimension],
        }];
    const normalizedPlan = fallbackSeed.map((seedStep, index) => {
      const parsedStep = Array.isArray(parsed.actionPlan) ? parsed.actionPlan[index] : undefined;
      const evidence = Array.isArray(parsedStep?.evidence)
        ? parsedStep.evidence.map((item) => cleanLine(item)).filter(isEvidenceBacked).slice(0, 3)
        : [];

      return {
        priority: normalizePriority(parsedStep?.priority, index),
        dimension: normalizeDimension(parsedStep?.dimension, seedStep.dimension),
        issue: cleanLine(parsedStep?.issue) || seedStep.issue,
        evidence: evidence.length > 0 ? evidence : seedStep.evidence,
        doThis: cleanLine(parsedStep?.doThis) || seedStep.doThis,
        example: cleanLine(parsedStep?.example) || seedStep.example,
        whyItMatters: cleanLine(parsedStep?.whyItMatters) || seedStep.whyItMatters,
      };
    });

    return {
      verdict: cleanLine(parsed.verdict) || 'The analysis finished, but the verdict came back thin.',
      viralPotential: clampScore(parsed.viralPotential),
      biggestBlocker: cleanLine(parsed.biggestBlocker) || normalizedPlan[0]?.issue || 'The video still has one obvious bottleneck holding it back.',
      actionPlan: normalizedPlan.filter((step) => step.evidence.length > 0),
      encouragement: cleanLine(parsed.encouragement) || '',
    };
  } catch {
    return null;
  }
}

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizePriority(value: unknown, index: number): 'P1' | 'P2' | 'P3' {
  if (value === 'P1' || value === 'P2' || value === 'P3') return value;
  return (['P1', 'P2', 'P3'][index] ?? 'P3') as 'P1' | 'P2' | 'P3';
}

function normalizeDimension(value: unknown, fallback: DimensionKey): DimensionKey {
  const valid = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity', 'conversion', 'accessibility'];
  return typeof value === 'string' && valid.includes(value) ? (value as DimensionKey) : fallback;
}

function firstSentence(text: string): string {
  const cleaned = cleanLine(text);
  if (!cleaned) return '';
  const match = cleaned.match(/.*?[.!?](?:\s|$)/);
  return (match ? match[0] : cleaned).trim();
}

function cleanLine(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function isEvidenceBacked(value: string): boolean {
  return /["'\d]|caption|transcript|frame|score|readability|timing|gap|hook|spoken|said|s\b/i.test(value);
}

const WHY_IT_MATTERS_BY_DIMENSION: Record<DimensionKey, string> = {
  hook: 'A stronger opening buys the retention curve enough time to earn a second watch.',
  visual: 'Cleaner visuals reduce swipe risk before the story has a chance to land.',
  caption: 'Readable on-screen text keeps viewers oriented instead of forcing them to decode the message.',
  audio: 'Clearer audio makes the value easier to process and keeps people from bailing early.',
  algorithm: 'Tighter topic packaging helps TikTok classify and distribute the video faster.',
  authenticity: 'A more believable delivery increases trust, comments, and rewatches.',
  conversion: 'A sharper CTA turns passive views into follows, clicks, and saves.',
  accessibility: 'Accessible delivery expands retention beyond viewers who can hear everything perfectly.',
};

export function buildFallbackActionPlan(params: {
  agentResults: Record<string, AgentResult>;
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
  captionQuality?: CaptionQualityReport | null;
  priorityDimensions?: DimensionKey[];
}): ActionPlanStep[] {
  const { agentResults, transcriptSegments, captionQuality, priorityDimensions = [] } = params;
  const priorityMap = new Map(priorityDimensions.map((dimension, index) => [dimension, index]));
  const ranked = Object.entries(agentResults)
    .sort(([dimA, a], [dimB, b]) => {
      const priorityA = priorityMap.has(dimA as DimensionKey) ? priorityMap.get(dimA as DimensionKey)! : Number.POSITIVE_INFINITY;
      const priorityB = priorityMap.has(dimB as DimensionKey) ? priorityMap.get(dimB as DimensionKey)! : Number.POSITIVE_INFINITY;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.score - b.score;
    })
    .slice(0, 3);

  return ranked.map(([rawDimension, result], index) => {
    const dimension = normalizeDimension(rawDimension, 'hook');
    const transcriptEvidence = buildTranscriptEvidence(dimension, transcriptSegments);
    const captionEvidence = buildCaptionEvidence(dimension, captionQuality);
    const evidence = [
      ...transcriptEvidence,
      ...captionEvidence,
      ...result.findings.map((finding) => `Agent finding: ${cleanLine(finding)}`),
    ].map(cleanLine).filter(Boolean).slice(0, 3);

    return {
      priority: normalizePriority(undefined, index),
      dimension,
      issue: cleanLine(result.findings[0]) || firstSentence(result.roastText) || 'The current edit still has a clear execution gap.',
      evidence,
      doThis: cleanLine(result.improvementTip) || 'Rebuild this section before posting again.',
      example: buildFallbackExample(dimension, transcriptSegments),
      whyItMatters: WHY_IT_MATTERS_BY_DIMENSION[dimension],
    };
  });
}

function buildTranscriptEvidence(
  dimension: DimensionKey,
  transcriptSegments?: Array<{ start: number; end: number; text: string }>
): string[] {
  if (!transcriptSegments?.length) return [];

  if (dimension === 'hook') {
    const first = transcriptSegments.find((segment) => cleanLine(segment.text));
    return first ? [`Opening line at ${first.start.toFixed(1)}s: "${cleanLine(first.text)}"`] : [];
  }

  if (dimension === 'audio' || dimension === 'algorithm' || dimension === 'authenticity' || dimension === 'conversion') {
    return transcriptSegments
      .slice(0, 2)
      .map((segment) => `${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s spoken: "${cleanLine(segment.text)}"`)
      .filter(Boolean);
  }

  return [];
}

function buildCaptionEvidence(
  dimension: DimensionKey,
  captionQuality?: CaptionQualityReport | null
): string[] {
  if (!captionQuality || (dimension !== 'caption' && dimension !== 'accessibility')) return [];

  return [
    `Caption timing grade: ${captionQuality.timingGrade}; first caption ${captionQuality.firstCaptionTimeSec ?? 'unknown'}s vs speech ${captionQuality.speechStartTimeSec ?? 'unknown'}s`,
    `Caption readability: ${captionQuality.readabilityScore}/100 (${captionQuality.overallReadability})`,
    cleanLine(captionQuality.notableIssues[0]),
  ].filter(Boolean);
}

function buildFallbackExample(
  dimension: DimensionKey,
  transcriptSegments?: Array<{ start: number; end: number; text: string }>
): string {
  const firstLine = transcriptSegments?.find((segment) => cleanLine(segment.text));

  if (dimension === 'hook') {
    return firstLine
      ? `Replace "${cleanLine(firstLine.text)}" with a sharper claim, result, or curiosity gap in the first second.`
      : 'Lead with the result, then explain how you got it.';
  }

  if (dimension === 'caption' || dimension === 'accessibility') {
    return 'Put the first caption on screen immediately, keep it large, and keep it out of the bottom UI zone.';
  }

  if (dimension === 'conversion') {
    return 'End with one direct CTA tied to the value you just proved, not a generic "follow for more."';
  }

  return 'Cut the weakest beat, keep one idea per shot, and make the next edit prove the promise faster.';
}
