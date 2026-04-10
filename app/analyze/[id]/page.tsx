'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AGENTS } from '@/lib/agents';
import { AgentRoast, RoastResult } from '@/lib/types';
import { getSessionId } from '@/lib/history';
import { AnalyzingPreview } from '@/components/AnalyzingPreview';
import {
  AnalysisStageProgress,
  deriveAnalysisProgressPercent,
  deriveAnalysisStageIndex,
} from '@/components/upload/AnalysisStageProgress';
import { getUploadErrorMessage } from '@/components/upload/uploadFlow';
import {
  cacheThumbnail,
  extractFirstFrame,
  getCachedThumbnail,
  getSignedVideoUrl,
} from '@/lib/video-thumbnails';

interface AgentStatus {
  status: 'waiting' | 'analyzing' | 'done';
  result?: AgentRoast;
  score?: number;
}

async function getImageDimensions(src: string): Promise<{ width: number | null; height: number | null }> {
  if (typeof window === 'undefined') return { width: null, height: null };

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null });
    };
    img.onerror = () => resolve({ width: null, height: null });
    img.src = src;
  });
}

export default function AnalyzePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(
    Object.fromEntries(AGENTS.map(a => [a.key, { status: 'waiting' as const }]))
  );
  const [statusMessage, setStatusMessage] = useState(`Connecting to analysis pipeline...`);
  const [error, setError] = useState<string | null>(null);
  const [verdictReady, setVerdictReady] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [thumbDataUrl, setThumbDataUrl] = useState<string | null>(() => getCachedThumbnail(id));
  const [thumbWidth, setThumbWidth] = useState<number | null>(null);
  const [thumbHeight, setThumbHeight] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function loadMedia() {
      const cached = getCachedThumbnail(id);
      if (cached) {
        setThumbDataUrl(cached);
        const dims = await getImageDimensions(cached);
        if (!cancelled) {
          setThumbWidth(dims.width);
          setThumbHeight(dims.height);
        }
        return;
      }

      try {
        const signedUrl = await getSignedVideoUrl(id, abortController.signal);
        if (!signedUrl || cancelled) return;
        setVideoUrl(signedUrl);

        const frame = await extractFirstFrame(signedUrl);
        if (cancelled) return;

        cacheThumbnail(id, frame);
        setThumbDataUrl(frame);
        const dims = await getImageDimensions(frame);
        if (!cancelled) {
          setThumbWidth(dims.width);
          setThumbHeight(dims.height);
        }
      } catch {
        if (!cancelled) {
          setThumbWidth(null);
          setThumbHeight(null);
        }
      }
    }

    void loadMedia();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [id]);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    const agentResults: AgentRoast[] = [];
    let overallScore = 0;
    let verdict = '';
    let viralPotential = 0;
    let nichePercentile = '';
    let biggestBlocker = '';
    let nextSteps: string[] = [];
    let actionPlan: RoastResult['actionPlan'] = [];
    let encouragement = '';
    let analysisMode: RoastResult['analysisMode'] = 'balanced';
    let analysisExpansion: RoastResult['analysisExpansion'] = 'hook_only';
    let hookSummary: RoastResult['hookSummary'] | undefined;
    let hookAnalysis: RoastResult['hookAnalysis'] | undefined;
    let hookPredictions: RoastResult['hookPredictions'] | undefined;
    let fixTracks: RoastResult['fixTracks'] | undefined;
    let firstFiveSecondsDiagnosis: RoastResult['firstFiveSecondsDiagnosis'] | undefined;

    const sessionId = getSessionId();
    const eventSource = new EventSource(`/api/analyze/${id}?session_id=${encodeURIComponent(sessionId)}`);

    const timeout = setTimeout(() => {
      eventSource.close();
      setError(getUploadErrorMessage('analysis_failed'));
    }, 3 * 60 * 1000);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          setStatusMessage(data.message);
        }

        if (data.type === 'agent') {
          if (data.status === 'analyzing') {
            setAgentStatuses(prev => ({
              ...prev,
              [data.agent]: { status: 'analyzing' },
            }));
          }
          if (data.status === 'done' && data.result) {
            agentResults.push(data.result);
            setAgentStatuses(prev => ({
              ...prev,
              [data.agent]: { status: 'done', result: data.result, score: data.result.score },
            }));
          }
        }

        if (data.type === 'verdict') {
          setVerdictReady(true);
          overallScore = data.overallScore;
          verdict = data.verdict;
          viralPotential = data.viralPotential ?? 0;
          nichePercentile = data.nichePercentile ?? '';
          biggestBlocker = data.biggestBlocker ?? '';
          nextSteps = data.nextSteps ?? [];
          actionPlan = data.actionPlan ?? [];
          encouragement = data.encouragement ?? '';
          analysisMode = data.analysisMode ?? 'balanced';
          analysisExpansion = data.analysisExpansion ?? 'hook_only';
          hookSummary = data.hookSummary;
          hookAnalysis = data.hookAnalysis;
          hookPredictions = data.hookPredictions;
          fixTracks = data.fixTracks;
          firstFiveSecondsDiagnosis = data.firstFiveSecondsDiagnosis;
        }

        if (data.type === 'done') {
          clearTimeout(timeout);
          eventSource.close();
          setAnalysisDone(true);

          const result: RoastResult = {
            id: data.id,
            tiktokUrl: '',
            overallScore,
            verdict,
            viralPotential,
            ...(nichePercentile ? { nichePercentile } : {}),
            biggestBlocker,
            nextSteps,
            actionPlan,
            encouragement,
            analysisMode,
            analysisExpansion,
            hookSummary,
            hookAnalysis,
            hookPredictions,
            fixTracks,
            firstFiveSecondsDiagnosis,
            agents: agentResults,
            metadata: {
              duration: 0,
              description: 'Uploaded video',
            },
          };

          try {
            sessionStorage.setItem(`roast_${data.id}`, JSON.stringify(result));
          } catch { /* sessionStorage may be full */ }

          const source = searchParams.get('source') ?? 'upload';
          const filename = searchParams.get('filename') ?? '';
          setTimeout(() => {
            router.push(`/roast/${data.id}?source=${source}&filename=${encodeURIComponent(filename)}`);
          }, 800);
        }

        if (data.type === 'error') {
          clearTimeout(timeout);
          eventSource.close();
          setError(
            typeof data.message === 'string' && (data.message.includes('429') || data.message.toLowerCase().includes('free limit'))
              ? getUploadErrorMessage('rate_limited')
              : getUploadErrorMessage('analysis_failed')
          );
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      clearTimeout(timeout);
      eventSource.close();
      setError(getUploadErrorMessage('analysis_failed'));
    };

    return () => {
      clearTimeout(timeout);
      eventSource.close();
    };
  }, [id, router, searchParams]);

  const completedCount = Object.values(agentStatuses).filter(s => s.status === 'done').length;
  const hookStarted = agentStatuses.hook?.status !== 'waiting';
  const mediaAgentsStarted =
    agentStatuses.audio?.status !== 'waiting' || agentStatuses.accessibility?.status !== 'waiting';
  const stageIndex = deriveAnalysisStageIndex({
    uploadComplete: true,
    statusMessage,
    completedAgents: completedCount,
    totalAgents: AGENTS.length,
    hookStarted,
    mediaAgentsStarted,
    verdictReady,
    done: analysisDone,
  });
  const progressPct = deriveAnalysisProgressPercent(stageIndex, completedCount, AGENTS.length);
  const activePreviewDimension = useMemo(() => {
    const analyzingAgent = AGENTS.find((agent) => agentStatuses[agent.key]?.status === 'analyzing');
    if (analyzingAgent) return analyzingAgent.key;
    if (!analysisDone) return hookStarted ? 'accessibility' : 'hook';
    return null;
  }, [agentStatuses, analysisDone, hookStarted]);
  const activeAgent = useMemo(
    () => AGENTS.find((agent) => agent.key === activePreviewDimension) ?? null,
    [activePreviewDimension],
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-sky-500/10 via-blue-500/6 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-violet-500/8 to-transparent blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-5xl w-full space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <AnalysisStageProgress
            activeIndex={stageIndex}
            progressPercent={progressPct}
            eyebrow="Hook-first analysis running"
            title="Building your hook survival report"
            description="The analysis now starts where TikTok starts: the first 3 to 6 seconds. We extract hook frames, read the opener, score hold through 3s and 5s, then decide whether the rest of the video is worth analyzing."
            liveDetail={statusMessage}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45 }}
          className="rounded-[32px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 backdrop-blur-sm sm:px-5 sm:py-4"
        >
          <AnalyzingPreview
            thumbDataUrl={thumbDataUrl}
            thumbWidth={thumbWidth}
            thumbHeight={thumbHeight}
            videoUrl={videoUrl}
            activeDimension={activePreviewDimension}
          />
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm"
          >
            {error === getUploadErrorMessage('rate_limited') ? (
              <div className="text-center space-y-3">
                <p className="font-semibold text-sky-300">Free limit reached</p>
                <p className="text-zinc-400 text-xs">{getUploadErrorMessage('rate_limited')}</p>
                <a
                  href="/pricing"
                  className="inline-block rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  Upgrade
                </a>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="block mt-1 mx-auto text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
                >
                  ← Back to dashboard
                </button>
              </div>
            ) : (
              <>
                {error}
                <button
                  onClick={() => router.push('/')}
                  className="block mt-3 mx-auto text-sky-300 transition-colors text-sm hover:text-sky-200"
                >
                  &larr; Try again
                </button>
              </>
            )}
          </motion.div>
        )}

        {!error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] px-5 py-4 backdrop-blur-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Current pass
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {activeAgent ? `${activeAgent.emoji} ${activeAgent.name}` : 'Preparing hook read'}
                </p>
              </div>
              <div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-sky-300">
                {completedCount}/{AGENTS.length} checks finished
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {statusMessage}
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
