/**
 * Debug types for RMT admin debug mode.
 * Safe to import in both server and client components.
 */

import type { AgentRoast } from '@/lib/types'

/**
 * Debug levels available to admin users via Settings.
 * - off: no debug data collected or returned
 * - simple: summary scores + top finding per agent + video metadata summary
 * - complex: all agent results with full findings, frame extraction metadata, timing per agent
 * - extremely_verbose: everything in complex + raw AI responses, token counts, video technical data, errors
 */
export type DebugLevel = 'off' | 'simple' | 'complex' | 'extremely_verbose'

export interface DebugData {
  level: Exclude<DebugLevel, 'off'>
  /** Summary: agent scores + top finding per agent + video metadata summary */
  simple: {
    agentScores: Record<string, number>
    topFindingPerAgent: Record<string, string>
    videoMetaSummary: {
      durationSeconds: number
      niche: string
      analysisMode: string
    }
  }
  /** All agent results with full findings, frame extraction metadata, timing per agent */
  complex?: {
    allAgentResults: AgentRoast[]
    frameCount: number
    transcriptAvailable: boolean
    captionQualityScore: number | null
    timingPerAgent: Record<string, number>
    nicheDetection: {
      niche: string
      subNiche: string | null
      confidence: string
    }
    hookSummary: {
      score: number
      strength: string
      headline: string
    } | null
    overallScore: number
    viralPotential: number
  }
  /** All of complex + raw AI responses, token counts, video technical data, all errors */
  verbose?: {
    rawAgentResponses: Record<string, string>
    videoTechnicalData: {
      durationSeconds: number
      fileSizeBytes: number | null
      framesExtracted: number
    }
    audioTranscript: string | null
    audioSegments: Array<{ start: number; end: number; text: string }> | null
    transcriptQuality: 'usable' | 'degraded' | 'unavailable' | null
    transcriptQualityNote: string | null
    actionPlan: unknown[]
    errors: string[]
    allTimings: Record<string, number>
  }
}
