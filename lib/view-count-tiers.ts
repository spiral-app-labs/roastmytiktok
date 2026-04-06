import type { DimensionKey } from './types';

export interface ViewTier {
  tier: number;
  label: string;
  /** Representative midpoint value for display */
  representative: number;
}

export const VIEW_TIERS: ViewTier[] = [
  { tier: 1,  label: '0–200',       representative: 100 },
  { tier: 2,  label: '200–600',     representative: 400 },
  { tier: 3,  label: '600–2K',      representative: 1_000 },
  { tier: 4,  label: '2K–5K',       representative: 3_000 },
  { tier: 5,  label: '5K–20K',      representative: 10_000 },
  { tier: 6,  label: '20K–50K',     representative: 35_000 },
  { tier: 7,  label: '50K–200K',    representative: 100_000 },
  { tier: 8,  label: '200K–500K',   representative: 350_000 },
  { tier: 9,  label: '500K–2M',     representative: 1_000_000 },
  { tier: 10, label: '2M+ (viral)', representative: 5_000_000 },
];

// Map overall score (0–100) → tier number (1–10)
const SCORE_TIER_MAP: Array<{ maxScore: number; tier: number }> = [
  { maxScore: 10,  tier: 1 },
  { maxScore: 20,  tier: 2 },
  { maxScore: 30,  tier: 3 },
  { maxScore: 40,  tier: 4 },
  { maxScore: 52,  tier: 5 },
  { maxScore: 63,  tier: 6 },
  { maxScore: 74,  tier: 7 },
  { maxScore: 84,  tier: 8 },
  { maxScore: 93,  tier: 9 },
  { maxScore: 100, tier: 10 },
];

function scoreToTierNum(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return SCORE_TIER_MAP.find(s => clamped <= s.maxScore)?.tier ?? 10;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `~${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `~${Math.round(n / 1_000)}K`;
  return `~${n}`;
}

export interface ViewImpact {
  before: string;   // e.g. "~600 views"
  after: string;    // e.g. "~45K views"
  delta: string;    // e.g. "600 → 45K views"
  isHookJump: boolean;
}

/**
 * Given a current score and an improved score (after fixing an issue),
 * returns human-readable view count impact strings.
 */
export function getViewImpact(currentScore: number, improvedScore: number): ViewImpact {
  const beforeTierNum = scoreToTierNum(currentScore);
  const afterTierNum  = scoreToTierNum(improvedScore);

  const beforeTier = VIEW_TIERS[beforeTierNum - 1];
  const afterTier  = VIEW_TIERS[afterTierNum  - 1];

  const tierJump = afterTierNum - beforeTierNum;

  const beforeStr = formatViews(beforeTier.representative);
  const afterStr  = formatViews(afterTier.representative);

  // Delta label strips the leading ~ for readability: "600 → 45K views"
  const beforeRaw = beforeStr.replace(/^~/, '');
  const afterRaw  = afterStr.replace(/^~/, '');
  const delta     = `${beforeRaw} → ${afterRaw} views`;

  return {
    before: `${beforeStr} views`,
    after:  `${afterStr} views`,
    delta,
    isHookJump: tierJump >= 3,
  };
}

/**
 * Estimates the overall score after fixing a single issue,
 * based on which dimension it belongs to and its priority.
 *
 * Hook fixes are worth 3–4 tier steps; other fixes 1–2 steps.
 */
export function getEstimatedImprovedScore(
  currentScore: number,
  dimension: DimensionKey,
  priority: 'P1' | 'P2' | 'P3',
): number {
  let boost: number;

  if (dimension === 'hook') {
    // Hooks drive the biggest distribution jumps
    boost = priority === 'P1' ? 20 : priority === 'P2' ? 17 : 14;
  } else if (priority === 'P1') {
    boost = 12;
  } else if (priority === 'P2') {
    boost = 8;
  } else {
    boost = 5;
  }

  return Math.min(100, currentScore + boost);
}
