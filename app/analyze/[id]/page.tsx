'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AGENTS } from '@/lib/agents';
import { AgentRoast, RoastResult } from '@/lib/types';
import { getSessionId } from '@/lib/history';

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

const DEFAULT_LOADING_MESSAGES = [
  `Waking up the AI agents...`,
  `Loading judgment algorithms...`,
  `Preparing savage but accurate feedback...`,
  `Spinning up the roast engines...`,
];

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

    const sessionId = getSessionId();
    const eventSource = new EventSource(`/api/analyze/${id}?session_id=${encodeURIComponent(sessionId)}`);

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
        }

        if (data.type === 'done') {
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
            agents: agentResults,
            metadata: {
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              duration: 0,
              hashtags: [],
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
          eventSource.close();
          setError(data.message);
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setError(`Connection lost. Please try uploading again.`);
    };

    return () => {
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

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Animated fire emoji */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [-3, 3, -3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl"
          >
            🔥
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="fire-text">Roasting</span> your TikTok...
          </h1>

          <div className="h-8 text-zinc-400 text-sm">
            <RotatingMessage messages={DEFAULT_LOADING_MESSAGES} />
          </div>
          <p className="text-xs text-zinc-500">{statusMessage}</p>

          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-500">
              <span>{completedCount} / {AGENTS.length} agents done</span>
              <span className="font-mono">{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
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
            {error}
            <button
              onClick={() => router.push('/')}
              className="block mt-3 mx-auto text-orange-400 hover:text-orange-300 transition-colors text-sm"
            >
              &larr; Try again
            </button>
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
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
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
            This takes 30–60 seconds. Your roast is worth the wait. 🔥
          </motion.p>
        )}
      </div>
    </main>
  );
}
