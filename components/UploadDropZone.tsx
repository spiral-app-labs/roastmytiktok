'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

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
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
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
            className={`cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragOver
                ? 'border-orange-500 bg-orange-500/5'
                : 'border-zinc-700/60 hover:border-zinc-600 hover:bg-white/[0.01]'
            }`}
          >
            <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${dragOver ? 'text-orange-400' : 'text-zinc-600'}`} />
            <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-orange-300' : 'text-zinc-300'}`}>
              {dragOver ? 'Drop to analyze' : 'Drop a video here or click to browse'}
            </p>
            <p className="text-xs text-zinc-600 mt-1.5">
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
            className="border border-zinc-800 rounded-lg p-6"
          >
            <div className="flex items-center gap-4">
              {thumbnailUrl && (
                <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-zinc-900">
                  <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file?.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{statusMessage}</p>
                <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <span className="text-xs text-zinc-500 tabular-nums shrink-0">{progress}%</span>
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
            className="rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/50"
          >
            {/* Hero thumbnail with glow */}
            <div className="relative">
              {thumbnailUrl ? (
                <div className="relative aspect-video max-h-[280px] overflow-hidden">
                  {/* Glow layer */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover blur-3xl scale-110 opacity-40"
                    />
                  </div>
                  {/* Actual thumbnail */}
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="relative z-10 w-full h-full object-contain"
                  />
                  {/* Bottom gradient fade */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent z-20" />
                  {/* Progress percentage overlay */}
                  <motion.div
                    className="absolute top-4 right-4 z-30 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="text-sm font-bold text-white tabular-nums">{progress}%</span>
                  </motion.div>
                </div>
              ) : (
                <div className="aspect-video max-h-[280px] bg-zinc-900 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
                </div>
              )}
            </div>

            {/* Status + progress bar */}
            <div className="px-5 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-orange-400/90 font-medium truncate flex-1">{statusMessage}</p>
                <p className="text-[11px] text-zinc-600 ml-3 shrink-0 tabular-nums">{file?.name}</p>
              </div>
              <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-orange-400 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Agent grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-zinc-800/30 mx-4 mb-4 mt-2 rounded-lg overflow-hidden">
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
                    className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors duration-300 ${
                      isDone
                        ? 'bg-green-500/[0.04]'
                        : isAnalyzing
                          ? 'bg-orange-500/[0.04]'
                          : 'bg-zinc-950'
                    }`}
                  >
                    {/* Status indicator */}
                    <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                      {isDone ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-green-400" />
                        </motion.div>
                      ) : isAnalyzing ? (
                        <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                      )}
                    </div>

                    {/* Agent info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{agent.emoji}</span>
                        <span className={`text-xs font-medium truncate transition-colors duration-300 ${
                          isDone ? 'text-zinc-300' : isAnalyzing ? 'text-white' : 'text-zinc-600'
                        }`}>
                          {agent.name.replace(' Agent', '')}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
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
            className="border border-green-500/20 bg-green-500/5 rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file?.name}</p>
                <p className="text-xs text-green-400/80">
                  Analysis complete{score !== null ? ` · Score: ${score}/100` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/roast/${resultId}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                View Results
              </Link>
              <button
                onClick={reset}
                className="px-4 py-2.5 rounded-lg bg-[#18181b] border border-zinc-800 text-zinc-300 text-sm font-medium hover:border-zinc-700 transition-all"
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
            className="border border-red-500/20 bg-red-500/5 rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={reset} className="ml-auto shrink-0 text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error?.includes('limit') ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Upgrade Plan
              </Link>
            ) : (
              <button
                onClick={reset}
                className="px-4 py-2.5 rounded-lg bg-[#18181b] border border-zinc-800 text-zinc-300 text-sm font-medium hover:border-zinc-700 transition-all"
              >
                Try Again
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms (only on idle) */}
      {state === 'idle' && (
        <p className="text-zinc-600 text-[11px] text-center mt-3">
          By uploading, you agree to our{' '}
          <Link href="/terms" className="text-zinc-500 hover:text-orange-400 transition-colors">Terms</Link>
          {' & '}
          <Link href="/privacy" className="text-zinc-500 hover:text-orange-400 transition-colors">Privacy</Link>.
        </p>
      )}
    </div>
  );
}
