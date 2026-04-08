'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { getSessionId } from '@/lib/history';
import { AGENTS } from '@/lib/agents';
import { Upload, Loader2, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';

const MAX_FILE_SIZE = 150 * 1024 * 1024;

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

interface AgentStatus {
  status: 'waiting' | 'analyzing' | 'done';
  score?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDropZone() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [statusMessage, setStatusMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reset = useCallback(() => {
    setFile(null);
    setThumbnailUrl(null);
    setState('idle');
    setProgress(0);
    setError(null);
    setResultId(null);
    setScore(null);
    setAgentStatuses({});
    setStatusMessage('');
  }, []);

  // Generate thumbnail from video file
  const generateThumbnail = useCallback((videoFile: File) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.7));
      }
      URL.revokeObjectURL(url);
    };
  }, []);

  const processFile = useCallback(async (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large (max 150MB). Your file is ${formatFileSize(f.size)}.`);
      setState('error');
      return;
    }
    if (!f.type.startsWith('video/')) {
      setError('Please upload a video file (MP4, MOV, etc.).');
      setState('error');
      return;
    }

    setFile(f);
    generateThumbnail(f);
    setState('uploading');
    setProgress(10);
    setError(null);
    setStatusMessage('Preparing upload...');

    // Initialize agent statuses
    const initial: Record<string, AgentStatus> = {};
    AGENTS.forEach(a => { initial[a.key] = { status: 'waiting' }; });
    setAgentStatuses(initial);

    const sessionId = getSessionId();

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, contentType: f.type, sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429 || data.error === 'FREE_LIMIT_REACHED') {
          throw new Error('FREE_LIMIT_REACHED');
        }
        throw new Error(data.error || 'Failed to start upload');
      }

      const { id: roastId, signedUrl } = await res.json();
      setProgress(20);
      setStatusMessage('Uploading video...');

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': f.type },
        body: f,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      setProgress(50);
      setState('analyzing');
      setStatusMessage('Extracting frames & audio...');

      await new Promise<void>((resolve, reject) => {
        const eventSource = new EventSource(`/api/analyze/${roastId}`);
        const watchdog = setTimeout(() => {
          eventSource.close();
          reject(new Error('Analysis timed out'));
        }, 180_000);

        let agentsDone = 0;
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'status') {
              setStatusMessage(data.message || '');
              // Nudge progress during preprocessing (50-55 range)
              setProgress(prev => {
                if (prev >= 50 && prev < 55) return Math.min(prev + 1, 55);
                return prev;
              });
            }

            if (data.type === 'agent' && data.status === 'analyzing') {
              setAgentStatuses(prev => ({
                ...prev,
                [data.agent]: { status: 'analyzing' },
              }));
            }

            if (data.type === 'agent' && data.status === 'done') {
              agentsDone++;
              setAgentStatuses(prev => ({
                ...prev,
                [data.agent]: { status: 'done', score: data.result?.score },
              }));
              const pct = 56 + Math.round((agentsDone / 6) * 34);
              setProgress(Math.min(pct, 90));
              setStatusMessage(`${agentsDone}/6 agents complete`);
            }

            if (data.type === 'verdict') {
              setProgress(95);
              setStatusMessage('Generating verdict...');
            }

            if (data.type === 'complete') {
              clearTimeout(watchdog);
              eventSource.close();
              setResultId(roastId);
              setScore(data.overallScore ?? null);
              setState('done');
              setProgress(100);
              resolve();
            }

            if (data.type === 'error') {
              clearTimeout(watchdog);
              eventSource.close();
              reject(new Error(data.message || 'Analysis failed'));
            }
          } catch { /* ignore parse errors */ }
        };

        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error('Connection lost during analysis'));
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      setError(
        msg === 'FREE_LIMIT_REACHED'
          ? 'Free limit reached (3/day). Upgrade for unlimited.'
          : msg
      );
      setState('error');
    }
  }, [generateThumbnail]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  }, [processFile]);

  function scoreColor(s: number) {
    if (s >= 80) return 'text-emerald-600 dark:text-emerald-300';
    if (s >= 60) return 'text-amber-600 dark:text-amber-300';
    if (s >= 40) return 'text-orange-600 dark:text-orange-300';
    return 'text-rose-600 dark:text-rose-300';
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <AnimatePresence mode="wait">
        {/* ─── Idle: Drop zone ─── */}
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-[28px] border p-8 text-center transition-all ${
              dragOver
                ? 'border-orange-300 bg-orange-50 dark:border-orange-400/30 dark:bg-orange-400/10'
                : 'border-black/8 bg-[#fafaf9] hover:border-black/12 hover:bg-white dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/8'
            }`}
          >
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              dragOver ? 'bg-orange-100 text-orange-600 dark:bg-orange-400/20 dark:text-orange-300' : 'bg-white text-zinc-500 ring-1 ring-black/6 dark:bg-white/10 dark:text-zinc-300 dark:ring-white/8'
            }`}>
              <Upload className="h-5 w-5" />
            </div>
            <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-orange-700 dark:text-orange-200' : 'text-zinc-900 dark:text-white'}`}>
              {dragOver ? 'Drop to analyze' : 'Drop a video here or click to browse'}
            </p>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              MP4, MOV · up to 150MB · results in ~30s
            </p>
          </motion.div>
        )}

        {/* ─── Uploading: Simple progress ─── */}
        {state === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[28px] border border-black/8 bg-[#fafaf9] p-5 dark:border-white/8 dark:bg-white/5"
          >
            <div className="flex items-center gap-4">
              {thumbnailUrl && (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[20px] bg-zinc-200 dark:bg-white/10">
                  <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{file?.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{statusMessage}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-zinc-950 dark:bg-white"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{progress}%</span>
            </div>
          </motion.div>
        )}

        {/* ─── Analyzing: Cinematic loading screen ─── */}
        {state === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="overflow-hidden rounded-[28px] border border-black/8 bg-white dark:border-white/8 dark:bg-white/5"
          >
            <div className="relative">
              {thumbnailUrl ? (
                <div className="relative aspect-video max-h-[280px] overflow-hidden bg-[#f5f5f2] dark:bg-zinc-950/60">
                  <div className="absolute inset-0 z-0">
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="h-full w-full scale-110 object-cover opacity-25 blur-3xl"
                    />
                  </div>
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="relative z-10 h-full w-full object-contain"
                  />
                  <div className="absolute bottom-0 left-0 right-0 z-20 h-24 bg-gradient-to-t from-white to-transparent dark:from-[#111318] dark:to-transparent" />
                  <motion.div
                    className="absolute right-4 top-4 z-30 rounded-full border border-black/8 bg-white/90 px-3 py-1.5 backdrop-blur-sm dark:border-white/8 dark:bg-zinc-950/80"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="font-display text-sm font-bold tabular-nums text-zinc-950 dark:text-white">{progress}%</span>
                  </motion.div>
                </div>
              ) : (
                <div className="flex aspect-video max-h-[280px] items-center justify-center bg-[#f5f5f2] dark:bg-zinc-950/60">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                </div>
              )}
            </div>

            <div className="px-5 pb-2 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="flex-1 truncate text-xs font-medium text-zinc-900 dark:text-white">{statusMessage}</p>
                <p className="ml-3 shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{file?.name}</p>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-zinc-950 dark:bg-white"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="mx-4 mb-4 mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-black/6 dark:bg-white/8 sm:grid-cols-3">
              {AGENTS.map((agent, i) => {
                const as = agentStatuses[agent.key];
                const isDone = as?.status === 'done';
                const isAnalyzing = as?.status === 'analyzing';

                return (
                  <motion.div
                    key={agent.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    className={`flex items-center gap-2.5 px-3 py-3 transition-colors duration-300 ${
                      isDone
                        ? 'bg-emerald-50 dark:bg-emerald-400/10'
                        : isAnalyzing
                          ? 'bg-orange-50 dark:bg-orange-400/10'
                          : 'bg-white dark:bg-[#111318]'
                    }`}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isDone ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-400/20"
                        >
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                        </motion.div>
                      ) : isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500 dark:text-orange-300" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{agent.emoji}</span>
                        <span className={`truncate text-xs font-medium transition-colors duration-300 ${
                          isDone ? 'text-zinc-900 dark:text-white' : isAnalyzing ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
                        }`}>
                          {agent.name.replace(' Agent', '')}
                        </span>
                      </div>
                    </div>

                    {isDone && as.score != null && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                        className={`text-xs font-bold tabular-nums ${scoreColor(as.score)}`}
                      >
                        {as.score}
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── Done ─── */}
        {state === 'done' && resultId && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-400/20 dark:bg-emerald-400/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{file?.name}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Analysis complete{score !== null ? ` · Score: ${score}/100` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/roast/${resultId}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
              >
                View Results
              </Link>
              <button
                onClick={reset}
                className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/8 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                Upload Another
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Error ─── */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 dark:border-rose-400/20 dark:bg-rose-400/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
              <button onClick={reset} className="ml-auto shrink-0 text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {error?.includes('limit') ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
              >
                Upgrade Plan
              </Link>
            ) : (
              <button
                onClick={reset}
                className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/8 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                Try Again
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms (only on idle) */}
      {state === 'idle' && (
        <p className="mt-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          By uploading, you agree to our{' '}
          <Link href="/terms" className="text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white">Terms</Link>
          {' & '}
          <Link href="/privacy" className="text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white">Privacy</Link>.
        </p>
      )}
    </div>
  );
}
