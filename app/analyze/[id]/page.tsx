'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AGENTS } from '@/lib/agents';
import { AgentRoast, RoastResult, DimensionKey } from '@/lib/types';

interface AgentStatus {
  status: 'waiting' | 'analyzing' | 'done';
  result?: AgentRoast;
  score?: number;
}

export default function AnalyzePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(
    Object.fromEntries(AGENTS.map(a => [a.key, { status: 'waiting' as const }]))
  );
  const [statusMessage, setStatusMessage] = useState('Connecting to analysis pipeline...');
  const [error, setError] = useState<string | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    const agentResults: AgentRoast[] = [];
    let overallScore = 0;
    let verdict = '';

    const eventSource = new EventSource(`/api/analyze/${id}`);

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
        }

        if (data.type === 'done') {
          eventSource.close();

          // Build full result and store in sessionStorage
          const result: RoastResult = {
            id: data.id,
            tiktokUrl: '',
            overallScore,
            verdict,
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

          // Navigate to results
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
      setError('Connection lost. Please try uploading again.');
    };

    return () => {
      eventSource.close();
    };
  }, [id, router, searchParams]);

  const completedCount = Object.values(agentStatuses).filter(s => s.status === 'done').length;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="fire-text">Analyzing</span> your TikTok...
          </h1>
          <p className="text-zinc-500 mt-2 text-sm">
            {statusMessage}
          </p>
          {completedCount > 0 && (
            <p className="text-zinc-600 text-xs mt-1">
              {completedCount} / {AGENTS.length} agents complete
            </p>
          )}
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

            return (
              <motion.div
                key={agent.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                  isActive
                    ? 'bg-zinc-900/80 border-orange-500/50 card-glow'
                    : isDone
                      ? 'bg-zinc-900/40 border-green-500/30'
                      : 'bg-zinc-900/20 border-zinc-800/30 opacity-50'
                }`}
              >
                <span className="text-2xl">{agent.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{agent.name}</div>
                  <div className="text-xs text-zinc-500">{agent.analyzes}</div>
                </div>
                <div className="text-sm flex items-center gap-2">
                  {isDone ? (
                    <>
                      <span className="text-green-400">Done</span>
                      {status.score !== undefined && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          status.score >= 70 ? 'bg-green-500/20 text-green-400' :
                          status.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {status.score}
                        </span>
                      )}
                    </>
                  ) : isActive ? (
                    <span className="text-orange-400 flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing
                    </span>
                  ) : (
                    <span className="text-zinc-600">Waiting</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
