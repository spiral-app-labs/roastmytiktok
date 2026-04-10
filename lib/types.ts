export type DimensionKey = 'hook' | 'visual' | 'audio' | 'authenticity' | 'conversion' | 'accessibility';

export interface AgentConfidence {
  level: 'low' | 'medium' | 'high';
  reason: string;
}

export interface AgentDef {
  key: DimensionKey;
  emoji: string;
  name: string;
  displayName: string;
  oneLiner: string;
  analyzes: string;
}

export interface AgentRoast {
  agent: DimensionKey;
  score: number;
  roastText: string;
  findings: string[];
  improvementTip: string;
  scoreJustification?: string[];
  confidence?: AgentConfidence;
  timestamp_seconds?: number;
  /** True when the agent errored and the score is not real */
  failed?: boolean;
  /** Human-readable explanation of why the agent failed */
  failureReason?: string;
}

export interface ViewProjection {
  currentExpected: string;
  improvedExpected: string;
  multiplier: string;
  confidence: 'low' | 'medium' | 'high';
  basedOn: string;
}

export interface HookIdentification {
  textOnScreen: string | null;
  spokenWords: string | null;
  visualDescription: string;
}

export interface HookDimensionScore {
  score: number;
  justification: string;
}

export type HookOCRRole =
  | 'promise'
  | 'problem'
  | 'payoff_preview'
  | 'question'
  | 'context'
  | 'cta'
  | 'label'
  | 'unknown';

export type HookLegibility = 'poor' | 'ok' | 'good';
export type HookRiskLevel = 'low' | 'med' | 'high';
export type HookPace = 'low' | 'med' | 'high';
export type HookMechanismLabel =
  | 'question'
  | 'payoff_preview'
  | 'curiosity_gap'
  | 'problem_callout'
  | 'surprising_claim'
  | 'social_proof'
  | 'pattern_interrupt'
  | 'statement_of_intent';

export type HookPrimaryFail =
  | 'clarity_gap'
  | 'payoff_delay'
  | 'visual_monotony'
  | 'text_overload'
  | 'trust_friction'
  | 'brand_penalty'
  | 'audio_dependency'
  | 'none';

export interface HookOCRSegment {
  t0: number;
  t1: number;
  text: string;
  role: HookOCRRole;
  legibility: HookLegibility;
  safe: boolean;
}

export interface HookSpeechSegment {
  t0: number;
  t1: number;
  text: string;
  confidence: number;
}

export interface HookTimingSummary {
  propositionTimeSec: number | null;
  firstChangeTimeSec: number | null;
  firstCutTimeSec: number | null;
}

export interface HookOCRSummary {
  segments: HookOCRSegment[];
  wpsPeak: number;
  legibilityRisk: HookRiskLevel;
  safeZoneRisk: HookRiskLevel;
}

export interface HookVisualSummary {
  cuts: number;
  motion: number;
  pace: HookPace;
  facePresent: boolean;
  faceStartSec: number | null;
  faceArea: number;
  eyeContact: 'none' | 'partial' | 'direct';
  expression: string;
  lighting: 'good' | 'under' | 'over' | 'backlit' | 'mixed';
  faceLuma: number | null;
}

export interface HookAudioSummary {
  transcriptPresent: boolean;
  transcriptStartSec: number | null;
  transcriptConfidence: number;
  dependencyRisk: HookRiskLevel;
  upliftReason: string;
}

export interface HookLabelSummary {
  mechanisms: HookMechanismLabel[];
  primaryFail: HookPrimaryFail;
}

export interface HookSubscores {
  clarity: number;
  text: number;
  pacing: number;
  human: number;
  lighting: number;
}

export interface HookScoreSummary {
  subscores: HookSubscores;
  silentScore: number;
  audioUplift: number;
  hookScore: number;
  confidence: number;
}

export interface HookPredictionSummary {
  pStay3s: number;
  pStay5s: number;
  viralProbability: number;
  confidence: number;
}

export interface HookEditFix {
  impact: 'high' | 'med' | 'low';
  do: string;
  why: string;
}

export interface HookReplacement {
  hook: string;
  shot: string;
  overlay: string;
}

export interface HookReshootPlan {
  firstShot: string;
  first5sScript: string;
  shotBeats: string[];
  lighting: string;
}

export interface HookFixTracks {
  editOnly: HookEditFix[];
  reshoot: Array<{
    label: string;
    detail: string;
  }>;
}

export interface HookAnalysis {
  windowSec: number;
  summary: string;
  observed: {
    visual: string;
    ocr: HookOCRSegment[];
    speech: HookSpeechSegment[];
  };
  timing: HookTimingSummary;
  ocr: HookOCRSummary;
  visual: HookVisualSummary;
  audio: HookAudioSummary;
  labels: HookLabelSummary;
  scores: HookScoreSummary;
  predictions: HookPredictionSummary;
  editFixes: HookEditFix[];
  reshootPlan: HookReshootPlan;
  replacementHooks: HookReplacement[];
  // Legacy compatibility fields used by older UI surfaces.
  dimensions?: {
    visual: HookDimensionScore;
    audio: HookDimensionScore;
    narrative: HookDimensionScore;
  };
  overallScore?: number;
  topFixes?: string[];
}

export interface ActionPlanStep {
  priority: 'P1' | 'P2' | 'P3';
  dimension: DimensionKey;
  timestampLabel?: string | null;
  timestampSeconds?: number;
  issue: string;
  algorithmicConsequence?: string;
  evidence: string[];
  doThis: string;
  example: string;
  whyItMatters: string;
}

export interface RoastResult {
  id: string;
  tiktokUrl: string;
  platform?: 'tiktok' | 'reels';
  overallScore: number;
  verdict: string;
  viralPotential?: number;
  /** e.g. "top 30% of fitness creators" - generated from niche benchmark scoring */
  nichePercentile?: string;
  holdAssessment?: {
    holdBand: 'weak' | 'mixed' | 'strong';
    riskBand: 'high' | 'medium' | 'low';
    headline: string;
    summary: string;
    reasons: string[];
  };
  firstFiveSecondsDiagnosis?: {
    verdict: 'working' | 'fragile' | 'failing';
    hookRead: string;
    likelyDropWindow: string;
    retentionRisk: string;
    nextTimeFix: string;
    evidence: string[];
  };
  biggestBlocker?: string;
  nextSteps?: string[];
  actionPlan?: ActionPlanStep[];
  encouragement?: string;
  analysisMode?: 'hook-first' | 'balanced';
  analysisExpansion?: 'hook_only' | 'extended_10s' | 'full_video';
  hookSummary?: {
    score: number;
    strength: 'weak' | 'mixed' | 'strong';
    headline: string;
    distributionRisk: string;
    focusNote: string;
    /** Plain-english explanation of WHY distribution dies early - shown in hook gate banner */
    earlyDropNote?: string;
  };
  hookAnalysis?: HookAnalysis;
  hookPredictions?: HookPredictionSummary;
  fixTracks?: HookFixTracks;
  agents: AgentRoast[];
  niche?: {
    detected: string;
    subNiche: string | null;
    confidence: 'high' | 'medium' | 'low';
  };
  audioTranscript?: string;
  audioSegments?: Array<{ start: number; end: number; text: string }>;
  /** 0-1 confidence score for transcript quality. <0.5 means partial/degraded. */
  transcriptConfidence?: number;
  /** Explicit transcript usability state exposed to the UI/result payload. */
  transcriptQuality?: 'usable' | 'degraded' | 'unavailable';
  /** Plain-English explanation of how transcript reliability affected the analysis. */
  transcriptQualityNote?: string;
  /** Which provider produced the transcript (assemblyai, whisper, or claude-audio fallback). */
  transcriptProvider?: 'assemblyai' | 'whisper' | 'claude-audio';
  /** Sound detected from the TikTok video URL (Phase 1 - free HTML extraction) */
  viewProjection?: ViewProjection;
  hookIdentification?: HookIdentification;
  detectedSound?: {
    name: string;
    author: string;
    isOriginal: boolean;
    soundUrl: string | null;
    musicId: string | null;
  } | null;
  metadata: {
    duration: number;
    description: string;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    hashtags?: string[];
  };
}
