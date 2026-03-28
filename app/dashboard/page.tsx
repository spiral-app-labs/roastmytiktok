'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import UploadUI from '@/components/UploadUI'
import { getHistory, HistoryEntry } from '@/lib/history'
import { AGENTS } from '@/lib/agents'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    async function checkAccess() {
      // Check sub bypass cookie
      try {
        const bypassRes = await fetch('/api/sub-bypass/check')
        const bypassData = await bypassRes.json()
        if (bypassData.subBypassed) {
          setAuthorized(true)
          setChecking(false)
          return
        }
      } catch {
        // ignore
      }

      // Check Supabase session
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setAuthorized(true)
        setUserEmail(session.user.email ?? null)
        setChecking(false)
        return
      }

      // Neither — redirect to login
      router.push('/login?redirect=/dashboard')
    }

    checkAccess()
  }, [router])

  useEffect(() => {
    if (authorized) {
      setHistory(getHistory())
    }
  }, [authorized])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (checking) {
    return <main className="min-h-screen bg-[#080808]" />
  }

  if (!authorized) {
    return null
  }

  const totalRoasts = history.length
  const avgScore = totalRoasts > 0
    ? Math.round(history.reduce((sum, h) => sum + h.overallScore, 0) / totalRoasts)
    : 0
  const bestScore = totalRoasts > 0
    ? Math.max(...history.map(h => h.overallScore))
    : 0

  // Find weakest dimension across all roasts
  const dimTotals: Record<string, { sum: number; count: number }> = {}
  for (const entry of history) {
    for (const [dim, score] of Object.entries(entry.agentScores)) {
      if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
      dimTotals[dim].sum += score
      dimTotals[dim].count++
    }
  }
  const weakestDim = Object.entries(dimTotals)
    .map(([dim, { sum, count }]) => ({ dim, avg: Math.round(sum / count) }))
    .sort((a, b) => a.avg - b.avg)[0]

  const tips = [
    { icon: '🎯', title: 'Hook in 0.5 seconds', desc: 'Start with movement, a bold claim, or direct eye contact. No slow intros.' },
    { icon: '💡', title: 'Light your face', desc: 'Face a window or use a ring light. Dark faces = instant scroll.' },
    { icon: '🔤', title: 'Add captions always', desc: 'Captions boost watch time by 40%. Use large, high-contrast text.' },
    { icon: '🎵', title: 'Use trending sounds', desc: 'Videos with trending audio get 2-3x more FYP impressions.' },
  ]

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Dashboard header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <span className="font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            RoastMyTikTok
          </span>
        </div>
        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="text-sm text-zinc-500">{userEmail}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-4 py-1.5 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Stats Overview */}
        {totalRoasts > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Roasts</p>
              <p className="text-3xl font-bold text-white">{totalRoasts}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Score</p>
              <p className="text-3xl font-bold text-white">{avgScore}<span className="text-lg text-zinc-500">/100</span></p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Best Score</p>
              <p className="text-3xl font-bold text-green-400">{bestScore}<span className="text-lg text-zinc-500">/100</span></p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Weakest Area</p>
              <p className="text-xl font-bold text-orange-400">
                {weakestDim ? `${AGENTS.find(a => a.key === weakestDim.dim)?.name ?? weakestDim.dim}` : '—'}
              </p>
              {weakestDim && (
                <p className="text-xs text-zinc-500 mt-0.5">avg {weakestDim.avg}/100</p>
              )}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <UploadUI />

        {/* Recent Roasts */}
        {history.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recent Analyses</h2>
              <Link href="/history" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {history.slice(0, 5).map((entry) => (
                <Link
                  key={entry.id}
                  href={`/roast/${entry.id}`}
                  className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 hover:border-orange-500/30 rounded-xl p-4 transition-colors group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${
                    entry.overallScore >= 70 ? 'bg-green-500/20 text-green-400' :
                    entry.overallScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {entry.overallScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {entry.filename || 'TikTok Analysis'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {entry.verdict.slice(0, 80)}...
                    </p>
                  </div>
                  <div className="text-xs text-zinc-600 shrink-0">
                    {new Date(entry.date).toLocaleDateString()}
                  </div>
                  <span className="text-zinc-600 group-hover:text-orange-400 transition-colors">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quick Tips */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Quick Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tips.map((tip) => (
              <div key={tip.title} className="flex items-start gap-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4">
                <span className="text-2xl shrink-0">{tip.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{tip.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
