'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getHistory, getChronicIssues, HistoryEntry } from '@/lib/history'
import { AGENTS } from '@/lib/agents'
import UploadDropZone from '@/components/UploadDropZone'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  GalleryVerticalEnd,
  Lightbulb,
  Play,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react'

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      text: 'text-emerald-700 dark:text-emerald-300',
      chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
      border: 'border-emerald-200 dark:border-emerald-400/20',
      accent: 'bg-emerald-500 dark:bg-emerald-400',
      glow: 'from-emerald-500/14 via-emerald-500/5 to-transparent dark:from-emerald-400/20 dark:via-emerald-400/6 dark:to-transparent',
    }
  }
  if (score >= 60) {
    return {
      text: 'text-amber-700 dark:text-amber-300',
      chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
      border: 'border-amber-200 dark:border-amber-400/20',
      accent: 'bg-amber-500 dark:bg-amber-400',
      glow: 'from-amber-500/16 via-amber-500/5 to-transparent dark:from-amber-400/20 dark:via-amber-400/6 dark:to-transparent',
    }
  }
  if (score >= 40) {
    return {
      text: 'text-orange-700 dark:text-orange-300',
      chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
      border: 'border-orange-200 dark:border-orange-400/20',
      accent: 'bg-orange-500 dark:bg-orange-400',
      glow: 'from-orange-500/16 via-orange-500/5 to-transparent dark:from-orange-400/20 dark:via-orange-400/6 dark:to-transparent',
    }
  }
  return {
    text: 'text-rose-700 dark:text-rose-300',
    chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    border: 'border-rose-200 dark:border-rose-400/20',
    accent: 'bg-rose-500 dark:bg-rose-400',
    glow: 'from-rose-500/16 via-rose-500/5 to-transparent dark:from-rose-400/20 dark:via-rose-400/6 dark:to-transparent',
  }
}

function metricTone(tone: 'violet' | 'sky' | 'amber' | 'emerald' | 'rose' | 'zinc') {
  switch (tone) {
    case 'violet':
      return {
        value: 'text-violet-700 dark:text-violet-300',
        orb: 'bg-violet-500/16 dark:bg-violet-400/20',
      }
    case 'sky':
      return {
        value: 'text-sky-700 dark:text-sky-300',
        orb: 'bg-sky-500/16 dark:bg-sky-400/18',
      }
    case 'amber':
      return {
        value: 'text-amber-700 dark:text-amber-300',
        orb: 'bg-amber-500/16 dark:bg-amber-400/18',
      }
    case 'emerald':
      return {
        value: 'text-emerald-700 dark:text-emerald-300',
        orb: 'bg-emerald-500/16 dark:bg-emerald-400/18',
      }
    case 'rose':
      return {
        value: 'text-rose-700 dark:text-rose-300',
        orb: 'bg-rose-500/16 dark:bg-rose-400/18',
      }
    default:
      return {
        value: 'text-zinc-950 dark:text-zinc-100',
        orb: 'bg-zinc-500/10 dark:bg-zinc-400/12',
      }
  }
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
  if (score >= 70) return 'Strong trajectory'
  if (score >= 55) return 'Promising with edits'
  if (score >= 40) return 'Needs a tighter cut'
  return 'Not ready to post'
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

function formatUserName(email: string | null) {
  if (!email) return null
  return email
    .split('@')[0]
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function StatBlock({
  label,
  value,
  detail,
  tone = 'zinc',
}: {
  label: string
  value: string
  detail: string
  tone?: 'violet' | 'sky' | 'amber' | 'emerald' | 'rose' | 'zinc'
}) {
  const styles = metricTone(tone)
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-black/6 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
      <div className={`pointer-events-none absolute right-3 top-3 h-16 w-16 rounded-full blur-2xl ${styles.orb}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className={`font-display mt-3 text-2xl font-semibold tracking-[-0.05em] ${styles.value}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  )
}

function getStoredThumb(id: string) {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`videoThumb_${id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { dataUrl?: string }
    return parsed.dataUrl ?? null
  } catch {
    return null
  }
}

function summarizeTips(entry: HistoryEntry) {
  return Object.values(entry.findings)
    .flat()
    .filter(Boolean)
    .slice(0, 3)
}

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
      } catch {
        /* ignore */
      }

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

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

  if (checking) return <div className="min-h-screen bg-[#f5f5f2] dark:bg-[#09090b]" />
  if (!authorized) return null

  const totalVideos = history.length
  const avgScore = totalVideos > 0
    ? Math.round(history.reduce((sum, item) => sum + item.overallScore, 0) / totalVideos)
    : 0
  const userName = formatUserName(userEmail)

  if (totalVideos === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f2] text-zinc-950 transition-colors dark:bg-[#09090b] dark:text-zinc-50">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:items-start">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-[36px] border border-black/6 bg-white px-7 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.05)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:px-9 sm:py-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950">
                <Sparkles className="h-3.5 w-3.5" />
                Creator workspace
              </div>

              <h1 className="font-display mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-5xl">
                {userName ? `${userName}, your creator workspace is ready.` : 'A calmer home for every draft before it goes live.'}
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                Upload a draft, get the signal fast, and keep the operating surface calm. No noisy widgets, no fake growth theater, just the next decision.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <StatBlock label="Analysis time" value="~30s" detail="Fast enough to review before posting." tone="violet" />
                <StatBlock label="Coverage" value="6 agents" detail="Hook, visuals, audio, authenticity, CTA, accessibility." tone="sky" />
                <StatBlock label="Workflow" value="One place" detail="Upload, review, refine, and compare without bouncing around." tone="amber" />
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                {AGENTS.map((agent) => (
                  <span
                    key={agent.key}
                    className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-zinc-50 px-3 py-2 dark:border-white/8 dark:bg-white/5"
                  >
                    <span>{agent.emoji}</span>
                    <span>{agent.displayName}</span>
                  </span>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45 }}
              className="rounded-[36px] border border-black/6 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">New analysis</p>
                  <h2 className="font-display mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">Drop in your next draft</h2>
                </div>
                <div className="rounded-full border border-black/8 bg-zinc-50 p-2 text-zinc-500 dark:border-white/8 dark:bg-white/5 dark:text-zinc-300">
                  <Upload className="h-4 w-4" />
                </div>
              </div>

              <UploadDropZone />
            </motion.section>
          </div>
        </div>
      </div>
    )
  }

  const latest = history[0]
  const latestGrade = getLetterGrade(latest.overallScore)
  const latestTone = scoreTone(latest.overallScore)
  const recentEntries = history.slice(0, 5)
  const bestEntry = history.reduce((best, item) => (item.overallScore > best.overallScore ? item : best), history[0])
  const firstScore = history[history.length - 1]?.overallScore ?? latest.overallScore
  const scoreDelta = latest.overallScore - firstScore
  const recentTrend = totalVideos >= 2 ? history[0].overallScore - history[1].overallScore : 0
  const chronicIssues = totalVideos >= 2 ? getChronicIssues(history) : []
  const personalizedTips = chronicIssues.slice(0, 3).map((issue) => {
    const agent = AGENTS.find((item) => item.key === issue.dimension)
    return {
      title: agent?.displayName ?? issue.dimension,
      detail: issue.finding,
      emoji: agent?.emoji ?? '💡',
    }
  })

  const weakestDimension = Object.entries(latest.agentScores).sort(([, a], [, b]) => a - b)[0]
  const weakestAgent = weakestDimension
    ? AGENTS.find((agent) => agent.key === weakestDimension[0])
    : null
  const recentThumbnails = Object.fromEntries(
    recentEntries.map((entry) => [entry.id, getStoredThumb(entry.id)]),
  )
  const latestTips = summarizeTips(latest)

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-zinc-950 transition-colors dark:bg-[#09090b] dark:text-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-7 lg:px-10 lg:py-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-col gap-5 rounded-[36px] border border-black/6 bg-white px-7 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.05)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Dashboard</p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-4xl">
              {userName ? `${userName}, find what your next post needs to go viral.` : 'Find what your next post needs to go viral.'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base">
              Review the newest roast, spot the repeat issues, and see what to fix before you post so each draft has a better shot at taking off.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/8 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <BarChart3 className="h-4 w-4" />
              View analytics
            </Link>
            <Link
              href="#upload"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
            >
              <Upload className="h-4 w-4" />
              New upload
            </Link>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <StatBlock label="Total videos" value={String(totalVideos)} detail="Everything you’ve reviewed in this workspace." tone="violet" />
          <StatBlock label="Average score" value={`${avgScore}/100`} detail="Your current operating baseline." tone={avgScore >= 80 ? 'emerald' : avgScore >= 60 ? 'amber' : avgScore >= 40 ? 'amber' : 'rose'} />
          <StatBlock
            label="Last upload"
            value={recentTrend > 0 ? `+${recentTrend}` : `${recentTrend}`}
            detail={recentTrend > 0 ? 'Momentum improved on your latest draft.' : recentTrend < 0 ? 'Latest draft slipped below the previous one.' : 'Flat versus the prior upload.'}
            tone={recentTrend > 0 ? 'emerald' : recentTrend < 0 ? 'rose' : 'zinc'}
          />
          <StatBlock
            label="Since first video"
            value={scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`}
            detail={scoreDelta > 0 ? 'You are trending up over time.' : scoreDelta < 0 ? 'Recent work is below your starting point.' : 'No change from your first saved roast.'}
            tone={scoreDelta > 0 ? 'sky' : scoreDelta < 0 ? 'rose' : 'zinc'}
          />
        </motion.section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_400px]">
          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45 }}
              className="overflow-hidden rounded-[36px] border border-black/6 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.05)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
            >
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.12fr)_360px]">
                <div id="upload" className="relative overflow-hidden border-b border-black/6 px-7 py-7 dark:border-white/8 lg:border-b-0 lg:border-r">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),linear-gradient(135deg,rgba(255,237,213,0.7),rgba(255,247,237,0.14)_55%,transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_34%),linear-gradient(135deg,rgba(124,45,18,0.22),rgba(15,23,42,0.08)_55%,transparent)]" />
                  <div className="relative flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Upload next draft</p>
                        <h2 className="font-display mt-3 max-w-xl text-2xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                          Put the next video through the orange funnel before you post it.
                        </h2>
                        <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          Start with the main action, get the score fast, and fix the 2-3 things most likely to kill distribution.
                        </p>
                      </div>
                      <div className="hidden rounded-full bg-white/80 p-2 text-orange-500 shadow-[0_12px_30px_rgba(249,115,22,0.16)] backdrop-blur dark:bg-white/10 dark:text-orange-300 lg:block">
                        <Upload className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="rounded-[30px] border border-orange-200/70 bg-[linear-gradient(135deg,rgba(255,237,213,0.86),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_50px_rgba(249,115,22,0.14)] dark:border-orange-400/20 dark:bg-[linear-gradient(135deg,rgba(124,45,18,0.34),rgba(255,255,255,0.04))]">
                      <UploadDropZone />
                    </div>
                  </div>
                </div>

                <div className="px-7 py-6">
                  <div className="flex flex-col gap-6 lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Latest analysis</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                        {latest.filename || 'Untitled upload'}
                      </h2>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${latestTone.chip}`}>
                        {viralityLabel(latest.overallScore)}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <Clock3 className="h-4 w-4" />
                      Reviewed {relativeDate(latest.date)}
                    </p>
                  </div>

                    <div className={`relative overflow-hidden rounded-[32px] border px-5 py-5 ${latestTone.border} bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(15,23,42,0.82))]`}>
                      <div className={`pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br blur-3xl ${latestTone.glow}`} />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Score</p>
                      <div className="mt-3 flex items-end gap-3">
                        <span className={`font-display text-6xl font-semibold tracking-[-0.07em] ${latestTone.text}`}>
                          {latest.overallScore}
                        </span>
                        <span className="pb-2 text-lg font-medium text-zinc-400 dark:text-zinc-500">/100</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-3 text-sm font-semibold ${latestTone.chip}`}>
                          {latestGrade}
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Current verdict</span>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] border border-black/6 bg-[#fafaf9] p-4 dark:border-white/8 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Biggest opportunity</p>
                      <p className="mt-3 text-sm font-medium text-zinc-950 dark:text-white">
                        {weakestAgent ? `${weakestAgent.emoji} ${weakestAgent.displayName}` : 'No weak dimension found'}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {weakestDimension ? `${weakestDimension[1]}/100 on the latest draft.` : 'Your dimension breakdown will appear here.'}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-black/6 bg-[#fafaf9] p-4 dark:border-white/8 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Last movement</p>
                      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {recentTrend > 0 ? <TrendingUp className="h-4 w-4 text-emerald-600 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)] dark:text-emerald-300" /> : recentTrend < 0 ? <TrendingDown className="h-4 w-4 text-rose-600 drop-shadow-[0_0_10px_rgba(244,63,94,0.25)] dark:text-rose-300" /> : <BarChart3 className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />}
                        {recentTrend > 0 ? `Up ${recentTrend} points` : recentTrend < 0 ? `Down ${Math.abs(recentTrend)} points` : 'No change'}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Compared with your previous saved roast.</p>
                    </div>

                    <div className="rounded-[24px] border border-black/6 bg-[#fafaf9] p-4 dark:border-white/8 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Best score</p>
                      <p className={`font-display mt-3 text-sm font-semibold ${scoreTone(bestEntry.overallScore).text}`}>{bestEntry.overallScore}/100</p>
                      <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {bestEntry.filename || 'Untitled upload'}
                      </p>
                    </div>
                  </div>

                  {latestTips.length > 0 && (
                    <div className="rounded-[28px] border border-black/6 bg-[#fafaf9] px-5 py-5 dark:border-white/8 dark:bg-white/5">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-orange-500 dark:text-orange-300" />
                        <p className="text-sm font-medium text-zinc-950 dark:text-white">Top fixes for this draft</p>
                      </div>
                      <div className="mt-4 space-y-3">
                        {latestTips.slice(0, 3).map((tip, index) => (
                          <div key={`${latest.id}-tip-${index}`} className="rounded-[20px] border border-black/6 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-black/10">
                            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[28px] border border-black/6 bg-[#fafaf9] px-5 py-5 text-zinc-950 dark:border-white/8 dark:bg-white/5 dark:text-white">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-400/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-950 dark:text-white">What to do next</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
                          {weakestAgent
                            ? `Tighten ${weakestAgent.displayName.toLowerCase()} before publishing this cut.`
                            : 'Review the full roast and clean up the weakest dimension before posting.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/roast/${latest.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-black/8 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 dark:border-white/8 dark:bg-white dark:text-zinc-950"
                  >
                    Open full roast
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45 }}
              className="rounded-[36px] border border-black/6 bg-white px-7 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Recent uploads</p>
                  <h2 className="font-display mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">Recent videos and what to fix</h2>
                </div>

                {totalVideos > 6 && (
                  <Link
                    href="/history"
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recentEntries.map((entry) => {
                  const tone = scoreTone(entry.overallScore)
                  const tips = summarizeTips(entry).slice(0, 2)
                  const thumb = recentThumbnails[entry.id]

                  return (
                    <Link
                      key={entry.id}
                      href={`/roast/${entry.id}`}
                      className="group overflow-hidden rounded-[30px] border border-black/6 bg-[#fafaf9] transition-transform hover:-translate-y-1 hover:bg-white dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/8"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden border-b border-black/6 bg-[linear-gradient(180deg,#fff7ed,#f4f4f5)] dark:border-white/8 dark:bg-[linear-gradient(180deg,#111318,#18181b)]">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#fed7aa,transparent_55%),linear-gradient(180deg,#fff7ed,#f5f5f2)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.28),transparent_42%),linear-gradient(180deg,#18181b,#111318)]">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-[0_12px_30px_rgba(15,23,42,0.1)] dark:bg-white/10 dark:text-white">
                              <Play className="ml-0.5 h-5 w-5" />
                            </div>
                          </div>
                        )}
                        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-medium text-zinc-950 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-zinc-950/80 dark:text-white">
                          <div className={`h-2 w-2 rounded-full ${tone.accent}`} />
                          <span className={`font-display ${tone.text}`}>{entry.overallScore}</span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{entry.filename || 'Untitled upload'}</p>
                            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{relativeDate(entry.date)}</p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-700 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
                        </div>

                        <div className="mt-4 space-y-2">
                          {tips.length > 0 ? tips.map((tip, index) => (
                            <div key={`${entry.id}-${index}`} className="rounded-[18px] border border-black/6 bg-white/80 px-3 py-2.5 dark:border-white/8 dark:bg-black/10">
                              <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">{tip}</p>
                            </div>
                          )) : (
                            <div className="rounded-[18px] border border-black/6 bg-white/80 px-3 py-2.5 dark:border-white/8 dark:bg-black/10">
                              <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">{entry.verdict}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </motion.section>
          </div>

          <div className="space-y-6">
            {personalizedTips.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.45 }}
                className="rounded-[36px] border border-black/6 bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-50 p-2 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Recent patterns</p>
                    <h2 className="font-display mt-1 text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">The fixes showing up again and again</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {personalizedTips.map((tip) => (
                    <div key={`${tip.title}-${tip.detail}`} className="rounded-[24px] border border-black/6 bg-[#fafaf9] px-4 py-4 dark:border-white/8 dark:bg-white/5">
                      <p className="text-sm font-medium text-zinc-950 dark:text-white">
                        <span className="mr-2">{tip.emoji}</span>
                        Fix {tip.title.toLowerCase()}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{tip.detail}</p>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.45 }}
              className="rounded-[36px] border border-black/6 bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] transition-colors dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-50 p-2 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
                  <GalleryVerticalEnd className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Quick scan</p>
                  <h2 className="font-display mt-1 text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">What your recent videos are telling you</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {recentEntries.slice(0, 3).map((entry) => {
                  const entryTone = scoreTone(entry.overallScore)
                  const tips = summarizeTips(entry).slice(0, 1)
                  return (
                    <Link
                      key={`scan-${entry.id}`}
                      href={`/roast/${entry.id}`}
                      className="flex items-start gap-3 rounded-[22px] border border-black/6 bg-[#fafaf9] px-4 py-4 transition-colors hover:bg-white dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/8"
                    >
                      <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${entryTone.accent}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{entry.filename || 'Untitled upload'}</p>
                          <span className={`font-display text-sm font-semibold ${entryTone.text}`}>{entry.overallScore}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{relativeDate(entry.date)}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-300">{tips[0] ?? entry.verdict}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </motion.section>

            {bestEntry.id !== latest.id && (
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.45 }}
              >
                <Link
                  href={`/roast/${bestEntry.id}`}
                  className="group block rounded-[36px] border border-black/6 bg-white px-6 py-6 text-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-0.5 dark:border-white/8 dark:bg-white/5 dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Best performer</p>
                  <h2 className="font-display mt-3 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">{bestEntry.filename || 'Untitled upload'}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-300">
                    Your highest score so far is <span className={`font-display font-semibold ${scoreTone(bestEntry.overallScore).text}`}>{bestEntry.overallScore}/100</span>. Revisit what worked there before you cut the next draft.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-950 dark:text-white">
                    Open best roast
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </Link>
              </motion.section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
