import type { ActionPlanStep, DimensionKey } from '@/lib/types';

const LEAK_PATTERNS = [
  /\b(system prompt|prompt details|internal instructions?|developer instructions?)\b/i,
  /\b(return only valid json|valid json|json schema|markdown code block)\b/i,
  /\b(anthropic|claude-sonnet|assistant role|user role)\b/i,
  /\b(stay in your lane|not your job|your job and only your job|tone rules)\b/i,
];

const JSON_WRAPPER = /```(?:json)?|```/gi;
const WHITESPACE = /\s+/g;

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(JSON_WRAPPER, ' ').replace(WHITESPACE, ' ').trim();
}

export function sanitizeUserFacingText(value: unknown, fallback: string): string {
  const cleaned = cleanText(value);
  if (!cleaned) return fallback;

  const leaked = LEAK_PATTERNS.some((pattern) => pattern.test(cleaned));
  if (leaked) return fallback;

  const withoutJsonObject = cleaned.replace(/^\{[\s\S]*\}$/g, '').trim();
  return withoutJsonObject || fallback;
}

export function sanitizeFindings(values: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(values)) return fallback;
  const cleaned = values
    .map((value) => sanitizeUserFacingText(value, ''))
    .filter(Boolean)
    .slice(0, 5);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function sanitizeActionPlan(plan: ActionPlanStep[]): ActionPlanStep[] {
  return plan.map((step, index) => ({
    ...step,
    priority: (['P1', 'P2', 'P3'][index] ?? step.priority) as ActionPlanStep['priority'],
    issue: sanitizeUserFacingText(step.issue, 'The current edit still has a clear execution gap.'),
    evidence: sanitizeFindings(step.evidence, []).slice(0, 3),
    doThis: sanitizeUserFacingText(step.doThis, 'Rebuild this section before posting again.'),
    example: sanitizeUserFacingText(step.example, 'Ship a tighter version that proves the promise sooner.'),
    whyItMatters: sanitizeUserFacingText(step.whyItMatters, 'This fix should improve retention and trust.'),
  })).filter(step => step.evidence.length > 0);
}

export function sanitizeAgentResult(parsed: {
  score: number;
  roastText: string;
  findings: string[];
  improvementTip: string;
}, dimension: DimensionKey) {
  const defaultRoast = DEFAULT_ROAST_BY_DIMENSION[dimension];
  return {
    score: parsed.score,
    roastText: sanitizeUserFacingText(parsed.roastText, defaultRoast),
    findings: sanitizeFindings(parsed.findings, [defaultRoast]),
    improvementTip: sanitizeUserFacingText(parsed.improvementTip, DEFAULT_TIP_BY_DIMENSION[dimension]),
  };
}

const DEFAULT_ROAST_BY_DIMENSION: Record<DimensionKey, string> = {
  hook: 'The opening still is not earning the stop fast enough.',
  visual: 'The visuals are not making the story easy to trust or watch.',
  caption: 'The on-screen text is not carrying enough of the message.',
  audio: 'The audio lane still needs a cleaner read before people trust the analysis.',
  algorithm: 'The packaging is not giving TikTok a clean signal yet.',
  authenticity: 'The delivery still feels a little too flat to build trust fast.',
  conversion: 'The close is not turning attention into action yet.',
  accessibility: 'The video still leaves too much of the audience behind.',
  caption_quality: 'The captions are not hitting the technical bar for timing, readability, or placement.',
};

const DEFAULT_TIP_BY_DIMENSION: Record<DimensionKey, string> = {
  hook: 'Lead with the clearest claim, result, or text hook in the first second.',
  visual: 'Tighten the framing and clean up the first thing viewers see.',
  caption: 'Put readable text on screen earlier and keep it out of TikTok UI zones.',
  audio: 'Make the spoken point easier to hear and easier to quote.',
  algorithm: 'Package the idea more clearly so the platform can classify it faster.',
  authenticity: 'Sound more like a person proving one real point, not a script reading.',
  conversion: 'End with one direct ask tied to the value you just proved.',
  accessibility: 'Make the message clear even for viewers who start with sound off.',
  caption_quality: 'Sync captions to speech, increase font size, fix contrast, and move text out of danger zones.',
};
