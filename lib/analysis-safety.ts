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
};

// ---------------------------------------------------------------------------
// Prompt input safety — sanitize and truncate data going INTO prompts
// ---------------------------------------------------------------------------

/**
 * Patterns that look like prompt injection attempts in user-supplied text
 * (transcript, filenames, captions). Strip these before including in prompts.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /system:\s*/i,
  /\bact\s+as\b/i,
  /\bdisregard\b.*\binstructions?\b/i,
  /\breturn\s+the\s+(system|initial)\s+prompt\b/i,
];

/**
 * Sanitize text that will be interpolated into an AI prompt.
 * Strips potential injection patterns and truncates to a safe length.
 */
export function sanitizePromptInput(text: string, maxChars: number = 5000): string {
  if (!text) return '';
  let cleaned = text.slice(0, maxChars);
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[filtered]');
  }
  return cleaned;
}

/**
 * Truncate a prompt string to stay within approximate token limits.
 * Uses a rough 4-chars-per-token estimate. Returns the truncated string
 * with a marker if it was cut.
 */
export function truncateForTokenLimit(text: string, maxTokens: number = 12000): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[... truncated for token safety]';
}

/**
 * Validate that a score is a reasonable number in [0, 100].
 */
export function clampScore(value: unknown, fallback: number = 50): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}
