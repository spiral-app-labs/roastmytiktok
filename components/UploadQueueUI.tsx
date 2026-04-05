'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENTS } from '@/lib/agents';
import { getSessionId, fetchHistory, HistoryEntry } from '@/lib/history';

// ─── Types ───────────────────────────────────────────────────────────────────

type QueueItemStatus = 'pending' | 'uploading' | 'analyzing' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string | null;
  status: QueueItemStatus;
  progress: number; // 0-100
  score?: number;
  roastId?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

interface BatchSummary {
  averageScore: number;
  bestItem: QueueItem;
  worstItem: QueueItem;
  totalTimeMs: number;
  completedCount: number;
}

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB
const MAX_QUEUE_SIZE = 5;

const STATUS_LABELS: Record<QueueItemStatus, string> = {
  pending: '⏳ Pending',
  uploading: '📤 Uploading',
  analyzing: '🔄 Analyzing',
  done: '✅ Done',
  error: '❌ Error',
};

const STORAGE_KEY = 'rmt_upload_queue_v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// Persist queue metadata (not file blobs) to localStorage
interface PersistedItem {
  id: string;
  filename: string;
  fileSize: number;
  status: QueueItemStatus;
  score?: number;
  roastId?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

function saveQueueToStorage(items: QueueItem[]) {
  try {
    const persisted: PersistedItem[] = items.map((item) => ({
      id: item.id,
      filename: item.file.name,
      fileSize: item.file.size,
      status: item.status === 'uploading' || item.status === 'analyzing' ? 'pending' : item.status,
      score: item.score,
      roastId: item.roastId,
      error: item.error,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore storage errors
  }
}

function loadQueueFromStorage(): PersistedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PersistedItem[];
  } catch {
    return [];
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;
  const color = score >= 70 ? '#4ade80' : score >= 50 ? '#facc15' : '#f87171';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - strokeDash }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span
        className="absolute text-xs font-black tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function ProgressBar({ progress, status }: { progress: number; status: QueueItemStatus }) {
  const barColor =
    status === 'done'
      ? 'from-green-500 to-emerald-400'
      : status === 'error'
        ? 'from-red-500 to-red-400'
        : 'from-orange-500 to-pink-500';

  return (
    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      {(status === 'uploading' || status === 'analyzing') && progress < 95 && (
        <motion.div
          className="h-full w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent absolute top-0"
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
}

function QueueItemCard({
  item,
  index,
  isActive,
  onRemove,
  onRetry,
}: {
  item: QueueItem;
  index: number;
  isActive: boolean;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const canRemove = item.status === 'pending' || item.status === 'done' || item.status === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`relative rounded-xl border transition-all duration-300 overflow-hidden ${
        isActive
          ? 'bg-zinc-900/90 border-orange-500/50 shadow-lg shadow-orange-500/10'
          : item.status === 'done'
            ? 'bg-zinc-900/60 border-green-500/20'
            : item.status === 'error'
              ? 'bg-zinc-900/60 border-red-500/20'
              : 'bg-zinc-900/40 border-zinc-800/40'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail or icon */}
        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-zinc-800/60 flex items-center justify-center">
          {item.previewUrl ? (
            <video
              src={item.previewUrl}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <span className="text-lg">🎬</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-white font-semibold truncate leading-tight">{item.file.name}</p>
            {canRemove && (
              <button
                onClick={() => onRemove(item.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-500">{formatFileSize(item.file.size)}</span>
            <motion.span
              key={item.status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-xs font-medium ${
                item.status === 'done'
                  ? 'text-green-400'
                  : item.status === 'error'
                    ? 'text-red-400'
                    : isActive
                      ? 'text-orange-400'
                      : 'text-zinc-500'
              }`}
            >
              {STATUS_LABELS[item.status]}
            </motion.span>
          </div>

          <ProgressBar progress={item.progress} status={item.status} />
        </div>

        {/* Score ring */}
        <AnimatePresence>
          {item.status === 'done' && item.score !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="shrink-0"
            >
              {item.roastId ? (
                <Link href={`/roast/${item.roastId}`} className="block hover:scale-105 transition-transform">
                  <ScoreRing score={item.score} size={48} />
                </Link>
              ) : (
                <ScoreRing score={item.score} size={48} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error icon */}
        {item.status === 'error' && (
          <div className="shrink-0 text-red-400 text-lg">❌</div>
        )}

        {/* Active spinner */}
        {isActive && item.status !== 'done' && item.status !== 'error' && (
          <div className="shrink-0">
            <svg className="animate-spin h-5 w-5 text-orange-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {item.status === 'error' && item.error && (
        <div className="px-3 pb-3 space-y-1.5">
          <p className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-2 py-1.5">{item.error}</p>
          {item.error.includes('Free limit reached') || item.error.includes('daily limit') ? (
            <a
              href="/pricing"
              className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg px-2 py-1.5 transition-colors"
            >
              🔥 Upgrade for unlimited roasts →
            </a>
          ) : (
            <button
              onClick={() => onRetry(item.id)}
              className="mt-2 w-full text-xs font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg px-2 py-1.5 transition-colors"
            >
              ↺ Retry
            </button>
          )}
        </div>
      )}

      {/* Active shimmer line */}
      {isActive && (
        <div className="h-0.5 bg-zinc-800 overflow-hidden relative">
          <motion.div
            className="absolute h-full w-1/3 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
}

function BatchSummaryCard({
  summary,
  onViewAll,
  onClearQueue,
}: {
  summary: BatchSummary;
  onViewAll: () => void;
  onClearQueue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="bg-gradient-to-br from-zinc-900/90 to-zinc-900/70 border border-orange-500/30 rounded-2xl p-5 backdrop-blur-sm shadow-xl shadow-orange-500/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏆</span>
        <h3 className="text-base font-bold text-white">Batch Complete!</h3>
        <span className="ml-auto text-xs text-zinc-500">{formatDuration(summary.totalTimeMs)}</span>
      </div>

      {/* Big average score */}
      <div className="flex items-center justify-center mb-4">
        <div className="text-center">
          <div className="text-5xl font-black text-white tabular-nums">
            <span
              className={
                summary.averageScore >= 70
                  ? 'text-green-400'
                  : summary.averageScore >= 50
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }
            >
              {summary.averageScore}
            </span>
            <span className="text-zinc-600 text-2xl">/100</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">Average Score</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-zinc-800/50 rounded-xl p-3 border border-green-500/20">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm">🥇</span>
            <span className="text-xs text-zinc-500 font-medium">Best Video</span>
          </div>
          <p className="text-white text-sm font-semibold truncate">{summary.bestItem.file.name}</p>
          <p className="text-green-400 font-black text-lg">{summary.bestItem.score}/100</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 border border-red-500/20">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm">🤦</span>
            <span className="text-xs text-zinc-500 font-medium">Needs Work</span>
          </div>
          <p className="text-white text-sm font-semibold truncate">{summary.worstItem.file.name}</p>
          <p className="text-red-400 font-black text-lg">{summary.worstItem.score}/100</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onViewAll}
          className="flex-1 fire-gradient text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
        >
          View All Results →
        </button>
        <button
          onClick={onClearQueue}
          className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600 transition-all"
        >
          New Batch
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ history }: { history: HistoryEntry[] }) {
  const total = history.length;
  const avg = total > 0 ? Math.round(history.reduce((s, h) => s + h.overallScore, 0) / total) : 0;
  const best = total > 0 ? Math.max(...history.map((h) => h.overallScore)) : 0;
  if (total === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3 mb-6"
    >
      {[
        { label: 'Total Roasts', value: total, icon: '🔥' },
        { label: 'Avg Score', value: `${avg}/100`, icon: '📊' },
        { label: 'Best Score', value: `${best}/100`, icon: '🏆' },
      ].map((stat) => (
        <div
          key={stat.label}
          className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center"
        >
          <div className="text-lg mb-0.5">{stat.icon}</div>
          <div className="text-white font-black text-lg leading-tight">{stat.value}</div>
          <div className="text-zinc-500 text-xs">{stat.label}</div>
        </div>
      ))}
    </motion.div>
  );
}

function DropGlow({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(251,146,60,0.18) 0%, transparent 70%)',
            boxShadow: 'inset 0 0 30px rgba(251,146,60,0.2)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UploadQueueUI() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueOpen, setQueueOpen] = useState(true);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const router = useRouter();

  // Load history
  useEffect(() => {
    fetchHistory().then((h) => {
      setHistory(h);
      setHistoryLoading(false);
    });
  }, []);

  // Restore persisted queue state on mount (done/error items only)
  useEffect(() => {
    const persisted = loadQueueFromStorage();
    if (persisted.length === 0) return;

    // Only restore completed/error items (we can't resume in-flight without files)
    const restoredItems = persisted
      .filter((p) => p.status === 'done' || p.status === 'error')
      .map((p): QueueItem => ({
        id: p.id,
        file: new File([], p.filename, { type: 'video/mp4' }) as File,
        previewUrl: null,
        status: p.status,
        progress: p.status === 'done' ? 100 : 0,
        score: p.score,
        roastId: p.roastId,
        error: p.error,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
      }));

    if (restoredItems.length > 0) {
      setQueue(restoredItems);
      // Compute summary if all were done
      const donePersisted = restoredItems.filter((i) => i.status === 'done' && i.score !== undefined);
      if (donePersisted.length >= 2) {
        const sorted = [...donePersisted].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const totalTimeMs =
          Math.max(...donePersisted.map((i) => i.completedAt ?? 0)) -
          Math.min(...donePersisted.map((i) => i.startedAt ?? Date.now()));
        setBatchSummary({
          averageScore: Math.round(donePersisted.reduce((s, i) => s + (i.score ?? 0), 0) / donePersisted.length),
          bestItem: sorted[0],
          worstItem: sorted[sorted.length - 1],
          totalTimeMs: Math.max(0, totalTimeMs),
          completedCount: donePersisted.length,
        });
      }
    }
  }, []);

  // Save queue to storage whenever it changes
  useEffect(() => {
    if (queue.length > 0) saveQueueToStorage(queue);
  }, [queue]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const errors: string[] = [];

    const newItems: QueueItem[] = [];
    for (const f of arr) {
      if (queue.length + newItems.length >= MAX_QUEUE_SIZE) {
        errors.push(`Queue full (max ${MAX_QUEUE_SIZE} videos). Remove some to add more.`);
        break;
      }
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`${f.name}: too large (max 150MB)`);
        continue;
      }
      if (!f.type.startsWith('video/')) {
        errors.push(`${f.name}: not a video file`);
        continue;
      }
      newItems.push({
        id: generateId(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: 'pending',
        progress: 0,
      });
    }

    setFileErrors(errors);
    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      setBatchSummary(null);
    }
  }, [queue.length]);

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((i) => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
      return [];
    });
    setBatchSummary(null);
    setIsProcessing(false);
    processingRef.current = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
  }, []);

  // Process a single queue item through the roast API
  const processItem = useCallback(async (item: QueueItem): Promise<void> => {
    const sessionId = getSessionId();

    try {
      updateItem(item.id, { status: 'uploading', progress: 5, startedAt: Date.now() });

      // Step 1: Get signed upload URL
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: item.file.name,
          contentType: item.file.type || 'video/mp4',
          sessionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          throw new Error('FREE_LIMIT_REACHED');
        }
        throw new Error(data.error || 'Failed to initialize upload');
      }

      const { id: roastId, signedUrl, token } = await res.json();
      updateItem(item.id, { progress: 15 });

      // Step 2: Upload to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': item.file.type || 'video/mp4',
          ...(token ? { 'x-upsert': 'false' } : {}),
        },
        body: item.file,
      });

      if (!uploadRes.ok) throw new Error('Video upload to storage failed');
      updateItem(item.id, { progress: 30, status: 'analyzing' });

      // Step 3: Stream analysis via SSE from /api/analyze/[id]
      await new Promise<void>((resolve, reject) => {
        const eventSource = new EventSource(
          `/api/analyze/${roastId}?source=upload&filename=${encodeURIComponent(item.file.name)}&session_id=${sessionId}`
        );

        const watchdog = setTimeout(() => {
          eventSource.close();
          reject(new Error('Analysis timed out'));
        }, 180 * 1000);

        let agentsDone = 0;
        const totalAgents = AGENTS.length;
        let capturedScore: number | undefined;
        let capturedVerdict: string = '';
        const capturedAgents: unknown[] = [];

        const progressBase = 30;
        const progressRange = 65; // 30% to 95%

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);

            // Agent completed — type:'agent' status:'done'
            if (data.type === 'agent' && data.status === 'done') {
              agentsDone++;
              const pct = progressBase + Math.round((agentsDone / totalAgents) * progressRange);
              updateItem(item.id, { progress: pct });
              if (data.result) capturedAgents.push(data.result);
            }

            // Verdict event carries overallScore
            if (data.type === 'verdict') {
              capturedScore = data.overallScore;
              capturedVerdict = data.verdict ?? '';
            }

            if (data.type === 'done') {
              clearTimeout(watchdog);
              eventSource.close();
              updateItem(item.id, {
                status: 'done',
                progress: 100,
                score: capturedScore,
                roastId,
                completedAt: Date.now(),
              });

              // Store result in sessionStorage for the roast page
              if (capturedScore !== undefined) {
                try {
                  const result = {
                    id: roastId,
                    tiktokUrl: '',
                    overallScore: capturedScore,
                    verdict: capturedVerdict,
                    agents: capturedAgents,
                    metadata: {
                      views: 0, likes: 0, comments: 0, shares: 0,
                      duration: 0, hashtags: [], description: 'Uploaded video',
                    },
                  };
                  sessionStorage.setItem(`roast_${roastId}`, JSON.stringify(result));
                } catch { /* ignore */ }
              }

              resolve();
            }

            if (data.type === 'error') {
              clearTimeout(watchdog);
              eventSource.close();
              reject(new Error(data.message || 'Analysis failed'));
            }
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error('Connection lost during analysis'));
        };
      });

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Processing failed';
      updateItem(item.id, {
        status: 'error',
        progress: 0,
        error: errMsg === 'FREE_LIMIT_REACHED'
          ? '🔒 Free limit reached (3 roasts/day). Upgrade for unlimited roasts.'
          : errMsg,
        completedAt: Date.now(),
      });
    }
  }, [updateItem]);

  // Sequential queue processor
  const startProcessing = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // We read from state inside the loop by re-querying
      while (processingRef.current) {
        // Get next pending item
        const snapshot = await new Promise<QueueItem[]>((resolve) => {
          setQueue((prev) => {
            resolve(prev);
            return prev;
          });
        });

        const nextItem = snapshot.find((i) => i.status === 'pending');
        if (!nextItem) break;

        await processItem(nextItem);
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);

      // Compute batch summary
      setQueue((finalQueue) => {
        const doneItems = finalQueue.filter((i) => i.status === 'done' && i.score !== undefined);
        if (doneItems.length >= 1) {
          const sorted = [...doneItems].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const startTimes = doneItems.map((i) => i.startedAt ?? Date.now()).filter(Boolean);
          const endTimes = doneItems.map((i) => i.completedAt ?? Date.now()).filter(Boolean);
          const totalTimeMs = endTimes.length > 0 && startTimes.length > 0
            ? Math.max(...endTimes) - Math.min(...startTimes)
            : 0;

          setBatchSummary({
            averageScore: Math.round(doneItems.reduce((s, i) => s + (i.score ?? 0), 0) / doneItems.length),
            bestItem: sorted[0],
            worstItem: sorted[sorted.length - 1],
            totalTimeMs: Math.max(0, totalTimeMs),
            completedCount: doneItems.length,
          });
        }
        return finalQueue;
      });
    }
  }, [processItem]);

  const retryItem = useCallback((id: string) => {
    setQueue((prev) => prev.map((item) =>
      item.id === id ? { ...item, status: 'pending', error: undefined, progress: 0 } : item
    ));
    setTimeout(() => startProcessing(), 0);
  }, [startProcessing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const hasPending = queue.some((i) => i.status === 'pending');
  const hasAny = queue.length > 0;
  const doneCount = queue.filter((i) => i.status === 'done').length;
  const allDone = hasAny && queue.every((i) => i.status === 'done' || i.status === 'error');
  const activeItem = queue.find((i) => i.status === 'uploading' || i.status === 'analyzing');
  const recentRoasts = history.slice(0, 5);

  const handleViewAll = () => {
    // Navigate to history
    router.push('/history');
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10 bg-[#080808]">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(251,146,60,0.07),transparent)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 pt-2"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🔥</span>
            <span className="text-zinc-500 text-sm font-semibold tracking-widest uppercase">Go Viral</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.05]">
            Drop your TikToks.{' '}
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              Get destroyed.
            </span>
          </h1>
          <p className="text-zinc-500 text-base max-w-md mx-auto leading-relaxed">
            9 AI agents analyze every frame. Upload up to 5 videos, roast them all.
          </p>
        </motion.div>

        {/* Stats */}
        {!historyLoading && <StatsBar history={history} />}

        {/* Batch summary */}
        <AnimatePresence>
          {batchSummary && allDone && (
            <BatchSummaryCard
              summary={batchSummary}
              onViewAll={handleViewAll}
              onClearQueue={clearQueue}
            />
          )}
        </AnimatePresence>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">

          {/* Left: Upload zone */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col gap-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">New Roast</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {queue.length}/{MAX_QUEUE_SIZE} videos
                </span>
                {/* Agent chips */}
                <div className="flex -space-x-1">
                  {AGENTS.slice(0, 5).map((a) => (
                    <div
                      key={a.key}
                      title={a.name}
                      className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm"
                    >
                      {a.emoji}
                    </div>
                  ))}
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                    +{AGENTS.length - 5}
                  </div>
                </div>
              </div>
            </div>

            {/* Drop zone */}
            <AnimatePresence mode="wait">
              {queue.length < MAX_QUEUE_SIZE ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className="relative cursor-pointer"
                >
                  <motion.div
                    animate={dragOver ? { scale: 1.02 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors overflow-hidden ${
                      dragOver
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-zinc-700 hover:border-orange-500/50 hover:bg-zinc-900/40'
                    }`}
                  >
                    <DropGlow active={dragOver} />
                    <motion.div
                      animate={dragOver ? { scale: 1.3, rotate: 5 } : { scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="text-4xl mb-3"
                    >
                      {dragOver ? '🎯' : '🎬'}
                    </motion.div>
                    <p className={`font-bold text-sm transition-colors ${dragOver ? 'text-orange-300' : 'text-zinc-300'}`}>
                      {dragOver ? "Drop 'em — we're ready" : 'Drop TikTok videos here'}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1.5">
                      or{' '}
                      <span className={`transition-colors ${dragOver ? 'text-orange-400' : 'text-orange-400/70 hover:text-orange-400'}`}>
                        click to browse
                      </span>
                      {' '}· up to {MAX_QUEUE_SIZE} videos · mp4, mov · 150MB each
                    </p>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="queue-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-2 border-dashed border-zinc-700/40 rounded-xl p-6 text-center"
                >
                  <p className="text-zinc-500 text-sm">Queue full ({MAX_QUEUE_SIZE}/{MAX_QUEUE_SIZE})</p>
                  <p className="text-zinc-600 text-xs mt-1">Remove videos to add more</p>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  addFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            {/* File errors */}
            <AnimatePresence>
              {fileErrors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  {fileErrors.map((err, i) => (
                    <p key={i} className="text-red-400 text-xs flex items-center gap-1">
                      <span>⚠️</span> {err}
                    </p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terms */}
            <p className="text-zinc-600 text-xs text-center">
              By uploading, you agree to our{' '}
              <Link href="/terms" className="text-orange-400 hover:underline">Terms</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-orange-400 hover:underline">Privacy Policy</Link>.
            </p>

            {/* CTA */}
            <motion.button
              onClick={startProcessing}
              disabled={!hasPending || isProcessing}
              whileHover={hasPending && !isProcessing ? { scale: 1.01 } : {}}
              whileTap={hasPending && !isProcessing ? { scale: 0.98 } : {}}
              className="w-full fire-gradient text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 text-sm"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Roasting {activeItem?.file.name ?? '...'}
                </span>
              ) : hasPending ? (
                `🔥 Roast ${queue.filter(i => i.status === 'pending').length} Video${queue.filter(i => i.status === 'pending').length > 1 ? 's' : ''}`
              ) : allDone ? (
                '✅ All Done!'
              ) : (
                '🎬 Add videos above'
              )}
            </motion.button>

            {/* What you get */}
            <div className="pt-2 border-t border-zinc-800/60">
              <p className="text-zinc-600 text-xs uppercase tracking-widest font-semibold mb-3">What you get</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: '📊', label: 'Score /100' },
                  { icon: '🤖', label: '9 Agents' },
                  { icon: '🔧', label: 'Fix List' },
                ].map((item) => (
                  <div key={item.label} className="text-center p-2 rounded-lg bg-zinc-800/40">
                    <div className="text-base">{item.icon}</div>
                    <div className="text-zinc-400 text-xs font-medium mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Queue panel + Recent Roasts */}
          <div className="space-y-5">

            {/* Queue panel — Spotify-style */}
            <AnimatePresence>
              {hasAny && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.35 }}
                  className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-sm overflow-hidden"
                >
                  {/* Queue header */}
                  <button
                    onClick={() => setQueueOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Upload Queue</span>
                      <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full px-2 py-0.5 font-medium">
                        {queue.length}
                      </span>
                      {isProcessing && (
                        <span className="text-xs text-orange-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
                          Live
                        </span>
                      )}
                      {allDone && doneCount > 0 && (
                        <span className="text-xs text-green-400">
                          {doneCount}/{queue.length} done
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {!isProcessing && hasAny && (
                        <button
                          onClick={(e) => { e.stopPropagation(); clearQueue(); }}
                          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                      <motion.span
                        animate={{ rotate: queueOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-zinc-500 text-xs"
                      >
                        ▼
                      </motion.span>
                    </div>
                  </button>

                  {/* Queue items */}
                  <AnimatePresence>
                    {queueOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          <AnimatePresence>
                            {queue.map((item, idx) => (
                              <QueueItemCard
                                key={item.id}
                                item={item}
                                index={idx}
                                isActive={item.id === activeItem?.id}
                                onRemove={removeItem}
                                onRetry={retryItem}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent Roasts */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Recent Roasts</h2>
                {recentRoasts.length > 0 && (
                  <Link href="/history" className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium">
                    View all →
                  </Link>
                )}
              </div>

              {historyLoading ? (
                <div className="py-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-zinc-800/40 animate-pulse" />
                  ))}
                </div>
              ) : recentRoasts.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-4xl mb-3">🎬</div>
                  <p className="text-zinc-400 font-semibold text-sm">No roasts yet</p>
                  <p className="text-zinc-600 text-xs mt-1.5 max-w-[200px] mx-auto leading-relaxed">
                    Upload your first video to see how your content stacks up
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRoasts.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <Link
                        href={`/roast/${entry.id}`}
                        className="group block bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 hover:border-orange-500/30 hover:bg-zinc-800/60 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-zinc-900/60 border border-zinc-700/40 group-hover:border-orange-500/20 transition-colors">
                            <span
                              className={`text-base font-black tabular-nums ${
                                entry.overallScore >= 70 ? 'text-green-400' :
                                entry.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                              }`}
                            >
                              {entry.overallScore}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div>
                              {entry.filename && (
                                <p className="text-sm text-white font-semibold truncate leading-tight">{entry.filename}</p>
                              )}
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(entry.agentScores).slice(0, 5).map(([dim, score]) => {
                                const agent = AGENTS.find((a) => a.key === dim);
                                return (
                                  <span key={dim} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/80 text-xs text-zinc-400">
                                    <span>{agent?.emoji}</span>
                                    <span>{score}</span>
                                  </span>
                                );
                              })}
                            </div>
                            {entry.verdict && (
                              <p className="text-xs text-zinc-500 italic line-clamp-1">&ldquo;{entry.verdict}&rdquo;</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
