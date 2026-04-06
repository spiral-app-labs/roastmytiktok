'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getHistory, getChronicIssues, HistoryEntry } from '@/lib/history'
import { AGENTS } from '@/lib/agents'
import { ScoreRing } from '@/components/ScoreRing'
import UploadDropZone from '@/components/UploadDropZone'
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Upload,
  Lightbulb,
  BarChart3,
  Sparkles,
} from 'lucide-react'

/* ─── helpers ─── */
function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function scoreBorderColor(score: number) {
  if (score >= 80) return 'border-green-500/20'
  if (score >= 60) return 'border-yellow-500/20'
  if (score >= 40) return 'border-orange-500/20'
  return 'border-red-500/20'
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

function viralityLabel(score: number) {
  if (score >= 85) return 'High viral potential'
  if (score >= 70) return 'Good potential'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Needs work'
  return 'Low potential'
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ─── main page ─── */
export default function DashboardPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])

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

  if (checking) return <div className="min-h-screen bg-[#09090b]" />
  if (!authorized) return null

  const totalVideos = history.length
  const avgScore = totalVideos > 0
    ? Math.round(history.reduce((s, h) => s + h.overallScore, 0) / totalVideos)
    : 0

  const userName = userEmail
    ? userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  /* ─── EMPTY STATE ─── */
  if (totalVideos === 0) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-14 lg:pt-0 px-6">
        <div className="max-w-2xl mx-auto py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
              {userName ? `${userName}, make this one go viral` : 'Make your next video go viral'}
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed max-w-md mx-auto">
              Upload before you post. We&apos;ll show you exactly what&apos;s holding it back
              and how to fix it — so you post the version that blows up.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 sm:p-8"
          >
            <UploadDropZone />
          </motion.div>

          {/* Subtle context — what they'll get */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-600"
          >
            {AGENTS.map((a) => (
              <span key={a.key} className="flex items-center gap-1.5">
                <span>{a.emoji}</span>
                <span>{a.name.replace(' Agent', '')}</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    )
  }

  /* ─── HAS VIDEOS STATE ─── */
  const latest = history[0]
  const latestGrade = getLetterGrade(latest.overallScore)

  // Growth insight
  const firstScore = history[history.length - 1].overallScore
  const scoreDelta = latest.overallScore - firstScore
  const recentTrend = totalVideos >= 2 ? history[0].overallScore - history[1].overallScore : 0

  // Best score
  const bestEntry = history.reduce((best, h) => h.overallScore > best.overallScore ? h : best, history[0])

  // Chronic issues for tips
  const chronicIssues = totalVideos >= 2 ? getChronicIssues(history) : []
  const personalizedTips = chronicIssues.slice(0, 2).map(issue => {
    const agent = AGENTS.find(a => a.key === issue.dimension)
    return {
      title: `Improve your ${agent?.name.replace(' Agent', '').toLowerCase() ?? issue.dimension}`,
      description: issue.finding,
      emoji: agent?.emoji ?? '💡',
    }
  })

  // Weakest dimension from latest video
  const weakestDim = Object.entries(latest.agentScores)
    .sort(([, a], [, b]) => a - b)[0]
  const weakestAgent = weakestDim ? AGENTS.find(a => a.key === weakestDim[0]) : null

  return (
    <div className="min-h-screen bg-[#09090b] pt-14 lg:pt-0">
      <div className="px-6 py-8 lg:px-10 max-w-5xl mx-auto space-y-10">

        {/* ─── 1. HERO: Latest Score + Upload ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Latest score — emotional anchor */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <Link
              href={`/roast/${latest.id}`}
              className="group block bg-[#18181b] border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all h-full"
            >
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">Latest roast</p>
              <div className="flex items-center gap-5">
                <ScoreRing score={latest.overallScore} size={80} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-white mb-0.5">{latestGrade}</p>
                  <p className={`text-sm font-medium ${scoreColor(latest.overallScore)} mb-1.5`}>
                    {viralityLabel(latest.overallScore)}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {latest.filename || 'Untitled'} · {relativeDate(latest.date)}
                  </p>
                </div>
              </div>
              {weakestAgent && weakestDim && (
                <div className="mt-4 pt-4 border-t border-zinc-800/80">
                  <p className="text-xs text-zinc-500">
                    <span className="text-zinc-400">Biggest opportunity:</span>{' '}
                    {weakestAgent.emoji} {weakestAgent.name.replace(' Agent', '')} ({weakestDim[1]}/100)
                  </p>
                </div>
              )}
              <div className="mt-3 flex items-center gap-1 text-xs text-zinc-600 group-hover:text-orange-400/80 transition-colors">
                View full results <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          </motion.div>

          {/* Upload — primary action */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="lg:col-span-3"
          >
            <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">New analysis</p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <Sparkles className="w-3 h-3" />
                  ~30s
                </div>
              </div>
              <div className="flex-1">
                <UploadDropZone />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── 2. GROWTH INSIGHT (lightweight) ─── */}
        {totalVideos >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center justify-between gap-4 bg-[#18181b] border border-zinc-800 rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">{totalVideos} videos</span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">Avg <span className={`font-semibold ${scoreColor(avgScore)}`}>{avgScore}</span></span>
              </div>

              {totalVideos >= 2 && (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${recentTrend > 0 ? 'text-green-400' : recentTrend < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {recentTrend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : recentTrend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                  {recentTrend > 0 ? '+' : ''}{recentTrend} pts last video
                </div>
              )}

              {totalVideos >= 3 && scoreDelta !== 0 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className={`text-sm ${scoreDelta > 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                    {scoreDelta > 0 ? '+' : ''}{scoreDelta} pts since first video
                  </span>
                </>
              )}
            </div>

            <Link
              href="/analytics"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Full analytics
            </Link>
          </motion.div>
        )}

        {/* ─── 3. RECENT ROASTS ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent</h2>
            {totalVideos > 6 && (
              <Link href="/history" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1">
                All videos <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="space-y-2">
            {history.slice(0, 6).map((entry, i) => {
              const grade = getLetterGrade(entry.overallScore)
              const topFinding = entry.findings
                ? Object.values(entry.findings).flat()[0]
                : null

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 + i * 0.03 }}
                >
                  <Link
                    href={`/roast/${entry.id}`}
                    className={`group flex items-center gap-4 bg-[#18181b] border ${scoreBorderColor(entry.overallScore)} rounded-lg px-4 py-3.5 hover:border-zinc-600 hover:bg-[#1f1f23] transition-all`}
                  >
                    {/* Score */}
                    <div className="shrink-0 w-10 text-center">
                      <span className={`text-base font-bold ${scoreColor(entry.overallScore)}`}>{entry.overallScore}</span>
                    </div>

                    {/* Grade pill */}
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      entry.overallScore >= 80 ? 'bg-green-500/10 text-green-400' :
                      entry.overallScore >= 60 ? 'bg-yellow-500/10 text-yellow-400' :
                      entry.overallScore >= 40 ? 'bg-orange-500/10 text-orange-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {grade}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{entry.filename || 'Untitled'}</p>
                      {topFinding && (
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{topFinding}</p>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-[11px] text-zinc-600 shrink-0 hidden sm:block">
                      {relativeDate(entry.date)}
                    </span>

                    <ArrowRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ─── 4. TIPS (only with chronic issues, max 2) ─── */}
        {personalizedTips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5 text-orange-400/70" />
              <h2 className="text-sm font-semibold text-white">Focus areas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personalizedTips.map((tip, i) => (
                <div
                  key={i}
                  className="bg-[#18181b] border border-zinc-800 rounded-lg px-4 py-3.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{tip.emoji}</span>
                    <h3 className="text-xs font-semibold text-white">{tip.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{tip.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Best video highlight (if they have 3+ and best != latest) ─── */}
        {totalVideos >= 3 && bestEntry.id !== latest.id && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href={`/roast/${bestEntry.id}`}
              className="group flex items-center gap-4 border border-zinc-800 rounded-lg px-5 py-4 hover:border-zinc-700 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/15 to-pink-500/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-orange-400/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500">Your best video</p>
                <p className="text-sm text-white truncate">{bestEntry.filename || 'Untitled'} — <span className={`font-semibold ${scoreColor(bestEntry.overallScore)}`}>{bestEntry.overallScore}/100</span></p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
