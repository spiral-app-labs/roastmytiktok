'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const ScoreTrendChart = dynamic(() => import('@/components/charts/ScoreTrendChart'), { ssr: false })
import { createClient } from '@/lib/supabase/client'
import { getHistory, getSessionId, HistoryEntry } from '@/lib/history'
import { AGENTS } from '@/lib/agents'
import { ScoreRing } from '@/components/ScoreRing'
import { GlassCard, GradientButton, EmptyState } from '@/components/ui'

/* ─── quick tips ─── */
const TIPS = [
  { emoji: '🎣', title: 'Hook in 1 second', body: 'Top creators open with motion, a question, or a pattern interrupt — not a slow intro.' },
  { emoji: '💡', title: 'Fix your lighting', body: 'Natural window light or a ring light instantly makes your video look 10x more professional.' },
  { emoji: '🎵', title: 'Use trending audio', body: 'Videos with trending sounds get 2-3x more FYP distribution. Check the TikTok sound library.' },
  { emoji: '📝', title: 'Captions = retention', body: '80% of TikTok is watched on mute. Bold, readable captions keep people watching.' },
  { emoji: '⏰', title: 'Post at peak hours', body: 'Best times: 7-9am, 12-3pm, 7-11pm in your audience\'s timezone.' },
  { emoji: '🔁', title: 'Loop your videos', body: 'End your video where it begins. Seamless loops trick the algorithm into counting re-watches.' },
]

/* ─── helpers ─── */
function getLetterGrade(score: number) {
  if (score >= 90) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 80) return 'A-'
  if (score >= 75) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 65) return 'B-'
  if (score >= 60) return 'C+'
  if (score >= 55) return 'C'
  if (score >= 50) return 'C-'
  if (score >= 45) return 'D+'
  if (score >= 40) return 'D'
  return 'F'
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function trendArrow(current: number, previous: number) {
  const diff = current - previous
  if (diff > 0) return { icon: '↑', color: 'text-green-400', label: `+${diff}` }
  if (diff < 0) return { icon: '↓', color: 'text-red-400', label: `${diff}` }
  return { icon: '→', color: 'text-zinc-400', label: '0' }
}

/* ─── stat card ─── */
function StatCard({ label, value, sub, delay = 0 }: { label: string; value: React.ReactNode; sub?: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <GlassCard variant="surface" className="p-5">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{label}</p>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
      </GlassCard>
    </motion.div>
  )
}

/* ─── custom tooltip ─── */
/* ─── upload area ─── */
function UploadArea() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setError(null)
    if (f.size > 500 * 1024 * 1024) { setError('File too large. Max 500MB.'); return }
    if (!f.type.startsWith('video/')) { setError('Please upload a video file.'); return }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const clearFile = () => {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!file || loading) return
    setLoading(true); setStatus('Preparing upload...')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          sessionId: getSessionId(),
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Upload failed') }

      const { id, signedUrl, contentType } = await res.json()

      setStatus('Uploading video...')
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType || file.type || 'video/mp4',
          'x-upsert': 'false',
        },
        body: file,
      })

      if (!uploadRes.ok) throw new Error('Video upload failed')

      setStatus('Starting analysis...')
      router.push(`/analyze/${id}?source=upload&filename=${encodeURIComponent(file.name)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setLoading(false); setStatus(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <GlassCard variant="surface" className="p-6 card-glow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl fire-gradient flex items-center justify-center text-lg">🎬</div>
          <div>
            <h2 className="text-lg font-bold text-white">Upload New Video</h2>
            <p className="text-xs text-zinc-500">Get your TikTok roasted by 6 AI agents</p>
          </div>
        </div>

        {!file ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all text-center ${
              dragOver
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-zinc-700 hover:border-orange-500/50 hover:bg-zinc-800/40'
            }`}
          >
            <div className="text-4xl mb-3">📤</div>
            <p className="text-zinc-200 font-semibold">Drop your video here</p>
            <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
            <p className="text-zinc-600 text-xs mt-2">mp4, mov, avi &middot; max 500MB</p>
          </div>
        ) : (
          <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 flex items-center gap-4">
            {previewUrl && (
              <video src={previewUrl} className="w-20 h-20 object-cover rounded-lg shrink-0" muted />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{file.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button onClick={clearFile} className="text-zinc-500 hover:text-red-400 transition-colors text-lg shrink-0">✕</button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        {status && (
          <p className="text-orange-400 text-sm mt-3 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {status}
          </p>
        )}

        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        <GradientButton
          variant="primary"
          size="lg"
          className="w-full mt-4"
          onClick={handleSubmit}
          disabled={loading || !file}
          loading={loading}
        >
          {loading ? 'Uploading...' : 'Roast My Video'}
        </GradientButton>
      </GlassCard>
    </motion.div>
  )
}

/* ─── main page ─── */
export default function DashboardPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length))

  useEffect(() => {
    async function checkAccess() {
      try {
        const bypassRes = await fetch('/api/bypass/check')
        const bypassData = await bypassRes.json()
        if (bypassData.bypassed) {
          setHistory(getHistory())
          setAuthorized(true)
          setChecking(false)
          return
        }
      } catch { /* ignore */ }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setHistory(getHistory())
        setAuthorized(true)
        setUserEmail(session.user.email ?? null)
        setChecking(false)
        return
      }
      router.push('/login?redirect=/dashboard')
    }
    checkAccess()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (checking) return <main className="min-h-screen bg-[#080808]" />
  if (!authorized) return null

  /* ─── compute stats ─── */
  const totalRoasts = history.length
  const avgScore = totalRoasts > 0 ? Math.round(history.reduce((s, h) => s + h.overallScore, 0) / totalRoasts) : 0
  const bestScore = totalRoasts > 0 ? Math.max(...history.map(h => h.overallScore)) : 0

  const trend = totalRoasts >= 2
    ? trendArrow(history[0].overallScore, history[1].overallScore)
    : null

  /* chart data — last 10 roasts in chronological order */
  const chartData = history
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({
      label: `#${i + 1}`,
      score: h.overallScore,
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))

  /* weakest dimension across all roasts */
  const dimTotals: Record<string, { sum: number; count: number }> = {}
  for (const entry of history) {
    for (const [dim, score] of Object.entries(entry.agentScores)) {
      if (!dimTotals[dim]) dimTotals[dim] = { sum: 0, count: 0 }
      dimTotals[dim].sum += score
      dimTotals[dim].count++
    }
  }
  const weakest = Object.entries(dimTotals).sort((a, b) => (a[1].sum / a[1].count) - (b[1].sum / b[1].count))[0]
  const weakestAgent = weakest ? AGENTS.find(a => a.key === weakest[0]) : null
  const weakestAvg = weakest ? Math.round(weakest[1].sum / weakest[1].count) : 0

  const recentRoasts = history.slice(0, 6)
  const visibleTips = [TIPS[tipIndex], TIPS[(tipIndex + 1) % TIPS.length], TIPS[(tipIndex + 2) % TIPS.length]]

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔥</span>
          <div>
            <span className="font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              Dashboard
            </span>
            {userEmail && <p className="text-xs text-zinc-600">{userEmail}</p>}
          </div>
        </div>
        <GradientButton
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="border border-zinc-800 hover:border-zinc-600"
        >
          Sign out
        </GradientButton>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:px-8 space-y-8">

        {/* ─── Welcome + Stats ─── */}
        {totalRoasts === 0 ? (
          /* Empty state — first time user */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EmptyState
              icon={
                <motion.span
                  animate={{ scale: [1, 1.1, 1], rotate: [-5, 5, -5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-block"
                >
                  🔥
                </motion.span>
              }
              title="Ready to get roasted?"
              description="Upload your first TikTok and 6 AI agents will tear it apart — brutally, accurately, and with your growth in mind."
            />
            <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-400 mb-8">
              {[
                { emoji: '🎣', text: 'Hook analysis' },
                { emoji: '🎥', text: 'Visual critique' },
                { emoji: '🎵', text: 'Audio review' },
                { emoji: '🤖', text: 'Algorithm audit' },
                { emoji: '💬', text: 'Caption check' },
                { emoji: '✨', text: 'Authenticity score' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded-full px-3 py-1.5">
                  <span>{item.emoji}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-zinc-600 text-xs text-center">Upload a video below to get started →</p>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Your Roast Dashboard</h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {totalRoasts} video{totalRoasts !== 1 ? 's' : ''} roasted
                  {trend && (
                    <span className={`ml-2 ${trend.color}`}>{trend.icon} {trend.label} from last roast</span>
                  )}
                </p>
              </div>
            </motion.div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Roasts" value={totalRoasts} delay={0} />
              <StatCard
                label="Average Score"
                value={
                  <span className={scoreColor(avgScore)}>
                    {avgScore}<span className="text-base text-zinc-500">/100</span>
                  </span>
                }
                sub={`Grade: ${getLetterGrade(avgScore)}`}
                delay={0.05}
              />
              <StatCard
                label="Best Score"
                value={<span className="text-green-400">{bestScore}</span>}
                delay={0.1}
              />
              <StatCard
                label="Weakest Area"
                value={
                  weakestAgent ? (
                    <span className="flex items-center gap-2">
                      <span>{weakestAgent.emoji}</span>
                      <span className={scoreColor(weakestAvg)}>{weakestAvg}</span>
                    </span>
                  ) : '—'
                }
                sub={weakestAgent?.name}
                delay={0.15}
              />
            </div>
          </>
        )}

        {/* ─── Main Grid: Upload + Chart/Tips ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload — takes 3 cols */}
          <div className="lg:col-span-3">
            <UploadArea />
          </div>

          {/* Right column — chart + tips */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Trend Chart */}
            {chartData.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <GlassCard variant="surface" className="p-5">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4">Score Trend</h3>
                  <div className="h-40">
                    <ScoreTrendChart data={chartData} />
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Quick Tips */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard variant="surface" className="p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Quick Tips</h3>
                <div className="space-y-3">
                  {visibleTips.map((tip, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-lg shrink-0 mt-0.5">{tip.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{tip.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{tip.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>

        {/* ─── Account Analysis CTA ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Link href="/analyze-account" className="block group">
            <GlassCard variant="interactive" className="p-6 flex items-center gap-5">
              <span className="text-3xl shrink-0">📊</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">Analyze Your Full TikTok Account</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Connect your TikTok handle and get AI analysis across all your videos — spot patterns, find your weakest areas, and get custom content ideas.</p>
              </div>
              <span className="text-zinc-600 group-hover:text-orange-400 transition-colors text-xl shrink-0">→</span>
            </GlassCard>
          </Link>
        </motion.div>

        {/* ─── Recent Roast History ─── */}
        {recentRoasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recent Roasts</h2>
              <Link href="/history" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                View all →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentRoasts.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <Link href={`/roast/${entry.id}`} className="block">
                    <GlassCard variant="interactive" className="p-5 group">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300 font-medium truncate group-hover:text-white transition-colors">
                            {entry.filename || 'Untitled video'}
                          </p>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <ScoreRing score={entry.overallScore} size={48} />
                      </div>

                      {/* Agent score row */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {Object.entries(entry.agentScores).map(([dim, score]) => {
                          const agent = AGENTS.find(a => a.key === dim)
                          return (
                            <span key={dim} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/80 text-xs text-zinc-400">
                              <span>{agent?.emoji}</span>
                              <span>{score}</span>
                            </span>
                          )
                        })}
                      </div>

                      {entry.verdict && (
                        <p className="text-xs text-zinc-500 italic line-clamp-2">&ldquo;{entry.verdict}&rdquo;</p>
                      )}
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
