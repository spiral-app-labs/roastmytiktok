'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import type { DimensionKey, RoastResult } from '@/lib/types';
import { ScoreCard } from '@/components/ScoreCard';
import { useScoreCardDownload } from '@/hooks/useScoreCardDownload';
import { saveToHistory } from '@/lib/history';
import { buildViewProjection } from '@/lib/view-projection';
import { useToast } from '@/components/ui';

import RoastMasthead from './_components/RoastMasthead';
import DimensionStrip from './_components/DimensionStrip';
import ProjectionBand from './_components/ProjectionBand';
import HookReadingPanel from './_components/HookReadingPanel';
import PlaybookStack from './_components/PlaybookStack';
import RetentionPanel from './_components/RetentionPanel';
import PartialResultsNotice from './_components/PartialResultsNotice';
import RoastFooter from './_components/RoastFooter';
import { LoadingState, ErrorState } from './_components/RoastStatusStates';
import { filterActionPlan, isAgentFailed, sortActionPlan } from './_components/helpers';

export default function RoastPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // React 19 StrictMode double-invokes effects in dev. Guard saveToHistory
  // so the same roast isn't written twice per page load.
  const historySavedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRoast() {
      const source = searchParams.get('source') === 'upload' ? 'upload' : 'url';
      const filename = searchParams.get('filename') ?? undefined;

      // Try sessionStorage first
      try {
        const cached = sessionStorage.getItem(`roast_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as RoastResult;
          if (cancelled) return;
          setRoast(parsed);
          setLoading(false);
          if (!historySavedRef.current) {
            historySavedRef.current = true;
            saveToHistory(parsed, source, filename);
          }
          return;
        }
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(`/api/roast/${id}`);
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as RoastResult;
          if (cancelled) return;
          setRoast(data);
          if (!historySavedRef.current) {
            historySavedRef.current = true;
            saveToHistory(data, source, filename);
          }
        } else {
          setError('Roast not found. It may have expired.');
        }
      } catch {
        if (!cancelled) setError('Failed to load roast results.');
      }

      if (!cancelled) setLoading(false);
    }

    loadRoast();
    return () => {
      cancelled = true;
    };
  }, [id, searchParams]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !roast) {
    return <ErrorState message={error} />;
  }

  return <RoastContent roast={roast} id={id} />;
}

interface RoastContentProps {
  roast: RoastResult;
  id: string;
}

function RoastContent({ roast, id }: RoastContentProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const { squareRef, storyRef, download, downloading } = useScoreCardDownload(roast);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/roast/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied to clipboard', 'success');
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      toast('Link copied to clipboard', 'success');
    }
  }, [id, toast]);

  // Separate effect so the copy-reset timeout is cleaned up on unmount.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleShareOnX = useCallback(() => {
    const url = `${window.location.origin}/roast/${id}`;
    const text = `My TikTok just got a Viral Score of ${roast.overallScore}/100`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  }, [id, roast.overallScore]);

  const viewProjection = useMemo(() => buildViewProjection(roast), [roast]);

  const { failedDimensions, filteredActionPlan } = useMemo(() => {
    const failed = new Set<DimensionKey>(
      roast.agents.filter(isAgentFailed).map((a) => a.agent),
    );
    return {
      failedDimensions: failed,
      filteredActionPlan: sortActionPlan(filterActionPlan(roast.actionPlan ?? [], failed)),
    };
  }, [roast]);

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      {/* Ambient orbs — lower intensity to let the editorial content breathe */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-orange-500/8 blur-[140px]" />
        <div className="absolute left-[70%] top-[160px] h-[500px] w-[500px] max-w-[110vw] -translate-x-1/2 rounded-full bg-pink-500/7 blur-[130px]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.03] mix-blend-overlay">
          <filter id="roast-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#roast-noise)" />
        </svg>
      </div>

      {/* Off-screen ScoreCard nodes for html-to-image capture */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <ScoreCard ref={squareRef} roast={roast} variant="square" />
        <ScoreCard ref={storyRef} roast={roast} variant="story" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-20 sm:px-8 lg:px-12 lg:pt-14">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-orange-300"
        >
          <span>←</span> Dashboard
        </Link>

        {failedDimensions.size > 0 && (
          <PartialResultsNotice failedCount={failedDimensions.size} />
        )}

        <RoastMasthead roast={roast} />

        <div className="mt-10">
          <DimensionStrip agents={roast.agents} />
        </div>

        <ProjectionBand projection={viewProjection} />

        <HookReadingPanel roast={roast} />

        <PlaybookStack steps={filteredActionPlan} overallScore={roast.overallScore} />

        <RetentionPanel roast={roast} steps={filteredActionPlan} />

        <RoastFooter
          copied={copied}
          onCopyLink={handleCopyLink}
          onShareOnX={handleShareOnX}
          onDownload={download}
          downloading={downloading}
        />
      </div>
    </main>
  );
}
