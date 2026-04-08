import type { DimensionKey } from './types';
import { VIEW_RANGES, getViewRangeForScore, formatViewsCount } from './view-projection';

export interface ViewImpact {
  before: string;
  after: string;
  delta: string;
  isHookJump: boolean;
}

/**
 * Estimated tier jump per fix. Hooks drive the biggest distribution jumps;
 * other P1/P2 fixes are worth one tier; P3 polish is worth one tier.
 * Differentiating by dimension+priority makes the "Start here" hook card
 * visibly outsize the supporting cards in the Expected change box.
 */
function tierJumpForFix(dimension: DimensionKey, priority: 'P1' | 'P2' | 'P3'): number {
  if (dimension === 'hook') return priority === 'P3' ? 1 : 2;
  if (priority === 'P1') return 1;
  return 1;
}

/**
 * Returns the human-readable view count impact for fixing a single issue,
 * computed in the SAME range ladder as the projection strip so the two
 * never contradict each other.
 */
export function getFixViewImpact(
  currentScore: number,
  dimension: DimensionKey,
  priority: 'P1' | 'P2' | 'P3',
): ViewImpact {
  const beforeTier = getViewRangeForScore(currentScore);
  const beforeIdx  = VIEW_RANGES.indexOf(beforeTier);

  const jump = tierJumpForFix(dimension, priority);
  const afterIdx = Math.min(VIEW_RANGES.length - 1, beforeIdx + jump);
  const afterTier = VIEW_RANGES[afterIdx];

  const beforeStr = formatViewsCount(beforeTier.currentMid);
  const afterStr  = formatViewsCount(afterTier.currentMid);

  return {
    before: `${beforeStr} views`,
    after:  `${afterStr} views`,
    delta:  `${beforeStr} → ${afterStr} views`,
    isHookJump: afterIdx - beforeIdx >= 2,
  };
}
