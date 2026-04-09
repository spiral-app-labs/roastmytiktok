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
import HookSpotlight from './_components/HookSpotlight';
import DimensionStrip from './_components/DimensionStrip';
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
    <main className="relative min-h-screen pb-24">
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

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-12">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-orange-300"
        >
          <span>←</span> Dashboard
        </Link>

        {failedDimensions.size > 0 && (
          <PartialResultsNotice failedCount={failedDimensions.size} />
        )}

        <RoastMasthead roast={roast} projection={viewProjection} />

        <HookSpotlight roast={roast} videoId={id} />

        <PlaybookStack steps={filteredActionPlan} overallScore={roast.overallScore} />

        <DimensionStrip agents={roast.agents} />

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
