'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AGENTS } from '@/lib/agents';
import { HistoryEntry } from '@/lib/history';
import { DimensionKey } from '@/lib/types';

interface HistoryViewProps {
  history: HistoryEntry[];
}

function ScorePill({ score }: { score: number }) {
  const bg = score >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : score >= 60 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    : score >= 40 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20';
  return (
    <span className={`inline-flex items-center justify-center w-11 h-7 rounded-md border text-xs font-bold ${bg}`}>
      {score}
    </span>
  );
}

function TrendIndicator({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-zinc-600">--</span>;
  return (
    <span className={`text-xs font-semibold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {diff > 0 ? '+' : ''}{diff}
    </span>
  );
}

export default function HistoryView({ history }: HistoryViewProps) {
  const enrichedHistory = useMemo(() => {
    return history.map((entry, i) => {
      const prev = history[i + 1];
      return { ...entry, prev };
    });
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No history yet</h3>
        <p className="text-sm text-zinc-500">Your analyzed videos will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Analysis History</h2>
          <p className="text-sm text-zinc-500 mt-1">{history.length} video{history.length !== 1 ? 's' : ''} analyzed</p>
        </div>
      </div>

      <div className="space-y-3">
        {enrichedHistory.map((entry, i) => (
          <motion.a
            key={entry.id}
            href={`/roast/${entry.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className="block bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700/60 hover:bg-zinc-800/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              {/* Score Badge */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${
                entry.overallScore >= 80 ? 'bg-green-500/10 border-green-500/20' :
                entry.overallScore >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' :
                entry.overallScore >= 40 ? 'bg-orange-500/10 border-orange-500/20' :
                'bg-red-500/10 border-red-500/20'
              }`}>
                <span className={`text-xl font-bold ${
                  entry.overallScore >= 80 ? 'text-green-400' :
                  entry.overallScore >= 60 ? 'text-yellow-400' :
                  entry.overallScore >= 40 ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {entry.overallScore}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">{entry.filename || 'Uploaded video'}</p>
                  <TrendIndicator current={entry.overallScore} previous={entry.prev?.overallScore} />
                </div>
                <p className="text-xs text-zinc-600 mb-2">
                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>

                {/* Agent Scores Row */}
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(entry.agentScores) as [DimensionKey, number][]).map(([dim, score]) => {
                    const agent = AGENTS.find((a) => a.key === dim);
                    const prevScore = entry.prev?.agentScores[dim];
                    const diff = prevScore !== undefined ? score - prevScore : 0;
                    return (
                      <div key={dim} className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/30">
                        <span className="text-xs">{agent?.emoji}</span>
                        <span className="text-xs font-medium text-zinc-300">{score}</span>
                        {diff !== 0 && (
                          <span className={`text-[10px] font-semibold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Arrow */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0">
                <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Verdict */}
            {entry.verdict && (
              <p className="text-xs text-zinc-500 mt-3 pl-[72px] italic line-clamp-1">&ldquo;{entry.verdict}&rdquo;</p>
            )}
          </motion.a>
        ))}
      </div>
    </div>
  );
}
