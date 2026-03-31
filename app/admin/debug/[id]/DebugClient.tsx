'use client'

import { useState, useCallback } from 'react'

type DebugLevel = 'simple' | 'complex' | 'extremely_verbose'

interface RmtDebugData {
  level: DebugLevel
  simple: {
    dimensionScores: Record<string, number>
    topFindingPerDimension: Record<string, string>
    overallScore: number
    viralPotential: number
    analysisMode: string
  }
  complex?: {
    agentRawResults: Record<string, { score: number; roastText: string; findings: string[]; improvementTip: string }>
    niche: { detected: string; subNiche: string; confidence: string | number }
    hookSummary: unknown
    actionPlan: unknown[]
    frameCount: number
    videoDurationSeconds: number
  }
  verbose?: {
    transcript: string | null
    audioSegments: unknown[]
    timingMs: Record<string, number>
    errors: string[]
    frameMetadata: unknown[]
  }
}

type Tab = 'simple' | 'complex' | 'extremely_verbose'

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-700 rounded mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 hover:bg-gray-700 text-left text-sm font-mono text-green-400"
      >
        <span>{open ? '▼' : '▶'} {title}</span>
      </button>
      {open && <div className="p-4 bg-gray-900">{children}</div>}
    </div>
  )
}

function JsonBlock({ data, label }: { data: unknown; label?: string }) {
  const [copied, setCopied] = useState(false)
  const text = JSON.stringify(data, null, 2)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])

  return (
    <div className="relative">
      {label && <div className="text-xs text-gray-400 mb-1 font-mono">{label}</div>}
      <button
        onClick={copy}
        className="absolute top-2 right-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
      >
        {copied ? '✓ copied' : 'copy'}
      </button>
      <pre className="bg-gray-950 text-green-300 text-xs font-mono p-4 rounded overflow-auto max-h-96 border border-gray-700 whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : score >= 40 ? 'text-orange-400' : 'text-red-400'
  return <span className={`font-mono font-bold ${color}`}>{score}/100</span>
}

interface DebugClientProps {
  id: string
  debugData: RmtDebugData
}

export default function RmtDebugClient({ id, debugData }: DebugClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('simple')
  const [search, setSearch] = useState('')

  const tabs: { id: Tab; label: string; available: boolean }[] = [
    { id: 'simple', label: 'Simple', available: true },
    { id: 'complex', label: 'Complex', available: !!debugData.complex },
    { id: 'extremely_verbose', label: 'Extremely Verbose', available: !!debugData.verbose },
  ]

  const { simple, complex, verbose } = debugData
  const filterText = search.toLowerCase()
  const matchesSearch = (str: string) => !filterText || str.toLowerCase().includes(filterText)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">🎬 RMT Debug Viewer</h1>
            <div className="text-sm text-gray-400 mt-1">
              session: <span className="text-yellow-400">{id}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            level: <span className="text-green-400">{debugData.level}</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-800 px-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => tab.available && setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-green-400 text-green-400'
                : tab.available
                ? 'border-transparent text-gray-400 hover:text-gray-200'
                : 'border-transparent text-gray-700 cursor-not-allowed'
            }`}
          >
            {tab.label}{!tab.available && ' (no data)'}
          </button>
        ))}
      </div>

      <div className="px-6 py-3 border-b border-gray-800">
        <input
          type="text"
          placeholder="filter / search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 text-gray-100 text-sm font-mono px-3 py-1.5 rounded border border-gray-700 focus:border-green-400 outline-none w-64"
        />
      </div>

      <div className="px-6 py-4 space-y-4">

        {activeTab === 'simple' && (
          <>
            <Collapsible title="Overall Summary" defaultOpen>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400">overall score</div>
                  <ScoreBadge score={simple.overallScore} />
                </div>
                <div>
                  <div className="text-xs text-gray-400">viral potential</div>
                  <ScoreBadge score={simple.viralPotential} />
                </div>
                <div>
                  <div className="text-xs text-gray-400">analysis mode</div>
                  <span className="text-yellow-300">{simple.analysisMode}</span>
                </div>
              </div>
            </Collapsible>

            <Collapsible title="Dimension Scores" defaultOpen>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(simple.dimensionScores)
                  .filter(([k]) => matchesSearch(k))
                  .map(([dim, score]) => (
                  <div key={dim} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded">
                    <span className="text-sm text-gray-300">{dim}</span>
                    <ScoreBadge score={score} />
                  </div>
                ))}
              </div>
            </Collapsible>

            <Collapsible title="Top Finding per Dimension" defaultOpen>
              <div className="space-y-2">
                {Object.entries(simple.topFindingPerDimension)
                  .filter(([k, v]) => matchesSearch(k) || matchesSearch(v))
                  .map(([dim, finding]) => (
                  <div key={dim} className="bg-gray-800 px-3 py-2 rounded">
                    <div className="text-xs text-gray-400 mb-0.5">{dim}</div>
                    <div className="text-sm text-gray-200">{finding}</div>
                  </div>
                ))}
              </div>
            </Collapsible>
          </>
        )}

        {activeTab === 'complex' && complex && (
          <>
            <Collapsible title="Video Metadata" defaultOpen>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400">frame count</div>
                  <div className="text-yellow-300">{complex.frameCount}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">duration</div>
                  <div className="text-yellow-300">{complex.videoDurationSeconds}s</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">niche</div>
                  <div className="text-yellow-300">{complex.niche.detected}{complex.niche.subNiche ? ` / ${complex.niche.subNiche}` : ''}</div>
                </div>
              </div>
            </Collapsible>

            <Collapsible title="Agent Raw Results (all dimensions)">
              <div className="space-y-3">
                {Object.entries(complex.agentRawResults)
                  .filter(([k]) => matchesSearch(k))
                  .map(([dim, r]) => (
                  <Collapsible key={dim} title={`${dim} — ${r.score}/100`}>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-200">{r.roastText}</div>
                      <div className="text-xs text-gray-400 mt-2">Findings:</div>
                      <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                        {r.findings.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                      <div className="text-xs text-gray-400 mt-2">Improvement tip:</div>
                      <div className="text-sm text-green-300">{r.improvementTip}</div>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </Collapsible>

            <Collapsible title="Hook Summary">
              <JsonBlock data={complex.hookSummary} />
            </Collapsible>

            <Collapsible title="Action Plan (full)">
              <JsonBlock data={complex.actionPlan} />
            </Collapsible>

            <Collapsible title="Niche Detection">
              <JsonBlock data={complex.niche} />
            </Collapsible>
          </>
        )}

        {activeTab === 'extremely_verbose' && verbose && (
          <>
            {verbose.errors.length > 0 && (
              <Collapsible title={`Errors (${verbose.errors.length})`} defaultOpen>
                {verbose.errors.map((e, i) => (
                  <div key={i} className="text-red-400 text-sm font-mono">{e}</div>
                ))}
              </Collapsible>
            )}

            <Collapsible title="Audio Transcript" defaultOpen>
              {verbose.transcript
                ? <pre className="text-sm text-gray-200 whitespace-pre-wrap">{verbose.transcript}</pre>
                : <span className="text-gray-500">No transcript available</span>
              }
            </Collapsible>

            <Collapsible title={`Audio Segments (${(verbose.audioSegments as unknown[]).length})`}>
              <JsonBlock data={verbose.audioSegments} />
            </Collapsible>

            <Collapsible title={`Frame Metadata (${(verbose.frameMetadata as unknown[]).length} frames)`}>
              <JsonBlock data={verbose.frameMetadata} />
            </Collapsible>

            {Object.keys(verbose.timingMs).length > 0 && (
              <Collapsible title="Timing Data" defaultOpen>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {Object.entries(verbose.timingMs)
                    .filter(([k]) => matchesSearch(k))
                    .map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-gray-400">{k}</div>
                      <div className="text-yellow-300">{v}ms</div>
                    </div>
                  ))}
                </div>
              </Collapsible>
            )}
          </>
        )}

      </div>
    </div>
  )
}
