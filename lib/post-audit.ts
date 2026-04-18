import { sanitizeUserFacingText } from '@/lib/analysis-safety';
import type {
  ActionPlanStep,
  AgentRoast,
  EvidenceCitation,
  PostAuditResult,
  RoastResult,
} from '@/lib/types';

interface OnScreenTextResult {
  timestampSec: number;
  label: string;
  detectedText: string[];
}

interface PlatformMetricsInput {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

interface LinkedRoastInput {
  id: string;
  verdict?: string;
  actionPlan?: ActionPlanStep[];
}

export interface BuildPostAuditFallbackParams {
  platformUrl: string;
  hookSummary?: RoastResult['hookSummary'];
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
  onScreenTextResults?: OnScreenTextResult[];
  actionPlan?: ActionPlanStep[];
  nextSteps?: string[];
  agents?: AgentRoast[];
  linkedRoast?: LinkedRoastInput | null;
  platformMetrics?: PlatformMetricsInput;
}

function extractJsonObject(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  const startIdx = jsonStr.indexOf('{');
  if (startIdx === -1) throw new Error('No JSON object found');

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIdx = -1;

  for (let i = startIdx; i < jsonStr.length; i += 1) {
    const char = jsonStr[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx === -1) {
    throw new Error('Truncated JSON object');
  }

  return jsonStr.slice(startIdx, endIdx + 1);
}

function cleanLine(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function formatTimestamp(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.max(0, Math.round(value % 60));
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function asStringArray(value: unknown, limit = 3): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => sanitizeUserFacingText(cleanLine(item), ''))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function normalizeStatus(
  value: unknown,
): 'followed' | 'partially_followed' | 'not_followed' | 'not_evaluable' {
  return value === 'followed'
    || value === 'partially_followed'
    || value === 'not_followed'
    || value === 'not_evaluable'
    ? value
    : 'not_evaluable';
}

function normalizeOverallVerdict(
  value: unknown,
): 'mostly_followed' | 'partially_followed' | 'not_followed' {
  return value === 'mostly_followed' || value === 'partially_followed' || value === 'not_followed'
    ? value
    : 'partially_followed';
}

function metricsToCitation(metrics?: PlatformMetricsInput): EvidenceCitation | null {
  if (!metrics) return null;

  const parts = [
    typeof metrics.views === 'number' ? `${metrics.views.toLocaleString()} views` : null,
    typeof metrics.likes === 'number' ? `${metrics.likes.toLocaleString()} likes` : null,
    typeof metrics.comments === 'number' ? `${metrics.comments.toLocaleString()} comments` : null,
    typeof metrics.shares === 'number' ? `${metrics.shares.toLocaleString()} shares` : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return {
    id: 'session-metrics',
    sourceType: 'session',
    label: 'Observed TikTok metrics',
    detail: parts.join(' • '),
  };
}

export function buildPostAuditCitations(params: BuildPostAuditFallbackParams): EvidenceCitation[] {
  const citations: EvidenceCitation[] = [];
  const firstTranscript = params.transcriptSegments?.find((segment) => cleanLine(segment.text));
  if (firstTranscript) {
    citations.push({
      id: 'session-opening-line',
      sourceType: 'session',
      label: 'Opening spoken line',
      detail: `"${sanitizeUserFacingText(firstTranscript.text, '')}"`,
      timestampLabel: formatTimestamp(firstTranscript.start),
    });
  }

  const firstOnScreenText = params.onScreenTextResults
    ?.find((result) => result.detectedText.some((item) => cleanLine(item)));
  if (firstOnScreenText) {
    citations.push({
      id: 'session-opening-text',
      sourceType: 'session',
      label: 'Opening on-screen text',
      detail: firstOnScreenText.detectedText.map((item) => sanitizeUserFacingText(item, '')).join(' / '),
      timestampLabel: formatTimestamp(firstOnScreenText.timestampSec),
    });
  }

  const p1Evidence = params.actionPlan?.[0]?.evidence?.[0];
  if (p1Evidence) {
    citations.push({
      id: 'session-p1-evidence',
      sourceType: 'session',
      label: 'Highest-leverage issue',
      detail: sanitizeUserFacingText(p1Evidence, p1Evidence),
      timestampLabel: params.actionPlan?.[0]?.timestampLabel ?? undefined,
    });
  }

  const strongestAgent = [...(params.agents ?? [])]
    .filter((agent) => !agent.failed)
    .sort((a, b) => b.score - a.score)[0];
  if (strongestAgent?.findings?.[0]) {
    citations.push({
      id: `session-agent-${strongestAgent.agent}`,
      sourceType: 'session',
      label: `${strongestAgent.agent} strength`,
      detail: sanitizeUserFacingText(strongestAgent.findings[0], strongestAgent.findings[0]),
    });
  }

  const metricsCitation = metricsToCitation(params.platformMetrics);
  if (metricsCitation) {
    citations.push(metricsCitation);
  }

  const linkedRoastStep = params.linkedRoast?.actionPlan?.[0];
  if (linkedRoastStep) {
    citations.push({
      id: 'linked-roast-p1',
      sourceType: 'linked_roast',
      label: 'Prior P1 advice',
      detail: sanitizeUserFacingText(linkedRoastStep.doThis, linkedRoastStep.doThis),
      timestampLabel: linkedRoastStep.timestampLabel ?? undefined,
      sourceRef: params.linkedRoast?.id,
    });
  } else if (params.linkedRoast?.verdict) {
    citations.push({
      id: 'linked-roast-verdict',
      sourceType: 'linked_roast',
      label: 'Prior roast verdict',
      detail: sanitizeUserFacingText(params.linkedRoast.verdict, params.linkedRoast.verdict),
      sourceRef: params.linkedRoast.id,
    });
  }

  return citations.slice(0, 5);
}

export function buildFallbackPostAudit(params: BuildPostAuditFallbackParams): PostAuditResult {
  const citations = buildPostAuditCitations(params);
  const strongestSignals = [
    params.hookSummary?.headline,
    params.actionPlan?.[0]?.issue,
    params.nextSteps?.[0],
  ]
    .map((item) => sanitizeUserFacingText(cleanLine(item), ''))
    .filter(Boolean)
    .slice(0, 3);

  const whatWorked = [
    params.hookSummary?.strength === 'strong'
      ? params.hookSummary.headline
      : params.agents?.filter((agent) => !agent.failed).sort((a, b) => b.score - a.score)[0]?.findings?.[0],
    params.linkedRoast ? 'You have a prior roast linked, so this audit can compare what changed against earlier advice.' : null,
  ]
    .map((item) => sanitizeUserFacingText(cleanLine(item), ''))
    .filter(Boolean)
    .slice(0, 3);

  const whatMissed = [
    params.actionPlan?.[0]?.issue,
    params.actionPlan?.[1]?.issue,
  ]
    .map((item) => sanitizeUserFacingText(cleanLine(item), ''))
    .filter(Boolean)
    .slice(0, 3);

  const nextMoves = [
    ...(params.nextSteps ?? []),
    ...(params.actionPlan?.map((item) => item.doThis) ?? []),
  ]
    .map((item) => sanitizeUserFacingText(cleanLine(item), ''))
    .filter(Boolean)
    .slice(0, 3);

  const adviceFollowThrough = params.linkedRoast
      ? {
        linkedRoastId: params.linkedRoast.id,
        overallVerdict: 'partially_followed' as const,
        items: (params.linkedRoast.actionPlan ?? []).slice(0, 3).map((item, index) => ({
          priority: (item.priority ?? (index === 0 ? 'P1' : index === 1 ? 'P2' : 'P3')) as 'P1' | 'P2' | 'P3',
          dimension: item.dimension,
          status: 'not_evaluable' as const,
          reason: 'This first version could not verify follow-through with enough certainty, so it is marked unevaluable instead of guessing.',
        })),
      }
    : undefined;

  return {
    platform: 'tiktok',
    platformUrl: params.platformUrl,
    metricsAvailable: Boolean(
      params.platformMetrics
      && Object.values(params.platformMetrics).some((value) => typeof value === 'number'),
    ),
    confidence: citations.length >= 3 ? 'medium' : 'low',
    evidenceSummary: {
      strongestSignals,
      citations,
    },
    whatWorked: whatWorked.length > 0
      ? whatWorked
      : ['The posted video gave us enough direct evidence to audit the opener and the first few beats.'],
    whatMissed: whatMissed.length > 0
      ? whatMissed
      : ['The current audit still sees a clear execution gap in the opening or payoff path.'],
    nextMoves: nextMoves.length > 0
      ? nextMoves
      : ['Tighten the opening, rerun the audit, and compare whether the first change actually improved the hold.'],
    ...(adviceFollowThrough ? { adviceFollowThrough } : {}),
    chatEligible: citations.length >= 3,
  };
}

export function parsePostAuditResponse(text: string, fallback: PostAuditResult): PostAuditResult {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as Partial<PostAuditResult>;
    const parsedCitations = Array.isArray(parsed.evidenceSummary?.citations)
      ? parsed.evidenceSummary.citations
          .map((citation) => {
            const item = citation as Partial<EvidenceCitation>;
            const sourceType = item.sourceType === 'session' || item.sourceType === 'linked_roast' || item.sourceType === 'market'
              ? item.sourceType
              : 'session';
            const label = sanitizeUserFacingText(cleanLine(item.label), '');
            const detail = sanitizeUserFacingText(cleanLine(item.detail), '');
            if (!label || !detail) return null;
            return {
              id: sanitizeUserFacingText(cleanLine(item.id), label.toLowerCase().replace(/\s+/g, '-')),
              sourceType,
              label,
              detail,
              ...(cleanLine(item.timestampLabel) ? { timestampLabel: cleanLine(item.timestampLabel) } : {}),
              ...(cleanLine(item.sourceRef) ? { sourceRef: cleanLine(item.sourceRef) } : {}),
            } satisfies EvidenceCitation;
          })
          .filter((item): item is EvidenceCitation => item !== null)
          .slice(0, 5)
      : fallback.evidenceSummary.citations;

    const adviceItems = Array.isArray(parsed.adviceFollowThrough?.items)
      ? parsed.adviceFollowThrough.items.slice(0, 3).map((item, index) => {
          const record = item as Record<string, unknown>;
          return {
            priority: record.priority === 'P1' || record.priority === 'P2' || record.priority === 'P3'
              ? record.priority
              : (index === 0 ? 'P1' : index === 1 ? 'P2' : 'P3') as 'P1' | 'P2' | 'P3',
            dimension: sanitizeUserFacingText(cleanLine(record.dimension), 'hook'),
            status: normalizeStatus(record.status),
            reason: sanitizeUserFacingText(cleanLine(record.reason), 'Follow-through confidence was limited for this advice item.'),
          };
        })
      : fallback.adviceFollowThrough?.items;

    return {
      platform: 'tiktok',
      platformUrl: fallback.platformUrl,
      metricsAvailable: parsed.metricsAvailable ?? fallback.metricsAvailable,
      confidence: parsed.confidence === 'low' || parsed.confidence === 'medium' || parsed.confidence === 'high'
        ? parsed.confidence
        : fallback.confidence,
      evidenceSummary: {
        strongestSignals: asStringArray(parsed.evidenceSummary?.strongestSignals, 3).length > 0
          ? asStringArray(parsed.evidenceSummary?.strongestSignals, 3)
          : fallback.evidenceSummary.strongestSignals,
        citations: parsedCitations.length > 0 ? parsedCitations : fallback.evidenceSummary.citations,
        ...(Array.isArray(parsed.evidenceSummary?.marketEvidence) && parsed.evidenceSummary.marketEvidence.length > 0
          ? { marketEvidence: parsed.evidenceSummary.marketEvidence.slice(0, 3) }
          : {}),
      },
      whatWorked: asStringArray(parsed.whatWorked).length > 0 ? asStringArray(parsed.whatWorked) : fallback.whatWorked,
      whatMissed: asStringArray(parsed.whatMissed).length > 0 ? asStringArray(parsed.whatMissed) : fallback.whatMissed,
      nextMoves: asStringArray(parsed.nextMoves).length > 0 ? asStringArray(parsed.nextMoves) : fallback.nextMoves,
      ...(parsed.adviceFollowThrough || fallback.adviceFollowThrough
        ? {
            adviceFollowThrough: {
              linkedRoastId: sanitizeUserFacingText(
                cleanLine(parsed.adviceFollowThrough?.linkedRoastId),
                fallback.adviceFollowThrough?.linkedRoastId ?? '',
              ),
              overallVerdict: normalizeOverallVerdict(parsed.adviceFollowThrough?.overallVerdict),
              items: adviceItems ?? [],
            },
          }
        : {}),
      chatEligible: (parsed.chatEligible ?? (parsedCitations.length >= 3)) && parsedCitations.length >= 3,
    };
  } catch {
    return fallback;
  }
}
