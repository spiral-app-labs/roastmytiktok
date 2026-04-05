export type DimensionKey = 'hook' | 'visual' | 'caption' | 'audio' | 'algorithm' | 'authenticity' | 'conversion' | 'accessibility';

export interface AgentDef {
  key: DimensionKey;
  emoji: string;
  name: string;
  oneLiner: string;
  analyzes: string;
}

export interface AgentRoast {
  agent: DimensionKey;
  score: number;
  roastText: string;
  findings: string[];
  improvementTip: string;
  timestamp_seconds?: number;
}

export interface ActionPlanStep {
  priority: 'P1' | 'P2' | 'P3';
  dimension: DimensionKey;
  issue: string;
  evidence: string[];
  doThis: string;
  example: string;
  whyItMatters: string;
}

export interface RoastResult {
  id: string;
  tiktokUrl: string;
  overallScore: number;
  verdict: string;
  viralPotential?: number;
  /** e.g. "top 30% of fitness creators" — generated from niche benchmark scoring */
  nichePercentile?: string;
  holdAssessment?: {
    holdBand: 'weak' | 'mixed' | 'strong';
    riskBand: 'high' | 'medium' | 'low';
    headline: string;
    summary: string;
    reasons: string[];
  };
  biggestBlocker?: string;
  nextSteps?: string[];
  actionPlan?: ActionPlanStep[];
  encouragement?: string;
  analysisMode?: 'hook-first' | 'balanced';
  hookSummary?: {
    score: number;
    strength: 'weak' | 'mixed' | 'strong';
    headline: string;
    distributionRisk: string;
    focusNote: string;
    /** Plain-english explanation of WHY distribution dies early — shown in hook gate banner */
    earlyDropNote?: string;
  };
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
  /** Sound detected from the TikTok video URL (Phase 1 — free HTML extraction) */
  detectedSound?: {
    name: string;
    author: string;
    isOriginal: boolean;
    soundUrl: string | null;
    musicId: string | null;
  } | null;
  metadata: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    duration: number;
    hashtags: string[];
    description: string;
  };
}
