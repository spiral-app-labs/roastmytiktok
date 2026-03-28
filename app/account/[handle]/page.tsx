'use client';

import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface FormatInsight {
  format: string;
  avgViews: number;
  examples?: string[];
  why?: string;
}

interface VideoIdea {
  hook: string;
  format: string;
  why: string;
}

interface AccountAnalysis {
  handle: string;
  totalVideos: number;
  avgViews: number;
  topPerformingFormats: FormatInsight[];
  worstPerformingFormats: FormatInsight[];
  recurringWeaknesses: string[];
  strengths: string[];
  nicheAnalysis: string;
  nextVideoIdeas: VideoIdea[];
  overallVerdict: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function Section({ title, children, delay = 0, accent }: { title: string; children: React.ReactNode; delay?: number; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-6"
    >
      <h2 className={`text-base font-bold mb-4 ${accent ?? 'text-white'}`}>{title}</h2>
      {children}
    </motion.div>
  );
}

export default function AccountResultsPage() {
  const params = useParams();
  const handle = params.handle as string;
  let analysis: AccountAnalysis | null = null;

  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(`account_${handle}`);
      if (cached) {
        const data = JSON.parse(cached);
        analysis = data.analysis;
      }
    } catch {
      analysis = null;
    }
  }

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out my TikTok pattern report for @${handle} on RoastMyTikTok!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${handle} Pattern Report`, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (!analysis) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#128565;</div>
          <p className="text-zinc-400 mb-4">No analysis found. Please analyze your account first.</p>
          <Link
            href="/analyze-account"
            className="text-orange-400 hover:text-orange-300 transition-colors"
          >
            Analyze an account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            <span className="fire-text">@{analysis.handle}</span>
            <span className="text-white"> — Pattern Report</span>
          </h1>
          <p className="text-zinc-400">
            {analysis.totalVideos} videos analyzed &middot; {formatNumber(analysis.avgViews)} avg views
          </p>
        </motion.div>

        {/* Verdict */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6 text-center"
        >
          <p className="text-white text-lg font-medium leading-relaxed">{analysis.overallVerdict}</p>
        </motion.div>

        {/* Niche Analysis */}
        <Section title="Niche Positioning" delay={0.15}>
          <p className="text-zinc-300 leading-relaxed">{analysis.nicheAnalysis}</p>
        </Section>

        {/* What's Working */}
        <Section title="✅ What&apos;s Working" delay={0.2} accent="text-green-400">
          <div className="space-y-3">
            {analysis.topPerformingFormats.map((fmt, i) => (
              <div key={i} className="bg-green-500/5 border border-green-500/15 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{fmt.format}</span>
                  <span className="text-green-400 text-sm font-bold">{formatNumber(fmt.avgViews)} avg views</span>
                </div>
                {fmt.examples && fmt.examples.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {fmt.examples.map((ex, j) => (
                      <p key={j} className="text-zinc-500 text-xs truncate italic">&ldquo;{ex}&rdquo;</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* What's Not Working */}
        <Section title="❌ What&apos;s Not Working" delay={0.25} accent="text-red-400">
          <div className="space-y-3">
            {analysis.worstPerformingFormats.map((fmt, i) => (
              <div key={i} className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{fmt.format}</span>
                  <span className="text-red-400 text-sm font-bold">{formatNumber(fmt.avgViews)} avg views</span>
                </div>
                {fmt.why && <p className="text-zinc-400 text-sm mt-1">{fmt.why}</p>}
              </div>
            ))}
          </div>
        </Section>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Strengths" delay={0.3}>
            <ul className="space-y-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-green-400 shrink-0 mt-0.5">&#10003;</span>
                  <span className="text-zinc-300">{s}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Recurring Weaknesses" delay={0.35}>
            <ul className="space-y-2">
              {analysis.recurringWeaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-red-400 shrink-0 mt-0.5">&#10007;</span>
                  <span className="text-zinc-300">{w}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Next 5 Video Ideas */}
        <Section title="Your Next 5 Videos" delay={0.4}>
          <div className="space-y-4">
            {analysis.nextVideoIdeas.map((idea, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex gap-3">
                  <span className="text-orange-400 font-bold text-lg shrink-0">#{i + 1}</span>
                  <div>
                    <p className="text-white font-semibold">&ldquo;{idea.hook}&rdquo;</p>
                    <p className="text-zinc-500 text-sm mt-1">
                      <span className="text-zinc-400">{idea.format}</span> &middot; {idea.why}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center pt-4 pb-8"
        >
          <button
            onClick={handleShare}
            className="fire-gradient text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Share Report
          </button>
          <Link
            href="/analyze-account"
            className="bg-zinc-800 text-zinc-300 font-semibold px-8 py-3 rounded-xl hover:bg-zinc-700 transition-colors text-center"
          >
            Analyze Another Account
          </Link>
          <Link
            href="/"
            className="bg-zinc-800 text-zinc-300 font-semibold px-8 py-3 rounded-xl hover:bg-zinc-700 transition-colors text-center"
          >
            Roast a Video
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
