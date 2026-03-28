'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AGENTS } from '@/lib/agents';
import { getSessionId, fetchHistory, HistoryEntry } from '@/lib/history';

type InputMode = 'upload' | 'url';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function ScoreChip({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'text-green-400 bg-green-500/10 border-green-500/30'
      : score >= 50
        ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
        : 'text-red-400 bg-red-500/10 border-red-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-bold ${color}`}>
      {score}
    </span>
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
      setFileError('File too large. Max 500MB.');
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
      setUploadStatus('Uploading video...');
      const formData = new FormData();
      formData.append('video', file!);
      formData.append('session_id', getSessionId());

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { id } = await res.json();
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
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: New Roast */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">New Roast</h2>

            {/* Tab switcher */}
            <div className="flex gap-1 mb-4 bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-1">
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
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Coming soon
                </span>
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              {inputMode === 'upload' ? (
                <div className="space-y-3">
                  {!file ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all text-center ${
                        dragOver
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-zinc-700 hover:border-orange-500/50 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="text-3xl mb-2">+</div>
                      <p className="text-zinc-300 font-medium text-sm">Drop your video here</p>
                      <p className="text-zinc-500 text-xs mt-1">mp4, mov, avi &middot; max 500MB</p>
                    </div>
                  ) : (
                    <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 flex items-center gap-4">
                      {previewUrl && (
                        <video
                          src={previewUrl}
                          className="w-16 h-16 object-cover rounded-lg shrink-0"
                          muted
                        />
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{file.name}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-zinc-500 hover:text-red-400 transition-colors text-lg shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {fileError && (
                    <p className="text-red-400 text-sm">{fileError}</p>
                  )}

                  {uploadStatus && (
                    <p className="text-orange-400 text-sm flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {uploadStatus}
                    </p>
                  )}

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

                  <button
                    type="submit"
                    disabled={loading || !file}
                    className="w-full fire-gradient text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
                      'Roast My Video'
                    )}
                  </button>
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
          </div>

          {/* Right: Recent Roasts */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recent Roasts</h2>
              {recentRoasts.length > 0 && (
                <Link
                  href="/history"
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View all &rarr;
                </Link>
              )}
            </div>

            {historyLoading ? (
              <div className="py-12 text-center">
                <p className="text-zinc-500 text-sm">Loading...</p>
              </div>
            ) : recentRoasts.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-3 text-zinc-600">&#127916;</div>
                <p className="text-zinc-500 text-sm">No roasts yet</p>
                <p className="text-zinc-600 text-xs mt-1">Upload a video to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRoasts.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/roast/${entry.id}`}
                    className="block bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 hover:border-orange-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        {entry.filename && (
                          <p className="text-sm text-zinc-300 font-medium truncate">{entry.filename}</p>
                        )}
                        <p className="text-xs text-zinc-500">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <ScoreChip score={entry.overallScore} />
                    </div>

                    {/* Agent score pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(entry.agentScores).map(([dim, score]) => {
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
                    </div>

                    {entry.verdict && (
                      <p className="text-xs text-zinc-500 mt-2 italic line-clamp-1">
                        &ldquo;{entry.verdict}&rdquo;
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
