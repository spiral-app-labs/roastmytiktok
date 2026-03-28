'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getSessionId } from '@/lib/history';

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export default function UploadView() {
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
    setPreviewUrl(URL.createObjectURL(f));
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

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setUploadStatus(null);

    try {
      setUploadStatus('Uploading video...');
      const formData = new FormData();
      formData.append('video', file);
      formData.append('session_id', getSessionId());

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { id } = await res.json();
      setUploadStatus('Starting analysis...');
      router.push(`/analyze/${id}?source=upload&filename=${encodeURIComponent(file.name)}`);
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
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Upload a Video</h2>
        <p className="text-sm text-zinc-500">Drop your TikTok video and let our 6 AI agents tear it apart.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-8"
      >
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 cursor-pointer transition-all text-center group ${
              dragOver
                ? 'border-orange-500 bg-orange-500/5'
                : 'border-zinc-700/60 hover:border-orange-500/40 hover:bg-zinc-800/20'
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center group-hover:border-orange-500/30 transition-colors">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500 group-hover:text-orange-400 transition-colors">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-zinc-300 font-medium mb-1">Drop your video here or click to browse</p>
            <p className="text-zinc-600 text-sm">MP4, MOV, AVI &middot; Max 500MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[300px]">
              {previewUrl && (
                <video src={previewUrl} className="w-full h-full object-contain" controls muted />
              )}
              <button
                onClick={clearFile}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* File Info */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              <button onClick={clearFile} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
          </div>
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

        {fileError && (
          <p className="text-red-400 text-sm mt-4">{fileError}</p>
        )}

        {uploadStatus && (
          <div className="flex items-center gap-2 mt-4 text-orange-400 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {uploadStatus}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !file}
          className="w-full mt-6 fire-gradient text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </span>
          ) : (
            'Roast My Video'
          )}
        </button>
      </motion.div>
    </div>
  );
}
