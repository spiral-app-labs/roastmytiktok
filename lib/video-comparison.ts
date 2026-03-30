import { RoastResult, AgentRoast, DimensionKey } from './types';
import { AGENTS } from './agents';

export interface ComparisonMetric {
  key: 'hookStrength' | 'retentionRisk' | 'captionQuality' | 'ctaQuality';
  label: string;
  higherIsBetter: boolean;
  aValue: number;
  bValue: number;
  winner: 'a' | 'b' | 'tie';
  summary: string;
}

export interface AgentDelta {
  agent: DimensionKey;
  emoji: string;
  name: string;
  aScore: number;
  bScore: number;
  delta: number;
  direction: 'improved' | 'regressed' | 'unchanged';
}

export interface ComparisonSummary {
  improved: AgentDelta[];
  regressed: AgentDelta[];
  unchanged: AgentDelta[];
  keyLesson: string;
}

export interface ComparisonInsight {
  title: string;
  winner: 'a' | 'b';
  detail: string;
}

export interface VideoComparison {
  winner: 'a' | 'b' | 'tie';
  winnerLabel: string;
  confidence: 'slight' | 'clear' | 'dominant';
  scoreDelta: number;
  overallA: number;
  overallB: number;
  overallDelta: number;
  metrics: ComparisonMetric[];
  agentDeltas: AgentDelta[];
  summary: ComparisonSummary;
  reasons: ComparisonInsight[];
  narrative: string;
}

function getAgentScore(result: RoastResult, key: DimensionKey): number | null {
  const agent = result.agents.find((item) => item.agent === key);
  return typeof agent?.score === 'number' ? agent.score : null;
}

function getAgent(result: RoastResult, key: DimensionKey): AgentRoast | null {
  return result.agents.find((item) => item.agent === key) ?? null;
}

function avg(values: Array<number | null | undefined>): number {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (valid.length === 0) return 50;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function pickWinner(aValue: number, bValue: number, higherIsBetter = true): 'a' | 'b' | 'tie' {
  if (Math.abs(aValue - bValue) <= 2) return 'tie';
  if (higherIsBetter) return aValue > bValue ? 'a' : 'b';
  return aValue < bValue ? 'a' : 'b';
}

function retentionRisk(result: RoastResult): number {
  const hook = getAgentScore(result, 'hook');
  const caption = getAgentScore(result, 'caption');
  const audio = getAgentScore(result, 'audio');
  const algorithm = getAgentScore(result, 'algorithm');
  const visual = getAgentScore(result, 'visual');
  const durability = avg([hook, caption, audio, algorithm, visual]);
  return Math.max(5, Math.min(95, 100 - durability));
}

function ctaQuality(result: RoastResult): number {
  const conversion = getAgentScore(result, 'conversion');
  if (typeof conversion === 'number') return conversion;
  return avg([
    getAgentScore(result, 'caption'),
    getAgentScore(result, 'algorithm'),
    getAgentScore(result, 'authenticity'),
  ]);
}

function metricSummary(label: string, winner: 'a' | 'b' | 'tie', aName: string, bName: string, winnerValue: number, loserValue: number): string {
  if (winner === 'tie') return `${label} is basically even.`;
  const diff = Math.abs(winnerValue - loserValue);
  const name = winner === 'a' ? aName : bName;
  return `${name} leads ${label.toLowerCase()} by ${diff} points.`;
}

function buildReason(title: string, winner: 'a' | 'b', winningAgent: AgentRoast | null, fallback: string): ComparisonInsight {
  const detail = winningAgent?.findings?.[0] ?? winningAgent?.improvementTip ?? winningAgent?.roastText ?? fallback;
  return { title, winner, detail };
}

function buildAgentDeltas(a: RoastResult, b: RoastResult): AgentDelta[] {
  return AGENTS.map((def) => {
    const aScore = getAgentScore(a, def.key) ?? 0;
    const bScore = getAgentScore(b, def.key) ?? 0;
    const delta = bScore - aScore;
    const direction: AgentDelta['direction'] =
      Math.abs(delta) <= 2 ? 'unchanged' : delta > 0 ? 'improved' : 'regressed';
    return {
      agent: def.key,
      emoji: def.emoji,
      name: def.name.replace(' Agent', ''),
      aScore,
      bScore,
      delta,
      direction,
    };
  });
}

function buildKeyLesson(summary: Pick<ComparisonSummary, 'improved' | 'regressed'>): string {
  const topImproved = summary.improved[0];
  const topRegressed = summary.regressed[0];

  if (topImproved && topRegressed) {
    return `Your ${topImproved.name.toLowerCase()} got stronger (+${topImproved.delta}), but ${topRegressed.name.toLowerCase()} slipped (${topRegressed.delta}). Next video: keep the ${topImproved.name.toLowerCase()} gains and focus on fixing ${topRegressed.name.toLowerCase()}.`;
  }
  if (topImproved) {
    return `Clear progress — ${topImproved.name.toLowerCase()} jumped by ${topImproved.delta} points. Keep doing what you changed there and start applying the same energy to your weakest dimension.`;
  }
  if (topRegressed) {
    return `${topRegressed.name.toLowerCase()} dropped by ${Math.abs(topRegressed.delta)} points. Before your next video, revisit the improvement tips from your last roast on that dimension.`;
  }
  return 'Both videos scored similarly across all dimensions. Try something genuinely different in your next video to see movement.';
}

export function compareRoasts(a: RoastResult, b: RoastResult, aName = 'video a', bName = 'video b'): VideoComparison {
  const metrics: ComparisonMetric[] = ([
    {
      key: 'hookStrength',
      label: 'Hook Strength',
      higherIsBetter: true,
      aValue: getAgentScore(a, 'hook') ?? 50,
      bValue: getAgentScore(b, 'hook') ?? 50,
      winner: 'tie',
      summary: '',
    },
    {
      key: 'retentionRisk',
      label: 'Retention Risk',
      higherIsBetter: false,
      aValue: retentionRisk(a),
      bValue: retentionRisk(b),
      winner: 'tie',
      summary: '',
    },
    {
      key: 'captionQuality',
      label: 'Caption Quality',
      higherIsBetter: true,
      aValue: getAgentScore(a, 'caption') ?? 50,
      bValue: getAgentScore(b, 'caption') ?? 50,
      winner: 'tie',
      summary: '',
    },
    {
      key: 'ctaQuality',
      label: 'CTA Quality',
      higherIsBetter: true,
      aValue: ctaQuality(a),
      bValue: ctaQuality(b),
      winner: 'tie',
      summary: '',
    },
  ] as ComparisonMetric[]).map((metric) => {
    const winner = pickWinner(metric.aValue, metric.bValue, metric.higherIsBetter);
    return {
      ...metric,
      winner,
      summary: metricSummary(
        metric.label,
        winner,
        aName,
        bName,
        winner === 'a' ? metric.aValue : metric.bValue,
        winner === 'a' ? metric.bValue : metric.aValue,
      ),
    };
  });

  const aMetricWins = metrics.filter((metric) => metric.winner === 'a').length;
  const bMetricWins = metrics.filter((metric) => metric.winner === 'b').length;
  const baseDelta = a.overallScore - b.overallScore;
  const weightedDelta = baseDelta + (aMetricWins - bMetricWins) * 6;
  const winner = Math.abs(weightedDelta) <= 4 ? 'tie' : weightedDelta > 0 ? 'a' : 'b';
  const absoluteDelta = Math.abs(weightedDelta);
  const confidence: VideoComparison['confidence'] = absoluteDelta >= 18 ? 'dominant' : absoluteDelta >= 9 ? 'clear' : 'slight';
  const winnerLabel = winner === 'tie' ? 'too close to call' : winner === 'a' ? aName : bName;

  const reasons: ComparisonInsight[] = [];
  const hookWinner = metrics.find((metric) => metric.key === 'hookStrength')?.winner;
  if (hookWinner === 'a' || hookWinner === 'b') {
    reasons.push(buildReason('Stronger opening hook', hookWinner, getAgent(hookWinner === 'a' ? a : b, 'hook'), 'The first few seconds are doing more work.'));
  }

  const captionWinner = metrics.find((metric) => metric.key === 'captionQuality')?.winner;
  if (captionWinner === 'a' || captionWinner === 'b') {
    reasons.push(buildReason('Cleaner on-screen communication', captionWinner, getAgent(captionWinner === 'a' ? a : b, 'caption'), 'The message is easier to follow with sound off.'));
  }

  const algorithmDiff = (getAgentScore(a, 'algorithm') ?? 50) - (getAgentScore(b, 'algorithm') ?? 50);
  if (Math.abs(algorithmDiff) > 5) {
    const algWinner = algorithmDiff > 0 ? 'a' : 'b';
    reasons.push(buildReason('Better chance of surviving the feed test', algWinner, getAgent(algWinner === 'a' ? a : b, 'algorithm'), 'The packaging is more likely to earn distribution.'));
  }

  const narrative = winner === 'tie'
    ? `${aName} and ${bName} are close enough that the choice comes down to creative preference. ${aMetricWins === bMetricWins ? 'Neither one clearly dominates the core metrics.' : 'The metrics split across strengths.'}`
    : `${winnerLabel} is the likely winner because it stacks a better opening, stronger retention profile, and more usable packaging for the viewer.`;

  // Per-agent deltas (a = older, b = newer)
  const agentDeltas = buildAgentDeltas(a, b);
  const improved = agentDeltas.filter((d) => d.direction === 'improved').sort((x, y) => y.delta - x.delta);
  const regressed = agentDeltas.filter((d) => d.direction === 'regressed').sort((x, y) => x.delta - y.delta);
  const unchanged = agentDeltas.filter((d) => d.direction === 'unchanged');

  const summary: ComparisonSummary = {
    improved,
    regressed,
    unchanged,
    keyLesson: buildKeyLesson({ improved, regressed }),
  };

  return {
    winner,
    winnerLabel,
    confidence,
    scoreDelta: absoluteDelta,
    overallA: a.overallScore,
    overallB: b.overallScore,
    overallDelta: b.overallScore - a.overallScore,
    metrics,
    agentDeltas,
    summary,
    reasons: reasons.slice(0, 3),
    narrative,
  };
}
