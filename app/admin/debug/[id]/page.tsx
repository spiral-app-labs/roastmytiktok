import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin'
import { supabaseServer } from '@/lib/supabase-server'
import RmtDebugClient from './DebugClient'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ debug?: string }>
}

export default async function RmtAdminDebugPage({ params, searchParams }: Props) {
  const { id } = await params
  const { debug: debugLevel } = await searchParams

  // Auth check - admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!isAdminUser(user)) {
    redirect('/404')
  }

  const level = (['simple', 'complex', 'extremely_verbose'].includes(debugLevel ?? '') ? debugLevel : 'complex') as 'simple' | 'complex' | 'extremely_verbose'

  // Fetch session from Supabase
  const { data: session, error } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('overall_score, verdict, agent_scores, findings, result_json')
    .eq('id', id)
    .single()

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950 text-red-400 font-mono p-8">
        <h1 className="text-lg font-bold mb-4">RMT Debug Viewer - Not Found</h1>
        <p>No session found for id: <code>{id}</code></p>
        <p className="text-gray-500 mt-2 text-sm">{error?.message}</p>
      </div>
    )
  }

  const agentScores = session.agent_scores as Record<string, number> | null ?? {}
  const findings = session.findings as Record<string, string[]> | null ?? {}
  const resultJson = session.result_json as {
    agents?: Array<{ agent: string; score: number; findings: string[]; improvementTip: string; roastText: string }>
    niche?: { detected: string; subNiche: string; confidence: number }
    hookSummary?: unknown
    actionPlan?: unknown[]
    analysisMode?: string
    viralPotential?: number
    audioTranscript?: string
    audioSegments?: unknown[]
    metadata?: { duration?: number }
  } | null ?? {}

  const dimensionScores: Record<string, number> = { ...agentScores }
  const topFindingPerDimension: Record<string, string> = {}
  for (const [dim, arr] of Object.entries(findings)) {
    topFindingPerDimension[dim] = Array.isArray(arr) ? arr[0] ?? 'no findings' : 'no findings'
  }

  const agentRawResults: Record<string, { score: number; roastText: string; findings: string[]; improvementTip: string }> = {}
  if (resultJson?.agents) {
    for (const a of resultJson.agents) {
      agentRawResults[a.agent] = {
        score: a.score,
        roastText: a.roastText,
        findings: a.findings ?? [],
        improvementTip: a.improvementTip ?? '',
      }
    }
  }

  const debugData = {
    level,
    simple: {
      dimensionScores,
      topFindingPerDimension,
      overallScore: session.overall_score ?? 0,
      viralPotential: resultJson?.viralPotential ?? 0,
      analysisMode: resultJson?.analysisMode ?? 'balanced',
    },
    ...(level === 'complex' || level === 'extremely_verbose' ? {
      complex: {
        agentRawResults,
        niche: resultJson?.niche ?? { detected: 'unknown', subNiche: '', confidence: 'low' },
        hookSummary: resultJson?.hookSummary ?? null,
        actionPlan: resultJson?.actionPlan ?? [],
        frameCount: 0,
        videoDurationSeconds: resultJson?.metadata?.duration ?? 0,
      },
    } : {}),
    ...(level === 'extremely_verbose' ? {
      verbose: {
        transcript: resultJson?.audioTranscript ?? null,
        audioSegments: resultJson?.audioSegments ?? [],
        timingMs: {},
        errors: [],
        frameMetadata: [],
      },
    } : {}),
  }

  return <RmtDebugClient id={id} debugData={debugData} />
}
