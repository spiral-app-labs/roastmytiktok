import type { RoastResult, ViewProjection } from './types';

const VIEW_RANGES: Array<{ maxScore: number; range: string; improved: string; multiplier: string }> = [
  { maxScore: 25, range: '100-500', improved: '500-2K', multiplier: '3-5x' },
  { maxScore: 40, range: '300-1.5K', improved: '1.5K-5K', multiplier: '2-4x' },
  { maxScore: 55, range: '500-3K', improved: '3K-10K', multiplier: '2-3x' },
  { maxScore: 70, range: '1K-8K', improved: '5K-25K', multiplier: '2-3x' },
  { maxScore: 85, range: '3K-20K', improved: '15K-80K', multiplier: '2-4x' },
  { maxScore: 100, range: '10K-100K', improved: '50K-500K', multiplier: '2-5x' },
];

export function buildViewProjection(roast: RoastResult): ViewProjection {
  const score = roast.overallScore;
  const hookScore = roast.hookSummary?.score ?? roast.agents.find(a => a.agent === 'hook')?.score ?? score;

  const tier = VIEW_RANGES.find(t => score <= t.maxScore) ?? VIEW_RANGES[VIEW_RANGES.length - 1];

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
    currentExpected: `${tier.range} views`,
    improvedExpected: `${tier.improved} views`,
    multiplier: tier.multiplier,
    confidence,
    basedOn,
  };
}
