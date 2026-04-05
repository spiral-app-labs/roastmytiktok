'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, animate as fmAnimate } from 'framer-motion'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { getHistory, getChronicIssues, getFixedIssues, HistoryEntry } from '@/lib/history'
import { AGENTS } from '@/lib/agents'
import { ScoreRing } from '@/components/ScoreRing'
import { GlassCard, GradientButton, EmptyState } from '@/components/ui'
import UploadQueueUI from '@/components/UploadQueueUI'

const ScoreTrendChart = dynamic(() => import('@/components/charts/ScoreTrendChart'), { ssr: false })

/* ─── fix suggestions per dimension ─── */
const FIX_SUGGESTIONS: Record<string, string> = {
  hook: 'Open with motion, a bold question, or an unexpected visual. No slow intros.',
  visual: 'Film near a bright window or add a ring light. Huge ROI for minimal effort.',
  caption: 'Use bold, high-contrast text. Test readability on a small phone screen.',
  audio: 'Record in a quiet room or get a lapel mic. Clear audio = longer watch time.',
  algorithm: 'Use trending sounds, post at peak hours, and audit your hashtags.',
  authenticity: 'Drop the performance. Talk to one person, not a camera.',
  conversion: 'End with ONE clear CTA: follow, comment, or tap link in bio.',
  accessibility: 'Add manual captions and high-contrast text. Half your audience is on mute.',
}

/* ─── helpers ─── */
function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

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

/* ─── animated counter ─── */
function AnimatedNumber({ to, duration = 0.8, suffix = '' }: { to: number; duration?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const controls = fmAnimate(0, to, {
      duration,
      ease: 'easeOut',
      onUpdate(v: number) {
        if (ref.current) ref.current.textContent = Math.round(v) + suffix
      },
    })
    return () => controls.stop()
  }, [to, duration, suffix])
  return <span ref={ref}>0{suffix}</span>
}

/* ─── hero stat card ─── */
function HeroStatCard({
  label, value, sub, accent = false, delay = 0,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  accent?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="h-full"
    >
      <GlassCard variant={accent ? 'highlighted' : 'surface'} className="p-5 h-full flex flex-col justify-between gap-2">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        <div className="text-3xl font-bold text-white leading-none">{value}</div>
        {sub && <p className="text-xs text-zinc-500">{sub}</p>}
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
  const [selectedDim, setSelectedDim] = useState<string | null>(null)

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

  /* ─── computed stats ─── */
  const totalRoasts = history.length
  const avgScore = totalRoasts > 0
    ? Math.round(history.reduce((s, h) => s + h.overallScore, 0) / totalRoasts)
    : 0
  const bestScore = totalRoasts > 0 ? Math.max(...history.map(h => h.overallScore)) : 0
  const recentTrend = totalRoasts >= 2 ? history[0].overallScore - history[1].overallScore : 0

  /* per-dimension improvement: oldest score vs newest score */
  const dimImprovements = AGENTS.map(agent => {
    const scores = history
      .filter(h => agent.key in h.agentScores)
      .map(h => ({ score: (h.agentScores as Record<string, number>)[agent.key], date: h.date }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (scores.length < 2) return null
    const earliest = scores[0].score
    const latest = scores[scores.length - 1].score
    return { ...agent, delta: latest - earliest, latest, earliest }
  }).filter((d): d is NonNullable<typeof d> => d !== null)
  dimImprovements.sort((a, b) => b.delta - a.delta)

  const mostImproved = dimImprovements.find(d => d.delta > 0)
  const chronicIssues = getChronicIssues(history)
  const fixedIssues = totalRoasts >= 2 ? getFixedIssues(history[0].findings, history) : []

  /* chart data — last 10 in chronological order, optionally filtered by dimension */
  const chartData = history
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({
      label: `#${i + 1}`,
      score: selectedDim
        ? ((h.agentScores as Record<string, number>)[selectedDim] ?? 0)
        : h.overallScore,
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))

  const recentRoasts = history.slice(0, 6)
  const hasInsights = dimImprovements.length > 0 || chronicIssues.length > 0

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251,146,60,0.10), transparent)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 85% 100%, rgba(236,72,153,0.07), transparent)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-900/80">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔥</span>
          <div>
            <span className="font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              Go Viral Dashboard
            </span>
            {userEmail && <p className="text-xs text-zinc-600">{userEmail}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/analyze-account" className="hidden sm:block">
            <GradientButton variant="ghost" size="sm" className="border border-zinc-800 hover:border-zinc-600">
              📊 Account Analysis
            </GradientButton>
          </Link>
          <GradientButton
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="border border-zinc-800 hover:border-zinc-600"
          >
            Sign out
          </GradientButton>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:px-8 space-y-10">

        {/* ─── Empty state ─── */}
        {totalRoasts === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
              description="Upload your first TikTok and 8 AI agents will tear it apart — brutally, accurately, and with your growth in mind."
            />
            <div className="flex flex-wrap justify-center gap-3 text-sm text-zinc-400 mb-10">
              {AGENTS.map(a => (
                <div key={a.key} className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded-full px-3 py-1.5">
                  <span>{a.emoji}</span>
                  <span>{a.name.replace(' Agent', '')}</span>
                </div>
              ))}
            </div>
            <div className="max-w-2xl mx-auto">
              <UploadQueueUI />
            </div>
          </motion.div>
        ) : (
          <>
            {/* ─── Page title ─── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Your Growth Story</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {totalRoasts} video{totalRoasts !== 1 ? 's' : ''} analyzed
                {recentTrend !== 0 && (
                  <span className={`ml-2 font-medium ${recentTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {recentTrend > 0 ? '↑' : '↓'} {Math.abs(recentTrend)} pts from last roast
                  </span>
                )}
              </p>
            </motion.div>

            {/* ─── Hero stat cards ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <HeroStatCard
                label="Total Roasts"
                value={<AnimatedNumber to={totalRoasts} />}
                sub="videos analyzed"
                delay={0}
              />
              <HeroStatCard
                label="Average Score"
                value={
                  <span className={scoreColor(avgScore)}>
                    <AnimatedNumber to={avgScore} />
                    <span className="text-xl text-zinc-600">/100</span>
                  </span>
                }
                sub={`Grade: ${getLetterGrade(avgScore)}`}
                accent={avgScore >= 70}
                delay={0.06}
              />
              <HeroStatCard
                label="Best Score Ever"
                value={<span className="text-green-400"><AnimatedNumber to={bestScore} /></span>}
                sub={`Grade: ${getLetterGrade(bestScore)}`}
                delay={0.12}
              />
              <HeroStatCard
                label="Most Improved"
                value={
                  mostImproved ? (
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">{mostImproved.emoji}</span>
                      <span className="text-green-400 text-2xl font-bold">+{mostImproved.delta}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-2xl">—</span>
                  )
                }
                sub={mostImproved?.name.replace(' Agent', '') ?? 'Upload more to see trends'}
                delay={0.18}
              />
            </div>

            {/* ─── Score trend chart ─── */}
            {chartData.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <GlassCard variant="surface" className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-base font-bold text-white">Score Trend</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Last {chartData.length} roasts
                        {selectedDim && (
                          <span className="ml-1 text-orange-400">
                            · {AGENTS.find(a => a.key === selectedDim)?.name.replace(' Agent', '')}
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Dimension filter tabs */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedDim(null)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedDim === null
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                            : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
                        }`}
                      >
                        Overall
                      </button>
                      {AGENTS.map(agent => (
                        <button
                          key={agent.key}
                          onClick={() => setSelectedDim(agent.key === selectedDim ? null : agent.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            selectedDim === agent.key
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
                          }`}
                        >
                          {agent.emoji} {agent.name.replace(' Agent', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-56">
                    <ScoreTrendChart data={chartData} />
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* ─── Insights: Improvements + Chronic Issues ─── */}
            {hasInsights && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dimension improvements */}
                {dimImprovements.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.27 }}
                  >
                    <GlassCard variant="surface" className="p-5 h-full">
                      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span>📈</span> Dimension Trends
                        <span className="text-xs text-zinc-600 font-normal ml-1">first → latest</span>
                      </h2>
                      <div className="space-y-4">
                        {dimImprovements.slice(0, 6).map(dim => (
                          <div key={dim.key} className="flex items-center gap-3">
                            <span className="text-lg shrink-0">{dim.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-xs text-zinc-400 font-medium truncate">
                                  {dim.name.replace(' Agent', '')}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs text-zinc-600">{dim.earliest}</span>
                                  <span className="text-zinc-700 text-xs">→</span>
                                  <span className={`text-xs font-bold ${scoreColor(dim.latest)}`}>{dim.latest}</span>
                                  <span className={`text-xs font-semibold ${
                                    dim.delta > 0 ? 'text-green-400' : dim.delta < 0 ? 'text-red-400' : 'text-zinc-600'
                                  }`}>
                                    ({dim.delta > 0 ? '+' : ''}{dim.delta})
                                  </span>
                                </div>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    dim.latest >= 80 ? 'bg-green-400' :
                                    dim.latest >= 60 ? 'bg-yellow-400' :
                                    dim.latest >= 40 ? 'bg-orange-400' : 'bg-red-400'
                                  }`}
                                  style={{ width: `${dim.latest}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                {/* Chronic issues */}
                {chronicIssues.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                  >
                    <GlassCard variant="surface" className="p-5 h-full">
                      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span>🔴</span> Persistent Weak Spots
                        <span className="ml-auto text-xs text-red-400/70 font-normal">{chronicIssues.length} recurring</span>
                      </h2>
                      <div className="space-y-3">
                        {chronicIssues.slice(0, 4).map((issue, i) => {
                          const agent = AGENTS.find(a => a.key === issue.dimension)
                          const urgency = issue.occurrences >= 4 ? '🚨' : issue.occurrences >= 3 ? '⚠️' : '⚡'
                          return (
                            <div key={i} className="bg-red-500/5 border border-red-500/15 rounded-xl p-3.5">
                              <div className="flex items-start gap-2.5">
                                <span className="text-sm shrink-0 mt-px">{urgency}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-red-400">
                                      {agent?.emoji} {agent?.name.replace(' Agent', '')}
                                    </span>
                                    <span className="text-xs text-zinc-600">{issue.occurrences}× flagged</span>
                                  </div>
                                  <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{issue.finding}</p>
                                  <p className="text-xs text-orange-400/80 font-medium">
                                    Fix: {FIX_SUGGESTIONS[issue.dimension] ?? 'Address this in your next video.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </div>
            )}

            {/* ─── Fixed issues celebration ─── */}
            {fixedIssues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.37 }}
              >
                <GlassCard variant="highlighted" className="p-5">
                  <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span>🎉</span> Issues You&apos;ve Fixed
                    <span className="ml-2 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/30">
                      {fixedIssues.length} resolved
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fixedIssues.map((issue, i) => {
                      const agent = AGENTS.find(a => a.key === issue.dimension)
                      return (
                        <div key={i} className="bg-green-500/5 border border-green-500/15 rounded-xl p-3.5 flex items-start gap-2.5">
                          <span className="text-green-400 text-sm mt-px shrink-0">✓</span>
                          <div>
                            <p className="text-xs font-semibold text-green-400 mb-1">
                              {agent?.emoji} {agent?.name.replace(' Agent', '')}
                            </p>
                            <p className="text-xs text-zinc-400 line-clamp-2">{issue.finding}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* ─── Recent Roasts ─── */}
            {recentRoasts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white">Recent Roasts</h2>
                  <Link href="/history" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentRoasts.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.42 + i * 0.05 }}
                    >
                      <Link href={`/roast/${entry.id}`} className="block h-full">
                        <GlassCard variant="interactive" className="p-5 group h-full flex flex-col">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                                {entry.filename || 'Untitled video'}
                              </p>
                              <p className="text-xs text-zinc-600 mt-0.5">
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}
                              </p>
                            </div>
                            <ScoreRing score={entry.overallScore} size={52} />
                          </div>

                          {/* Agent score pills */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {Object.entries(entry.agentScores).map(([dim, score]) => {
                              const agent = AGENTS.find(a => a.key === dim)
                              const color = score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
                              return (
                                <span key={dim} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-xs">
                                  <span>{agent?.emoji}</span>
                                  <span className={`font-semibold ${color}`}>{score}</span>
                                </span>
                              )
                            })}
                          </div>

                          {/* Verdict */}
                          {entry.verdict && (
                            <p className="text-xs text-zinc-500 italic line-clamp-2 mt-auto mb-3">
                              &ldquo;{entry.verdict}&rdquo;
                            </p>
                          )}

                          <div className="pt-3 border-t border-zinc-800/50 mt-auto">
                            <span className="text-xs text-zinc-600 group-hover:text-orange-400 transition-colors">
                              View full roast →
                            </span>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Upload CTA ─── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GlassCard variant="surface" className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xl">📤</span>
                  <div>
                    <h2 className="text-base font-bold text-white">Analyze Another Video</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Keep the streak going — upload your latest TikTok for instant feedback.
                    </p>
                  </div>
                </div>
                <UploadQueueUI />
              </GlassCard>
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}
