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
import {
  Video,
  BarChart3,
  Trophy,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'

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

function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-500/10 border-green-500/20'
  if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20'
  if (score >= 40) return 'bg-orange-500/10 border-orange-500/20'
  return 'bg-red-500/10 border-red-500/20'
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

/* ─── stat card ─── */
function StatCard({
  icon, label, value, sub, delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-[#18181b] border border-zinc-800 rounded-lg p-5 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <div className="text-zinc-500">{icon}</div>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
      </div>
      <div className="text-2xl font-bold text-white leading-none">{value}</div>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </motion.div>
  )
}

/* ─── main page ─── */
export default function AnalyticsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedDim, setSelectedDim] = useState<string | null>(null)

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setHistory(getHistory())
        setAuthorized(true)
        setChecking(false)
        return
      }
      router.push('/login?redirect=/analytics')
    }
    checkAccess()
  }, [router])

  if (checking) return <div className="min-h-screen bg-[#09090b]" />
  if (!authorized) return null

  /* ─── computed stats ─── */
  const totalVideos = history.length
  const avgScore = totalVideos > 0
    ? Math.round(history.reduce((s, h) => s + h.overallScore, 0) / totalVideos)
    : 0
  const bestScore = totalVideos > 0 ? Math.max(...history.map(h => h.overallScore)) : 0
  const recentTrend = totalVideos >= 2 ? history[0].overallScore - history[1].overallScore : 0

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
  const fixedIssues = totalVideos >= 2 ? getFixedIssues(history[0].findings, history) : []

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

  const recentEntries = history.slice(0, 6)
  const hasInsights = dimImprovements.length > 0 || chronicIssues.length > 0

  if (totalVideos === 0) {
    return (
      <div className="min-h-screen bg-[#09090b] px-6 py-8 lg:px-10">
        <div className="max-w-2xl mx-auto pt-12 text-center">
          <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">No analytics yet</h1>
          <p className="text-sm text-zinc-500 mb-6">Upload your first video to start tracking your performance.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-8 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ─── Header ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-sm text-zinc-500">
            Performance overview across {totalVideos} video{totalVideos !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* ─── Stat cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Video className="w-4 h-4" />}
            label="Videos Analyzed"
            value={<AnimatedNumber to={totalVideos} />}
            sub={recentTrend !== 0 ? (
              <span className={`inline-flex items-center gap-0.5 ${recentTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {recentTrend > 0 ? '+' : ''}{recentTrend} pts from last
              </span>
            ) : undefined}
            delay={0}
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="Average Score"
            value={
              <span className={scoreColor(avgScore)}>
                <AnimatedNumber to={avgScore} />
                <span className="text-lg text-zinc-600 ml-0.5">/100</span>
              </span>
            }
            sub={`Grade: ${getLetterGrade(avgScore)}`}
            delay={0.05}
          />
          <StatCard
            icon={<Trophy className="w-4 h-4" />}
            label="Best Score"
            value={<span className="text-green-400"><AnimatedNumber to={bestScore} /></span>}
            sub={`Grade: ${getLetterGrade(bestScore)}`}
            delay={0.1}
          />
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="Most Improved"
            value={
              mostImproved ? (
                <span className="flex items-center gap-2">
                  <span className="text-lg">{mostImproved.emoji}</span>
                  <span className="text-green-400">+{mostImproved.delta}</span>
                </span>
              ) : (
                <span className="text-zinc-600">-</span>
              )
            }
            sub={mostImproved?.name.replace(' Agent', '') ?? 'Upload more to see'}
            delay={0.15}
          />
        </div>

        {/* ─── Performance Overview (chart) ─── */}
        {chartData.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#18181b] border border-zinc-800 rounded-lg p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-semibold text-white">Performance Overview</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Last {chartData.length} analyses
                  {selectedDim && (
                    <span className="ml-1 text-orange-400">
                      · {AGENTS.find(a => a.key === selectedDim)?.name.replace(' Agent', '')}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedDim(null)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedDim === null
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  Overall
                </button>
                {AGENTS.map(agent => (
                  <button
                    key={agent.key}
                    onClick={() => setSelectedDim(agent.key === selectedDim ? null : agent.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      selectedDim === agent.key
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
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
          </motion.div>
        )}

        {/* ─── Insights grid ─── */}
        {hasInsights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dimension trends */}
            {dimImprovements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-[#18181b] border border-zinc-800 rounded-lg p-5"
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-sm font-semibold text-white">Dimension Trends</h2>
                  <span className="text-xs text-zinc-600 ml-auto">first → latest</span>
                </div>
                <div className="space-y-4">
                  {dimImprovements.slice(0, 6).map(dim => (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="text-base shrink-0">{dim.emoji}</span>
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
                            className={`h-full rounded-full transition-all ${
                              dim.latest >= 80 ? 'bg-green-500' :
                              dim.latest >= 60 ? 'bg-yellow-500' :
                              dim.latest >= 40 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${dim.latest}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Persistent weak spots */}
            {chronicIssues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#18181b] border border-zinc-800 rounded-lg p-5"
              >
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-400/70" />
                  <h2 className="text-sm font-semibold text-white">Persistent Weak Spots</h2>
                  <span className="text-xs text-red-400/60 ml-auto">{chronicIssues.length} recurring</span>
                </div>
                <div className="space-y-3">
                  {chronicIssues.slice(0, 4).map((issue, i) => {
                    const agent = AGENTS.find(a => a.key === issue.dimension)
                    return (
                      <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-red-400">
                              {agent?.emoji} {agent?.name.replace(' Agent', '')}
                            </span>
                            <span className="text-xs text-zinc-600">{issue.occurrences}x flagged</span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{issue.finding}</p>
                          <p className="text-xs text-zinc-500">
                            <span className="text-orange-400/80 font-medium">Fix:</span>{' '}
                            {FIX_SUGGESTIONS[issue.dimension] ?? 'Address this in your next video.'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ─── Fixed issues ─── */}
        {fixedIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#18181b] border border-zinc-800 rounded-lg p-5"
          >
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-semibold text-white">Issues Resolved</h2>
              <span className="text-xs text-green-400/70 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-0.5 ml-2">
                {fixedIssues.length} fixed
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fixedIssues.map((issue, i) => {
                const agent = AGENTS.find(a => a.key === issue.dimension)
                return (
                  <div key={i} className="bg-green-500/5 border border-green-500/10 rounded-lg p-3.5 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-px shrink-0" />
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
          </motion.div>
        )}

        {/* ─── Recent Analyses (table) ─── */}
        {recentEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Recent Analyses</h2>
              <Link href="/history" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-[#18181b] border border-zinc-800 rounded-lg divide-y divide-zinc-800/80">
              {recentEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/roast/${entry.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                >
                  <ScoreRing score={entry.overallScore} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium truncate group-hover:text-white transition-colors">
                      {entry.filename || 'Untitled video'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-1.5">
                    {Object.entries(entry.agentScores).slice(0, 4).map(([dim, score]) => {
                      const agent = AGENTS.find(a => a.key === dim)
                      return (
                        <span
                          key={dim}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs ${scoreBg(score)}`}
                        >
                          <span>{agent?.emoji}</span>
                          <span className={`font-semibold ${scoreColor(score)}`}>{score}</span>
                        </span>
                      )
                    })}
                  </div>
                  <div className={`text-sm font-bold ${scoreColor(entry.overallScore)}`}>
                    {getLetterGrade(entry.overallScore)}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
