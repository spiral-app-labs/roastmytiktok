import type { ActionPlanStep, AgentRoast, DimensionKey } from '@/lib/types';

/**
 * Formats a step's timestamp as a human-readable label.
 * Prefers an explicit `timestampLabel`, falls back to `m:ss` from seconds.
 * Returns an empty string when no timestamp is available.
 */
export function formatTimestamp(step: ActionPlanStep): string {
  if (step.timestampLabel) return step.timestampLabel;
  if (typeof step.timestampSeconds !== 'number') return '';
  const rounded = Math.max(0, Math.round(step.timestampSeconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * An agent is considered failed when it explicitly reports `failed: true`
 * or when the first finding is an analysis-error sentinel string.
 */
export function isAgentFailed(a: Pick<AgentRoast, 'failed' | 'findings'>): boolean {
  if (a.failed) return true;
  if (a.findings?.[0]?.startsWith('Analysis error')) return true;
  return false;
}

/**
 * Canonical ordering of dimensions in the action plan.
 * Hook goes first because it has the highest distribution leverage —
 * a P3 hook item intentionally ranks BEFORE a P1 visual item.
 */
export const DIMENSION_ORDER: Record<DimensionKey, number> = {
  hook: 0,
  visual: 1,
  audio: 2,
  conversion: 3,
  authenticity: 4,
  accessibility: 5,
};

function priorityRank(priority: ActionPlanStep['priority']): number {
  const n = parseInt(priority?.replace(/\D/g, '') || '3', 10);
  return Number.isFinite(n) ? n : 3;
}

/**
 * Sort invariant: dimension FIRST (hook → visual → audio → conversion →
 * authenticity → accessibility), then priority (P1 → P2 → P3) within each.
 * This is intentional — hook has the highest leverage so even low-priority
 * hook fixes surface above high-priority fixes in other dimensions.
 */
export function sortActionPlan(steps: ActionPlanStep[]): ActionPlanStep[] {
  return [...steps].sort((a, b) => {
    const dA = DIMENSION_ORDER[a.dimension] ?? 6;
    const dB = DIMENSION_ORDER[b.dimension] ?? 6;
    if (dA !== dB) return dA - dB;
    return priorityRank(a.priority) - priorityRank(b.priority);
  });
}

/**
 * Removes steps whose dimension belongs to a failed agent.
 * `failedDimensions` is the set of dimension keys whose agents errored.
 */
export function filterActionPlan(
  steps: ActionPlanStep[],
  failedDimensions: Set<DimensionKey>,
): ActionPlanStep[] {
  if (failedDimensions.size === 0) return steps;
  return steps.filter((step) => !failedDimensions.has(step.dimension));
}
