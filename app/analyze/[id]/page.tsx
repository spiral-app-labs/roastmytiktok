'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AGENTS } from '@/lib/agents';
import { AgentRoast, RoastResult } from '@/lib/types';
import { getSessionId } from '@/lib/history';
import {
  AnalysisStageProgress,
  deriveAnalysisProgressPercent,
  deriveAnalysisStageIndex,
} from '@/components/upload/AnalysisStageProgress';
import { getUploadErrorMessage } from '@/components/upload/uploadFlow';

interface AgentStatus {
  status: 'waiting' | 'analyzing' | 'done';
  result?: AgentRoast;
  score?: number;
}

// Fun rotating messages per agent while they analyze
const AGENT_LOADING_MESSAGES: Record<string, string[]> = {
  hook: [
    `Judging your first 3 seconds like a TikTok addict with zero patience...`,
    `Calculating how fast you'd make me scroll...`,
    `Checking if you pass the "thumb stop" test...`,
    `Asking: would I watch this or swipe immediately?`,
  ],
  visual: [
    `Analyzing lighting like your mom's disappointed face...`,
    `Checking if your background looks like a college dorm or a studio...`,
    `Roasting your camera angle choices in real time...`,
    `Figuring out if your setup says "creator" or "just got out of bed"...`,
  ],
  caption: [
    `Reading your on-screen text with extreme judgment...`,
    `Checking if anyone can actually read your captions...`,
    `Looking for CTAs that probably don't exist...`,
    `Evaluating your font choices (sorry in advance)...`,
  ],
  audio: [
    `Listening closely and wincing occasionally...`,
    `Checking if the music drowns you out (spoiler: probably)...`,
    `Analyzing your voice energy and mic game...`,
    `Asking: is this audio or a hostage situation?`,
  ],
  algorithm: [
    `Doing TikTok algorithm math that would bore you to tears...`,
    `Counting hashtags and judging each one personally...`,
    `Checking your engagement bait strategy (or lack thereof)...`,
    `Asking: did you study the algorithm or just wing it?`,
  ],
  authenticity: [
    `Doing a full vibe check on your creator energy...`,
    `Detecting scripted vs genuine human behavior...`,
    `Asking the hard question: do people actually like you?`,
    `Checking if your personality came through or stayed home...`,
  ],
  conversion: [
    `Counting how many times you forgot to say "follow me"...`,
    `Looking for CTAs that would actually make people act...`,
    `Checking if this video converts or just exists...`,
    `Running ROI analysis on your content strategy...`,
  ],
};

function RotatingMessage({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
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
  const [verdictReady, setVerdictReady] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const connectedRef = useRef(false);

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
          hookSummary = data.hookSummary;
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-pink-500/5 to-transparent blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-5xl w-full space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <AnalysisStageProgress
            activeIndex={stageIndex}
            progressPercent={progressPct}
            eyebrow="Go Viral analysis running"
            title="Building your Go Viral diagnosis"
            description="The analysis is moving through the real pipeline: upload handoff, frame extraction, opener scoring, pacing review, audio and caption checks, then the final action plan."
            liveDetail={statusMessage}
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
                <p className="font-semibold text-orange-400">Free limit reached</p>
                <p className="text-zinc-400 text-xs">{getUploadErrorMessage('rate_limited')}</p>
                <a
                  href="/pricing"
                  className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition-opacity"
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
                  className="block mt-3 mx-auto text-orange-400 hover:text-orange-300 transition-colors text-sm"
                >
                  &larr; Try again
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Agent Progress Cards */}
        <div className="space-y-3 text-left">
          {AGENTS.map((agent, i) => {
            const status = agentStatuses[agent.key];
            const isActive = status?.status === 'analyzing';
            const isDone = status?.status === 'done';
            const result = status?.result;
            const loadingMessages = AGENT_LOADING_MESSAGES[agent.key] ?? DEFAULT_LOADING_MESSAGES;

            return (
              <motion.div
                key={agent.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                layout
                className={`rounded-xl border transition-all duration-500 overflow-hidden ${
                  isActive
                    ? 'bg-zinc-900/80 border-orange-500/50 card-glow shadow-lg shadow-orange-500/5'
                    : isDone
                      ? 'bg-zinc-900/40 border-green-500/30'
                      : 'bg-zinc-900/20 border-zinc-800/30 opacity-50'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Emoji with pulse on active */}
                  <motion.span
                    className="text-2xl"
                    animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {agent.emoji}
                  </motion.span>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{agent.name}</div>
                    {isActive ? (
                      <div className="text-xs text-orange-400/80 truncate">
                        <RotatingMessage messages={loadingMessages} />
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500">{agent.analyzes}</div>
                    )}
                  </div>

                  <div className="text-sm flex items-center gap-2 shrink-0">
                    {isDone ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-2"
                      >
                        {status.score !== undefined && (
                          <span className={`text-xl font-bold font-mono ${
                            status.score >= 70 ? 'text-green-400' :
                            status.score >= 50 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {status.score}<span className="text-xs text-zinc-500">/100</span>
                          </span>
                        )}
                        <span className="text-green-500 text-lg">✓</span>
                      </motion.div>
                    ) : isActive ? (
                      <span className="text-orange-400 flex items-center gap-2">
                        <motion.span
                          className="h-2.5 w-2.5 rounded-full bg-orange-400"
                          animate={{ opacity: [1, 0.35, 1], scale: [1, 1.25, 1] }}
                          transition={{ duration: 1.1, repeat: Infinity }}
                        />
                        <span className="text-xs">Analyzing</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs">Waiting</span>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isDone && result && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2 border-t border-zinc-800/50 pt-3">
                        <p className="text-sm text-zinc-300 leading-relaxed">{result.roastText}</p>
                        <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-800/30 rounded-lg p-2.5">
                          <span className="text-orange-400 mt-0.5 shrink-0">💡</span>
                          <span>{result.improvementTip}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active shimmer bar */}
                {isActive && (
                  <div className="h-0.5 bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
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
            Progress advances as each analysis stage finishes, then the final action plan is assembled.
          </motion.p>
        )}
      </div>
    </main>
  );
}
