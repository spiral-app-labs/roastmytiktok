'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENTS } from '@/lib/agents';
import { getSessionId, fetchHistory, HistoryEntry } from '@/lib/history';

type InputMode = 'upload' | 'url';

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB

function ScoreChip({ score, large = false }: { score: number; large?: boolean }) {
  const color =
    score >= 70
      ? 'text-green-400 bg-green-500/10 border-green-500/30'
      : score >= 50
        ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
        : 'text-red-400 bg-red-500/10 border-red-500/30';
  return (
    <span
      className={`inline-flex items-center rounded-lg border font-black tabular-nums ${
        large
          ? 'px-3 py-1 text-base'
          : 'px-2 py-0.5 text-xs'
      } ${color}`}
    >
      {score}
    </span>
  );
}

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

// Drag-over particle burst
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

export default function UploadUI() {
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchHistory().then((h) => {
      setHistory(h);
      setHistoryLoading(false);
    });
  }, []);

  const handleFile = useCallback((f: File) => {
    setFileError(null);
    if (f.size > MAX_FILE_SIZE) {
      setFileError('File too large (max 150MB). Video compression coming soon!');
      return;
    }
    if (!f.type.startsWith('video/')) {
      setFileError('Please upload a video file (mp4, mov, avi).');
      return;
    }
    setFile(f);
    const objUrl = URL.createObjectURL(f);
    setPreviewUrl(objUrl);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'upload' && !file) return;
    if (inputMode === 'url' && !url.trim()) return;
    setLoading(true);
    setUploadStatus(null);

    if (inputMode === 'url') {
      setFileError('URL analysis coming soon — please upload a file for now.');
      setLoading(false);
      return;
    }

    try {
      setUploadStatus('Preparing upload...');

      // Step 1: Get a signed upload URL from our API
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file!.name,
          contentType: file!.type || 'video/mp4',
          sessionId: getSessionId(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { id, signedUrl, token } = await res.json();

      // Step 2: Upload directly to Supabase Storage using the signed URL
      setUploadStatus('Uploading video...');
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file!.type || 'video/mp4',
          ...(token ? { 'x-upsert': 'false' } : {}),
        },
        body: file!,
      });

      if (!uploadRes.ok) {
        throw new Error('Video upload failed');
      }

      setUploadStatus('Starting analysis...');
      router.push(`/analyze/${id}?source=upload&filename=${encodeURIComponent(file!.name)}`);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setLoading(false);
      setUploadStatus(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileError(null);
  };

  const recentRoasts = history.slice(0, 5);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10 bg-[#080808]">
      {/* Subtle ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(251,146,60,0.07),transparent)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">

        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 pt-2"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🔥</span>
            <span className="text-zinc-500 text-sm font-semibold tracking-widest uppercase">RoastMyTikTok</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.05]">
            stuck at 200 views?{' '}
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              fix the opening first.
            </span>
          </h1>
          <p className="text-zinc-500 text-base max-w-md mx-auto leading-relaxed">
            upload a video and get a hook breakdown, stronger opener rewrites, and a reshoot plan you can film today.
          </p>
        </motion.div>

        {/* Stats banner (only if history) */}
        {!historyLoading && <StatsBar history={history} />}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">

          {/* Left: Upload card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">New hook-help roast</h2>
              {/* Agent chips row */}
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

            {/* Tab switcher */}
            <div className="flex gap-1 mb-5 bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  inputMode === 'upload'
                    ? 'fire-gradient text-white shadow-lg shadow-orange-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Upload Video
              </button>
              <span className="relative flex-1 group">
                <button
                  type="button"
                  disabled
                  className="w-full py-2 px-3 rounded-lg text-sm font-semibold text-zinc-600 cursor-not-allowed"
                >
                  Paste URL
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  Coming soon
                </span>
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              {inputMode === 'upload' ? (
                <div className="space-y-3">
                  <AnimatePresence mode="wait">
                    {!file ? (
                      <motion.div
                        key="dropzone"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className="relative cursor-pointer"
                      >
                        <motion.div
                          animate={dragOver ? { scale: 1.02 } : { scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors overflow-hidden ${
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
                          <p
                            className={`font-bold text-sm transition-colors ${dragOver ? 'text-orange-300' : 'text-zinc-300'}`}
                          >
                            {dragOver ? "Drop it — we're ready" : 'Drop your TikTok video here'}
                          </p>
                          <p className="text-zinc-500 text-xs mt-1.5">
                            or{' '}
                            <span
                              className={`transition-colors ${dragOver ? 'text-orange-400' : 'text-orange-400/70 hover:text-orange-400'}`}
                            >
                              click to browse
                            </span>
                            {' '}
                            · mp4, mov, avi · max 150MB
                          </p>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="file-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 flex items-center gap-4"
                      >
                        {previewUrl ? (
                          <video
                            src={previewUrl}
                            className="w-16 h-16 object-cover rounded-lg shrink-0 ring-2 ring-orange-500/20"
                            muted
                          />
                        ) : null}
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{file.name}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB · Ready to roast
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearFile}
                          className="text-zinc-500 hover:text-red-400 transition-colors text-lg shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10"
                        >
                          ✕
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {fileError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-400 text-sm"
                      >
                        {fileError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {uploadStatus && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-orange-400 text-sm flex items-center gap-2"
                      >
                        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {uploadStatus}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />

                  <p className="text-zinc-500 text-xs text-center leading-relaxed">
                    By uploading, you confirm you own or have rights to this video and consent to AI analysis.
                    Your video is stored temporarily and deleted after processing.
                    See our{' '}
                    <Link href="/terms" className="text-orange-400 hover:underline">Terms</Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-orange-400 hover:underline">Privacy Policy</Link>.
                  </p>

                  <motion.button
                    type="submit"
                    disabled={loading || !file}
                    whileHover={!loading && file ? { scale: 1.01 } : {}}
                    whileTap={!loading && file ? { scale: 0.98 } : {}}
                    className="w-full fire-gradient text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      '🔥 Roast My Video'
                    )}
                  </motion.button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@user/video/..."
                    className="flex-1 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="fire-gradient text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Roasting...
                      </span>
                    ) : (
                      'Roast It'
                    )}
                  </button>
                </div>
              )}
            </form>

            {/* What you get */}
            <div className="mt-5 pt-5 border-t border-zinc-800/60">
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

          {/* Right: Recent Roasts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Recent Roasts</h2>
              {recentRoasts.length > 0 && (
                <Link
                  href="/history"
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
                >
                  View all →
                </Link>
              )}
            </div>

            {historyLoading ? (
              <div className="py-12 text-center space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-zinc-800/40 animate-pulse" />
                ))}
              </div>
            ) : recentRoasts.length === 0 ? (
              <div className="py-12 text-center">
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
                        {/* Score — most prominent */}
                        <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-zinc-900/60 border border-zinc-700/40 group-hover:border-orange-500/20 transition-colors">
                          <ScoreChip score={entry.overallScore} large />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {entry.filename && (
                                <p className="text-sm text-white font-semibold truncate leading-tight">{entry.filename}</p>
                              )}
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Agent score pills */}
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(entry.agentScores).slice(0, 5).map(([dim, score]) => {
                              const agent = AGENTS.find((a) => a.key === dim);
                              return (
                                <span
                                  key={dim}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/80 text-xs text-zinc-400"
                                >
                                  <span>{agent?.emoji}</span>
                                  <span>{score}</span>
                                </span>
                              );
                            })}
                            {Object.keys(entry.agentScores).length > 5 && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-xs text-zinc-600">
                                +{Object.keys(entry.agentScores).length - 5}
                              </span>
                            )}
                          </div>

                          {entry.verdict && (
                            <p className="text-xs text-zinc-500 italic line-clamp-1">
                              &ldquo;{entry.verdict}&rdquo;
                            </p>
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
    </main>
  );
}
