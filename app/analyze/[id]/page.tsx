'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AGENTS } from '@/lib/agents';
import { AgentRoast, RoastResult } from '@/lib/types';
import { getSessionId } from '@/lib/history';
import { AnalyzingPreview } from '@/components/AnalyzingPreview';

interface AgentStatus {
  status: 'waiting' | 'analyzing' | 'done';
  result?: AgentRoast;
  score?: number;
}

const DEFAULT_LOADING_MESSAGES = [
  `Reading every frame of your video...`,
  `Cross-referencing 10k viral hooks...`,
  `Mapping where viewers will drop off...`,
  `Calculating your reshoot game plan...`,
];

// Per-dimension rotating copy. The blue commentary bubbles inside
// AnalyzingPreview are tagged by the same dimension keys, so when one of these
// is on screen the bubbles will be saying related things.
const DIMENSION_LOADING_MESSAGES: Record<string, string[]> = {
  hook: [
    `Studying your first 3 seconds...`,
    `Looking for what stops the scroll...`,
    `Mapping where attention drops off...`,
  ],
  visual: [
    `Reading your composition + lighting...`,
    `Counting cuts and motion...`,
    `Checking your 9:16 framing...`,
  ],
  audio: [
    `Listening to your audio mix...`,
    `Checking against trending sounds...`,
    `Measuring your vocal clarity...`,
  ],
  authenticity: [
    `Gauging your delivery and energy...`,
    `Reading your camera presence...`,
  ],
  conversion: [
    `Looking for your call to action...`,
    `Scoring your shareability...`,
    `Spotting your value prop...`,
  ],
  accessibility: [
    `Reading your on-screen text...`,
    `Checking caption timing + contrast...`,
  ],
};

function RotatingMessage({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reset to the first line whenever the source array changes (e.g. when
    // activeDimension flips), so the new dimension's copy starts fresh.
    setIndex(0);
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % messages.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [messages]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35 }}
        className="block"
      >
        {messages[index]}
      </motion.span>
    </AnimatePresence>
  );
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
  const connectedRef = useRef(false);

  // Pre-extracted thumbnail saved by the upload screen
  const [thumb, setThumb] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`videoThumb_${id}`);
      if (raw) setThumb(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [id]);

  // The most recently activated dimension — used to bias bubble selection toward
  // commentary that matches what's actually being analyzed right now.
  const activeDimension =
    Object.entries(agentStatuses).find(([, s]) => s.status === 'analyzing')?.[0] ?? null;

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
    let hookSummary: RoastResult['hookSummary'] | undefined;
    let firstFiveSecondsDiagnosis: RoastResult['firstFiveSecondsDiagnosis'] | undefined;

    const sessionId = getSessionId();
    const eventSource = new EventSource(`/api/analyze/${id}?session_id=${encodeURIComponent(sessionId)}`);

    const timeout = setTimeout(() => {
      eventSource.close();
      setError('Analysis is taking longer than expected. The video may be too long or the service is busy. Please try again.');
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
          overallScore = data.overallScore;
          verdict = data.verdict;
          viralPotential = data.viralPotential ?? 0;
          nichePercentile = data.nichePercentile ?? '';
          biggestBlocker = data.biggestBlocker ?? '';
          nextSteps = data.nextSteps ?? [];
          actionPlan = data.actionPlan ?? [];
          encouragement = data.encouragement ?? '';
          analysisMode = data.analysisMode ?? 'balanced';
          hookSummary = data.hookSummary;
          firstFiveSecondsDiagnosis = data.firstFiveSecondsDiagnosis;
        }

        if (data.type === 'done') {
          clearTimeout(timeout);
          eventSource.close();

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
            hookSummary,
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
          setError(data.message);
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      clearTimeout(timeout);
      eventSource.close();
      setError(`Connection lost. Please try uploading again.`);
    };

    return () => {
      clearTimeout(timeout);
      eventSource.close();
    };
  }, [id, router, searchParams]);

  const completedCount = Object.values(agentStatuses).filter(s => s.status === 'done').length;
  const progressPct = Math.round((completedCount / AGENTS.length) * 100);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-pink-500/5 to-transparent blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-3xl w-full space-y-8">
        {/* Top eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            analyzing your video
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            cooking up your <span className="fire-text">viral diagnosis</span>
          </h1>
        </motion.div>

        {/* Thumbnail + commentary bubbles */}
        <AnalyzingPreview
          thumbDataUrl={thumb?.dataUrl ?? null}
          thumbWidth={thumb?.width ?? null}
          thumbHeight={thumb?.height ?? null}
          activeDimension={activeDimension}
        />

        {/* Status + progress */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-xl space-y-3 text-center"
        >
          <div className="h-7 text-zinc-300 text-sm font-medium">
            <RotatingMessage
              messages={
                (activeDimension && DIMENSION_LOADING_MESSAGES[activeDimension]) ||
                DEFAULT_LOADING_MESSAGES
              }
            />
          </div>
          <p className="text-xs text-zinc-500">{statusMessage}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px] text-zinc-500 uppercase tracking-wider">
              <span>{completedCount} of {AGENTS.length} checks done</span>
              <span className="font-mono text-orange-300">{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-pink-500"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm"
          >
            {error.includes('Rate limit') || error.includes('429') ? (
              <div className="text-center space-y-3">
                <p className="font-semibold text-orange-400">🔒 Free daily limit reached</p>
                <p className="text-zinc-400 text-xs">You&apos;ve used your 3 free roasts today. Come back tomorrow or upgrade for unlimited.</p>
                <a
                  href="/pricing"
                  className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  🔥 Upgrade for Unlimited Roasts
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
                  className="block mt-3 mx-auto text-orange-400 hover:text-orange-300 transition-colors text-sm"
                >
                  &larr; Try again
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Compact check pills (one per dimension) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {AGENTS.map((agent, i) => {
            const status = agentStatuses[agent.key];
            const isActive = status?.status === 'analyzing';
            const isDone = status?.status === 'done';

            return (
              <motion.div
                key={agent.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'border-orange-500/50 bg-orange-500/10 text-orange-200 shadow-lg shadow-orange-500/10'
                    : isDone
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                      : 'border-zinc-800/80 bg-zinc-900/50 text-zinc-500'
                }`}
              >
                <motion.span
                  className="text-sm leading-none"
                  animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {agent.emoji}
                </motion.span>
                <span>{agent.displayName}</span>
                {isDone && status?.score !== undefined && (
                  <span className="font-bold tabular-nums">{status.score}</span>
                )}
                {isActive && (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom hint */}
        {completedCount === 0 && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-zinc-600 text-xs"
          >
            This takes 30-60 seconds. Your roast is worth the wait. 🔥
          </motion.p>
        )}
      </div>
    </main>
  );
}
