export type DimensionKey = 'hook' | 'visual' | 'caption' | 'audio' | 'algorithm' | 'authenticity' | 'conversion' | 'accessibility' | 'caption_quality';

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
  };
  agents: AgentRoast[];
  niche?: {
    detected: string;
    subNiche: string | null;
    confidence: 'high' | 'medium' | 'low';
  };
  audioTranscript?: string;
  audioSegments?: Array<{ start: number; end: number; text: string }>;
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
