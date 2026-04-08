import type { RoastResult, ViewProjection } from './types';

/**
 * Score → expected view count midpoints. Single rounded numbers (not ranges)
 * so the UI can show one clean integer per state. multiplier is computed
 * from the midpoints so the displayed math always matches.
 */
export const VIEW_RANGES: Array<{
  maxScore: number;
  currentMid: number;
  improvedMid: number;
}> = [
  { maxScore:  25, currentMid:    300, improvedMid:   1000 },
  { maxScore:  40, currentMid:   1000, improvedMid:   3000 },
  { maxScore:  55, currentMid:   2000, improvedMid:   6000 },
  { maxScore:  70, currentMid:   5000, improvedMid:  15000 },
  { maxScore:  85, currentMid:  12000, improvedMid:  40000 },
  { maxScore: 100, currentMid:  50000, improvedMid: 200000 },
];

export function getViewRangeForScore(score: number) {
  return VIEW_RANGES.find(t => score <= t.maxScore) ?? VIEW_RANGES[VIEW_RANGES.length - 1];
}

/** Format a raw view count as a single short string: 300, 2K, 12K, 1.2M. */
export function formatViewsCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) {
    const k = n / 1000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const m = n / 1_000_000;
  return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1).replace(/\.0$/, '')}M`;
}

function multiplierLabel(before: number, after: number): string {
  if (before <= 0) return '';
  const ratio = after / before;
  return `${Math.round(ratio)}x`;
}

export function buildViewProjection(roast: RoastResult): ViewProjection {
  const score = roast.overallScore;
  const hookScore = roast.hookSummary?.score ?? roast.agents.find(a => a.agent === 'hook')?.score ?? score;

  const tier = getViewRangeForScore(score);

  // Adjust confidence based on how much data we have
  const hasMetadata = roast.metadata.views > 0;
  const hasNiche = !!roast.niche?.detected;
  const failedCount = roast.agents.filter(a => a.failed).length;

  let confidence: ViewProjection['confidence'] = 'medium';
  if (hasMetadata && hasNiche && failedCount === 0) confidence = 'high';
  else if (failedCount >= 2 || (!hasMetadata && !hasNiche)) confidence = 'low';

  const basedOn = [
    `overall score ${score}/100`,
    `hook strength ${hookScore}/100`,
    hasNiche ? `${roast.niche!.detected} niche` : null,
    hasMetadata ? `current performance data` : null,
  ].filter(Boolean).join(', ');

  return {
    currentExpected: formatViewsCount(tier.currentMid),
    improvedExpected: formatViewsCount(tier.improvedMid),
    multiplier: multiplierLabel(tier.currentMid, tier.improvedMid),
    confidence,
    basedOn,
  };
}
