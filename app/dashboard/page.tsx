'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getHistory, getChronicIssues, HistoryEntry } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import UploadDropZone from '@/components/UploadDropZone';
import DashboardVideoCard from '@/components/DashboardVideoCard';
import {
  ArrowRight,
  BarChart3,
  Lightbulb,
  Sparkles,
  Upload,
} from 'lucide-react';

function metricTone(tone: 'violet' | 'sky' | 'amber' | 'emerald' | 'rose' | 'zinc') {
  switch (tone) {
    case 'violet':
      return {
        value: 'text-violet-700 dark:text-violet-300',
        orb: 'bg-violet-500/16 dark:bg-violet-400/20',
      };
    case 'sky':
      return {
        value: 'text-sky-700 dark:text-sky-300',
        orb: 'bg-sky-500/16 dark:bg-sky-400/18',
      };
    case 'amber':
      return {
        value: 'text-amber-700 dark:text-amber-300',
        orb: 'bg-amber-500/16 dark:bg-amber-400/18',
      };
    case 'emerald':
      return {
        value: 'text-emerald-700 dark:text-emerald-300',
        orb: 'bg-emerald-500/16 dark:bg-emerald-400/18',
      };
    case 'rose':
      return {
        value: 'text-rose-700 dark:text-rose-300',
        orb: 'bg-rose-500/16 dark:bg-rose-400/18',
      };
    default:
      return {
        value: 'text-zinc-950 dark:text-zinc-100',
        orb: 'bg-zinc-500/10 dark:bg-zinc-400/12',
      };
  }
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatUserName(email: string | null) {
  if (!email) return null;
  return email
    .split('@')[0]
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStoredThumb(id: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`videoThumb_${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dataUrl?: string };
    return parsed.dataUrl ?? null;
  } catch {
    return null;
  }
}

function summarizeTips(entry: HistoryEntry) {
  return Object.values(entry.findings)
    .flat()
    .filter(Boolean)
    .slice(0, 3);
}

function StatBlock({
  label,
  value,
  detail,
  tone = 'zinc',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'violet' | 'sky' | 'amber' | 'emerald' | 'rose' | 'zinc';
}) {
  const styles = metricTone(tone);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-black/6 bg-white/82 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-black/10 dark:shadow-none">
      <div className={`pointer-events-none absolute right-3 top-3 h-14 w-14 rounded-full blur-2xl ${styles.orb}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className={`font-display mt-2 text-xl font-semibold tracking-[-0.05em] ${styles.value}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    async function checkAccess() {
      try {
        const bypassRes = await fetch('/api/bypass/check');
        const bypassData = await bypassRes.json();
        if (bypassData.bypassed) {
          setHistory(getHistory());
          setAuthorized(true);
          setChecking(false);
          return;
        }
      } catch {
        /* ignore */
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setHistory(getHistory());
        setAuthorized(true);
        setUserEmail(session.user.email ?? null);
        setChecking(false);
        return;
      }

      router.push('/login?redirect=/dashboard');
    }

    checkAccess();
  }, [router]);

  if (checking) return <div className="min-h-screen bg-[#f5f5f2] dark:bg-[#09090b]" />;
  if (!authorized) return null;

  const userName = formatUserName(userEmail);
  const totalVideos = history.length;

  if (totalVideos === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f2] text-zinc-950 transition-colors dark:bg-[#09090b] dark:text-zinc-50">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8 rounded-[36px] border border-black/6 bg-white px-7 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Dashboard</p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-4xl">
              {userName ? `${userName}, upload a draft and see what it needs to go viral.` : 'Upload a draft and see what it needs to go viral.'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base">
              Start with your next video. We’ll score it, show the biggest blockers, and give you the fixes before you post.
            </p>
          </motion.section>

          <motion.section
            id="upload"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="relative"
          >
            <div className="pointer-events-none absolute inset-x-10 -inset-y-4 rounded-[44px] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.2),rgba(236,72,153,0.08),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.24),rgba(236,72,153,0.1),transparent_70%)]" />
            <div className="relative rounded-[36px] border border-black/6 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:p-7">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    New analysis
                  </div>
                  <h2 className="font-display mt-4 text-2xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-3xl">
                    Drop in your next video before the algorithm judges it.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    The orange module is the main action now: upload, get the score, then decide what to tighten before publishing.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-black/8 bg-white/86 px-3 py-2 text-sm text-zinc-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/8 dark:bg-black/10 dark:text-zinc-300">
                  <Upload className="h-4 w-4 text-orange-500 dark:text-orange-300" />
                  MP4, MOV, up to 150MB
                </div>
              </div>

              <div className="rounded-[30px] border border-black/6 bg-[#fafaf9] p-4 dark:border-white/8 dark:bg-[#111318]">
                <UploadDropZone />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <StatBlock label="Analysis time" value="~30s" detail="Fast enough to review before posting." tone="amber" />
                <StatBlock label="Coverage" value="6 agents" detail="Hook, visuals, audio, authenticity, CTA, accessibility." tone="sky" />
                <StatBlock label="Workflow" value="One place" detail="Upload, score, fix, and open the roast from here." tone="violet" />
              </div>
            </div>
          </motion.section>

          <section className="mt-10 rounded-[36px] border border-dashed border-black/8 bg-white/70 px-6 py-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">Your videos</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              After your first roast, this area will turn into a clean gallery of recent videos with scores, inline playback, and direct roast links.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const avgScore = Math.round(history.reduce((sum, item) => sum + item.overallScore, 0) / totalVideos);
  const recentEntries = history.slice(0, 5);
  const chronicIssues = totalVideos >= 2 ? getChronicIssues(history) : [];
  const fixCards = (chronicIssues.length > 0
    ? chronicIssues.slice(0, 3).map((issue) => {
        const agent = AGENTS.find((item) => item.key === issue.dimension);
        return {
          title: `Fix ${agent?.displayName.toLowerCase() ?? issue.dimension}`,
          detail: issue.finding,
          emoji: agent?.emoji ?? '💡',
        };
      })
    : summarizeTips(history[0]).slice(0, 3).map((tip, index) => ({
        title: index === 0 ? 'Fix the first thing dragging this down' : `Tighten pass ${index + 1}`,
        detail: tip,
        emoji: '💡',
      })));

  const recentThumbnails = Object.fromEntries(
    recentEntries.map((entry) => [entry.id, getStoredThumb(entry.id)]),
  );
  const bestEntry = history.reduce((best, item) => (item.overallScore > best.overallScore ? item : best), history[0]);
  const scoreDelta = history[0].overallScore - (history[history.length - 1]?.overallScore ?? history[0].overallScore);

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-zinc-950 transition-colors dark:bg-[#09090b] dark:text-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-7 lg:px-10 lg:py-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-col gap-5 rounded-[36px] border border-black/6 bg-white px-7 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Dashboard</p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-4xl">
              {userName ? `${userName}, find what your next post needs to go viral.` : 'Find what your next post needs to go viral.'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base">
              Upload the next draft, review the repeated fixes, and scan your recent videos in one gallery without digging through a stack of cards.
            </p>
          </div>

          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/8 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <BarChart3 className="h-4 w-4" />
            View analytics
          </Link>
        </motion.section>

        <motion.section
          id="upload"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="relative mb-8"
        >
          <div className="pointer-events-none absolute inset-x-10 -inset-y-4 rounded-[44px] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.2),rgba(236,72,153,0.08),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.24),rgba(236,72,153,0.1),transparent_70%)]" />
          <div className="relative rounded-[36px] border border-black/6 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:p-7">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Main action
                </div>
                <h2 className="font-display mt-4 text-2xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-3xl">
                  Put the next draft through the orange funnel before you post it.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  This is the primary CTA now. Upload, get the score fast, and open the roast only after you know what needs to change.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-black/8 bg-white/86 px-3 py-2 text-sm text-zinc-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/8 dark:bg-black/10 dark:text-zinc-300">
                <Upload className="h-4 w-4 text-orange-500 dark:text-orange-300" />
                Upload / drop a video
              </div>
            </div>

            <div className="rounded-[30px] border border-black/6 bg-[#fafaf9] p-4 dark:border-white/8 dark:bg-[#111318]">
              <UploadDropZone />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <StatBlock label="Videos roasted" value={String(totalVideos)} detail="Recent drafts in this workspace." tone="violet" />
              <StatBlock label="Average score" value={`${avgScore}/100`} detail="Your current operating baseline." tone={avgScore >= 80 ? 'emerald' : avgScore >= 60 ? 'amber' : avgScore >= 40 ? 'amber' : 'rose'} />
              <StatBlock label="Since first roast" value={scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`} detail="How far the overall score has moved." tone={scoreDelta > 0 ? 'sky' : scoreDelta < 0 ? 'rose' : 'zinc'} />
              <StatBlock label="Best score" value={`${bestEntry.overallScore}/100`} detail={bestEntry.filename || 'Untitled upload'} tone="emerald" />
            </div>
          </div>
        </motion.section>

        {fixCards.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="mb-8 rounded-[36px] border border-black/6 bg-white px-7 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-full bg-orange-50 p-2 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">What to fix next</p>
                <h2 className="font-display mt-1 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                  The improvements your recent roasts keep asking for
                </h2>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {fixCards.map((fix) => (
                <div key={`${fix.title}-${fix.detail}`} className="rounded-[24px] border border-black/6 bg-[#fafaf9] px-4 py-4 dark:border-white/8 dark:bg-[#111318]">
                  <p className="text-sm font-medium text-zinc-950 dark:text-white">
                    <span className="mr-2">{fix.emoji}</span>
                    {fix.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-300">{fix.detail}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.45 }}
          className="rounded-[36px] border border-black/6 bg-white px-7 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-white/5 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Your videos</p>
              <h2 className="font-display mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Recent roasts in a playable gallery
              </h2>
            </div>

            {totalVideos > 5 && (
              <Link
                href="/history"
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {recentEntries.map((entry) => (
              <DashboardVideoCard
                key={entry.id}
                entry={entry}
                posterUrl={recentThumbnails[entry.id]}
                dateLabel={relativeDate(entry.date)}
              />
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
