'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useSearchParams } from 'next/navigation';
import { RoastResult } from '@/lib/types';
import { ScoreRing } from '@/components/ScoreRing';
import { ScoreCard } from '@/components/ScoreCard';
import { useScoreCardDownload } from '@/hooks/useScoreCardDownload';
import { ViewProjection } from '@/components/ViewProjection';
import { IssueSolutionCard } from '@/components/IssueSolutionCard';
import { saveToHistory, getHistory } from '@/lib/history';
import { buildViewProjection } from '@/lib/view-projection';
import { getFixViewImpact } from '@/lib/view-count-tiers';
import { useToast } from '@/components/ui';
import { RetentionCurve } from '@/components/RetentionCurve';
import { HookAnalysisPanel } from '@/components/HookAnalysisPanel';
import Link from 'next/link';

function isAgentFailed(a: { failed?: boolean; findings?: string[] }): boolean {
  if (a.failed) return true;
  if (a.findings?.[0]?.startsWith('Analysis error')) return true;
  return false;
}

function formatTimestamp(step: NonNullable<RoastResult['actionPlan']>[number]): string {
  if (step.timestampLabel) return step.timestampLabel;
  if (typeof step.timestampSeconds !== 'number') return '';
  const rounded = Math.max(0, Math.round(step.timestampSeconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function RoastPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/roast/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      toast('Link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [id, toast]);

  const handleShareOnX = useCallback((score: number) => {
    const url = `${window.location.origin}/roast/${id}`;
    const text = `My TikTok just got a Viral Score of ${score}/100`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  }, [id]);

  useEffect(() => {
    async function loadRoast() {
      try {
        const cached = sessionStorage.getItem(`roast_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as RoastResult;
          setRoast(parsed);
          setLoading(false);
          const source = searchParams.get('source') === 'upload' ? 'upload' : 'url';
          const filename = searchParams.get('filename') ?? undefined;
          saveToHistory(parsed, source, filename);
          return;
        }
      } catch { /* ignore */ }

      try {
        const res = await fetch(`/api/roast/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRoast(data);
          const source = searchParams.get('source') === 'upload' ? 'upload' : 'url';
          const filename = searchParams.get('filename') ?? undefined;
          saveToHistory(data, source, filename);
        } else {
          setError('Roast not found. It may have expired.');
        }
      } catch {
        setError('Failed to load roast results.');
      }
      setLoading(false);
    }
    loadRoast();
  }, [id, searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-orange-500/8 blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center space-y-4"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl mb-2"
          >
            🔥
          </motion.div>
          <p className="text-white font-bold text-lg">loading your results...</p>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-orange-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
        </motion.div>
      </main>
    );
  }

  if (error || !roast) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#128565;</div>
          <p className="text-zinc-400 mb-4">{error || 'Roast not found.'}</p>
          <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">
            &larr; Try again
          </Link>
        </div>
      </main>
    );
  }

  return <RoastContent roast={roast} copied={copied} handleCopyLink={handleCopyLink} handleShareOnX={handleShareOnX} />;
}

/* ---- Extracted so hooks are unconditional in the outer component ---- */

function RoastContent({
  roast, copied, handleCopyLink, handleShareOnX,
}: {
  roast: RoastResult;
  copied: boolean;
  handleCopyLink: () => void;
  handleShareOnX: (score: number) => void;
}) {
  const history = getHistory();
  const viewProjection = useMemo(() => buildViewProjection(roast), [roast]);
  const usageCount = history.length;
  const [isPaid] = useState(() => {
    if (typeof document === 'undefined') return false;
    const hasPaidCookie = document.cookie.split(';').some(c => c.trim().startsWith('rmt_paid_bypass=1'));
    const hasPlan = !!localStorage.getItem('plan');
    return hasPaidCookie || hasPlan;
  });

  const { squareRef, storyRef, download, downloading } = useScoreCardDownload(roast);

  // Filter action plan to only include steps from non-failed agents
  const failedDimensions = new Set(
    roast.agents.filter(a => isAgentFailed(a)).map(a => a.agent)
  );
  const filteredActionPlan = (roast.actionPlan ?? []).filter(
    step => !failedDimensions.has(step.dimension)
  );
  const hasPartialResults = failedDimensions.size > 0;

  // Sort: hook issues first (highest leverage), then visual/audio, then conversion, then authenticity/accessibility
  // Within each group, P1 > P2 > P3
  const DIMENSION_ORDER: Partial<Record<string, number>> = {
    hook: 0, visual: 1, audio: 2, conversion: 3, authenticity: 4, accessibility: 5,
  };
  const actionPlan = [...filteredActionPlan].sort((a, b) => {
    const dA = DIMENSION_ORDER[a.dimension] ?? 6;
    const dB = DIMENSION_ORDER[b.dimension] ?? 6;
    if (dA !== dB) return dA - dB;
    const pA = parseInt(a.priority?.replace(/\D/g, '') || '3');
    const pB = parseInt(b.priority?.replace(/\D/g, '') || '3');
    return pA - pB;
  });

  return (
    <main className="min-h-screen pb-20 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-orange-500/8 via-pink-500/4 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8">
        {/* Back link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-400 transition-colors group">
            <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
            <span>analyze another video</span>
          </Link>
        </motion.div>

        {/* ========== PARTIAL RESULT NOTICE ========== */}
        {hasPartialResults && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 rounded-lg border border-yellow-500/25 bg-yellow-500/[0.06] px-4 py-3 flex items-start gap-2.5"
          >
            <svg aria-hidden="true" className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-yellow-300/80 leading-relaxed">
              <span className="font-semibold text-yellow-300">Partial results</span> - {failedDimensions.size} of 6 dimension{failedDimensions.size > 1 ? 's' : ''} could not be analyzed (API overload). Scores and recommendations reflect the completed dimensions only. Try uploading again for a full analysis.
            </p>
          </motion.div>
        )}

        {/* ========== SCORE + PROJECTION HERO ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.2 }}
            className="mb-8"
          >
            <ScoreRing score={roast.overallScore} size={170} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="w-full"
          >
            <ViewProjection projection={viewProjection} />
          </motion.div>
        </motion.div>

        {/* Off-screen ScoreCard nodes for html-to-image capture */}
        <div aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <ScoreCard ref={squareRef} roast={roast} variant="square" />
          <ScoreCard ref={storyRef} roast={roast} variant="story" />
        </div>

        {roast.hookAnalysis ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72 }}
          >
            <HookAnalysisPanel hookAnalysis={roast.hookAnalysis} hookIdentification={roast.hookIdentification} />
          </motion.div>
        ) : null}

        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Full Video Analysis</p>

        {/* ========== WHAT TO IMPROVE ========== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-10"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">How to fix it</p>
          {actionPlan.length > 0 ? (
            <div className="space-y-3">
              {actionPlan.map((step, idx) => {
                const isFirstHook = idx === 0 && step.dimension === 'hook';
                const viewImpact = getFixViewImpact(
                  roast.overallScore,
                  step.dimension,
                  step.priority,
                );
                return (
                  <IssueSolutionCard
                    key={`${step.priority}-${step.dimension}-${idx}`}
                    step={step}
                    timestampLabel={formatTimestamp(step)}
                    isHighestImpact={isFirstHook}
                    viewImpact={viewImpact}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 text-center">
              <p className="text-sm text-zinc-400">We couldn&apos;t generate specific recommendations for this video. Try uploading again for a more detailed analysis.</p>
            </div>
          )}
        </motion.div>

        {/* ========== RETENTION CURVE (collapsed) ========== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mb-10"
        >
          <details className="group">
            <summary className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer list-none transition-colors">
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              See where viewers drop off
            </summary>
            <div className="mt-3">
              <RetentionCurve
                hookScore={roast.agents.find(a => a.agent === 'hook')?.score ?? roast.hookSummary?.score ?? 50}
                overallScore={roast.overallScore}
                videoDurationSeconds={roast.metadata.duration > 0 ? roast.metadata.duration : 30}
                timestamps={actionPlan
                  .filter(s => typeof s.timestampSeconds === 'number')
                  .slice(0, 5)
                  .map(s => ({
                    seconds: s.timestampSeconds as number,
                    label: formatTimestamp(s),
                  }))}
              />
            </div>
          </details>
        </motion.div>

        {/* ========== UPGRADE CTA ========== */}
        {usageCount != null && usageCount >= 2 && !isPaid && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="mb-8 rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-5"
          >
            <p className="text-sm font-bold text-orange-300">
              {usageCount} of 3 free analyses used
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {usageCount >= 3
                ? "You've used all 3 free analyses today. Come back tomorrow or upgrade now."
                : 'Upgrade for unlimited analyses and priority processing.'}
            </p>
            <Link
              href="/pricing"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 transition-colors"
            >
              Upgrade &mdash; $9.99/mo &rarr;
            </Link>
          </motion.div>
        )}

        {/* ========== BOTTOM ACTIONS ========== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 flex flex-col items-center gap-4"
        >
          <Link
            href="/"
            className="w-full sm:w-auto text-center rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-3 text-base font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
          >
            Analyze Another Video
          </Link>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <button
              onClick={handleCopyLink}
              aria-label={copied ? 'Link copied' : 'Copy link'}
              title="Copy link"
              className="w-8 h-8 flex items-center justify-center rounded-md hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              {copied ? (
                <span className="text-emerald-400 text-sm">&#x2713;</span>
              ) : (
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              )}
            </button>
            <button
              onClick={() => handleShareOnX(roast.overallScore)}
              aria-label="Share on X"
              title="Share on X"
              className="w-8 h-8 flex items-center justify-center rounded-md hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <svg aria-hidden="true" className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.733-8.835L1.254 2.25H8.08l4.258 5.63L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button
              onClick={() => download('square')}
              disabled={downloading !== null}
              aria-label="Download score image"
              title="Download score image"
              className="w-8 h-8 flex items-center justify-center rounded-md hover:text-zinc-300 hover:bg-zinc-900 transition-colors disabled:opacity-50"
            >
              {downloading === 'square' ? (
                <span className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
              ) : (
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
            </button>
            {history.length > 0 && (
              <>
                <span aria-hidden="true" className="text-zinc-700">&middot;</span>
                <Link
                  href="/history"
                  className="hover:text-zinc-300 transition-colors"
                >
                  View History ({history.length})
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
