'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AGENTS } from '@/lib/agents';
import { getSessionId } from '@/lib/history';
import WaitlistLanding from '@/components/WaitlistLanding';

type InputMode = 'upload' | 'url';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function UploadUI() {
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background fire glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-red-500/5 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 max-w-3xl w-full text-center space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="fire-text">Roast</span>{' '}
            <span className="text-white">My TikTok</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-zinc-400 max-w-xl mx-auto">
            6 AI agents. 100+ data points. Zero mercy.{' '}
            <span className="text-orange-400 font-semibold">Upload and find out.</span>
          </p>
        </motion.div>

        {/* Input tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-xl mx-auto"
        >
          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                inputMode === 'upload'
                  ? 'fire-gradient text-white shadow-lg shadow-orange-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🎬 Upload Video
            </button>
            <span className="relative flex-1 group">
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-zinc-600 cursor-not-allowed"
              >
                🔗 Paste URL
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
                    className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
                      dragOver
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 hover:border-orange-500/50 hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="text-5xl mb-3">🔥</div>
                    <p className="text-zinc-300 font-semibold text-lg">Drop your TikTok here</p>
                    <p className="text-zinc-500 text-sm mt-1">or click to browse — mp4, mov, avi · max 500MB</p>
                  </div>
                ) : (
                  <div className="bg-zinc-900/80 border border-zinc-700/60 rounded-2xl p-4 flex items-center gap-4">
                    {previewUrl && (
                      <video
                        src={previewUrl}
                        className="w-20 h-20 object-cover rounded-xl shrink-0"
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
                      className="text-zinc-500 hover:text-red-400 transition-colors text-xl shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {fileError && (
                  <p className="text-red-400 text-sm">{fileError}</p>
                )}

                {uploadStatus && (
                  <p className="text-orange-400 text-sm flex items-center justify-center gap-2">
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
                  className="w-full fire-gradient text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@user/video/..."
                  className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-5 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="fire-gradient text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
        </motion.div>

        {/* Agent Preview Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto mt-12"
        >
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 text-left hover:border-orange-500/30 transition-colors group"
            >
              <div className="text-2xl mb-2">{agent.emoji}</div>
              <div className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                {agent.name}
              </div>
              <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {agent.oneLiner}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-xs text-zinc-600 mt-8"
        >
          6 AI agents. 100+ data points. Zero mercy.
        </motion.p>
      </div>
    </main>
  );
}

const WAITLIST_MODE = process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true';

export default function Home() {
  const [bypassed, setBypassed] = useState(!WAITLIST_MODE);
  const [checked, setChecked] = useState(!WAITLIST_MODE);

  useEffect(() => {
    if (!WAITLIST_MODE) return;

    // Check for bypass cookie via API (httpOnly cookie can't be read client-side)
    let cancelled = false;
    fetch('/api/bypass/check')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setBypassed(data.bypassed === true);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!checked) {
    return <main className="min-h-screen" />;
  }

  if (WAITLIST_MODE && !bypassed) {
    return <WaitlistLanding />;
  }

  return <UploadUI />;
}
