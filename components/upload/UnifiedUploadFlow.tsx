'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, Link2, UploadCloud, X } from 'lucide-react';
import { GradientButton } from '@/components/ui';
import { fetchHistory, getSessionId } from '@/lib/history';
import type { HistoryEntry } from '@/lib/history-types';
import { AnalysisStageProgress } from './AnalysisStageProgress';
import { getUploadErrorMessage, validateTikTokUrlInput, validateVideoFile } from './uploadFlow';

interface UnifiedUploadFlowProps {
  variant?: 'compact' | 'full';
}

export default function UnifiedUploadFlow({ variant = 'compact' }: UnifiedUploadFlowProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [platformUrl, setPlatformUrl] = useState('');
  const [linkedRoastId, setLinkedRoastId] = useState('');
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (mode !== 'url' || historyLoaded) return;

    let cancelled = false;
    void (async () => {
      try {
        const entries = await fetchHistory();
        if (!cancelled) {
          setHistoryEntries(entries.slice(0, 12));
          setHistoryLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setHistoryLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyLoaded, mode]);

  const replacePreview = useCallback((nextFile: File) => {
    setFile(nextFile);
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(nextFile);
    });
  }, []);

  const handleFile = useCallback((nextFile: File) => {
    const validationError = validateVideoFile(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    replacePreview(nextFile);
  }, [replacePreview]);

  const handleFileInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) handleFile(nextFile);
    event.target.value = '';
  }, [handleFile]);

  const clearFile = useCallback(() => {
    setFile(null);
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const startUploadAnalysis = useCallback(async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          sessionId: getSessionId(),
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMITED');
        }

        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'UPLOAD_INIT_FAILED');
      }

      const { id, signedUrl, token } = await response.json();

      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'video/mp4',
          ...(token ? { 'x-upsert': 'false' } : {}),
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('UPLOAD_FAILED');
      }

      router.push(`/analyze/${id}?source=upload&filename=${encodeURIComponent(file.name)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message === 'RATE_LIMITED' ? getUploadErrorMessage('rate_limited') : getUploadErrorMessage('analysis_failed'));
      setUploading(false);
    }
  }, [file, router]);

  const startUrlAnalysis = useCallback(async () => {
    const validationError = validateTikTokUrlInput(platformUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformUrl,
          linkedRoastId: linkedRoastId || undefined,
          sessionId: getSessionId(),
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        if (response.status === 503) {
          throw new Error('URL_ANALYSIS_UNAVAILABLE');
        }

        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.error === 'string' ? payload.error : 'URL_ANALYSIS_FAILED');
      }

      const { id } = await response.json();
      router.push(`/analyze/${id}?source=url`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'RATE_LIMITED') {
        setError(getUploadErrorMessage('rate_limited'));
      } else if (message === 'URL_ANALYSIS_UNAVAILABLE') {
        setError(getUploadErrorMessage('url_analysis_unavailable'));
      } else {
        setError(message || getUploadErrorMessage('analysis_failed'));
      }
      setUploading(false);
    }
  }, [linkedRoastId, platformUrl, router]);

  const startAnalysis = useCallback(() => {
    if (mode === 'url') {
      void startUrlAnalysis();
      return;
    }

    void startUploadAnalysis();
  }, [mode, startUploadAnalysis, startUrlAnalysis]);

  const cardPadding = variant === 'full' ? 'p-6 sm:p-8' : 'p-5 sm:p-6';

  if (uploading) {
    return (
      <AnalysisStageProgress
        activeIndex={0}
        progressPercent={12}
        eyebrow={mode === 'url' ? 'URL audit starting' : 'Upload in progress'}
        title={mode === 'url' ? 'Preparing your post-post audit' : 'Uploading your draft for analysis'}
        description={mode === 'url'
          ? 'We are validating the public TikTok URL, pulling the posted video into the analysis workspace, and preparing the audit pipeline.'
          : 'Your video is being moved into the hook-first analysis pipeline. As soon as the upload lands, we extract the first 6 seconds, score hook survival, and only expand if the opening earns it.'}
        liveDetail={mode === 'url' ? platformUrl : (file?.name ?? '')}
        compact={variant === 'compact'}
      />
    );
  }

  return (
    <div className={`rounded-[28px] border border-zinc-800/80 bg-zinc-950/80 shadow-xl shadow-black/20 backdrop-blur-xl ${cardPadding}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Pre-post + post-post
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Analyze the draft or audit the post that already shipped.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Upload a draft to fix it before distribution, or paste a public TikTok URL to see what actually worked after posting and whether you followed the original advice.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500">
            <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5">MP4, MOV, WebM</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5">Under 150MB</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5">Public TikTok URLs supported</span>
          </div>

          <div className="mt-5 inline-flex rounded-2xl border border-zinc-800 bg-zinc-900/70 p-1">
            {[
              { id: 'upload', label: 'Upload draft' },
              { id: 'url', label: 'Paste TikTok URL' },
            ].map((option) => {
              const active = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setMode(option.id as 'upload' | 'url');
                    setError(null);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {mode === 'upload' && file ? (
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="rounded-full border border-zinc-700 p-1.5 text-zinc-500 transition-colors hover:text-white"
                aria-label="Remove selected video"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {previewUrl ? (
              <video
                src={previewUrl}
                className="mt-4 aspect-[9/16] w-full rounded-xl border border-zinc-800 bg-black object-cover"
                controls
                muted
              />
            ) : null}
          </div>
        ) : mode === 'url' && platformUrl ? (
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-300">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Public TikTok post</p>
                <p className="mt-1 break-all text-xs leading-relaxed text-zinc-500">{platformUrl}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {mode === 'upload' ? (
        <motion.div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const droppedFile = event.dataTransfer.files?.[0];
            if (droppedFile) handleFile(droppedFile);
          }}
          className={`mt-6 cursor-pointer rounded-[24px] border-2 border-dashed px-6 py-10 text-center transition-all ${
            dragging
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-900/60'
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-300">
            {file ? <Film className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
          </div>
          <p className="mt-4 text-base font-semibold text-white">
            {file ? 'Replace video' : 'Drop your draft here or click to browse'}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            We judge the opener first because the rest of the video only matters if viewers survive the opening test.
          </p>
        </motion.div>
      ) : (
        <div className="mt-6 rounded-[24px] border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
          <label htmlFor="tiktok-url" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Public TikTok URL
          </label>
          <input
            id="tiktok-url"
            type="url"
            value={platformUrl}
            onChange={(event) => {
              setPlatformUrl(event.target.value);
              if (error) setError(null);
            }}
            placeholder="https://www.tiktok.com/@handle/video/1234567890"
            className="mt-3 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-sky-500"
          />
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Paste the public post you already published. We&apos;ll fetch the posted video, audit what actually worked, and compare it against earlier advice if you link a prior roast.
          </p>

          <div className="mt-5">
            <label htmlFor="linked-roast" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Optional prior roast
            </label>
            <select
              id="linked-roast"
              value={linkedRoastId}
              onChange={(event) => setLinkedRoastId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-sky-500"
            >
              <option value="">No linked roast</option>
              {historyEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {`${Math.round(entry.overallScore)} / 100 • ${new Date(entry.date).toLocaleDateString()} • ${entry.verdict.slice(0, 80)}`}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-600">
              Link a prior analysis if you want the audit to judge whether you followed the original plan.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <GradientButton
          variant="primary"
          size="lg"
          className="sm:min-w-[210px]"
          onClick={startAnalysis}
          disabled={mode === 'upload' ? !file : platformUrl.trim().length === 0}
        >
          {mode === 'upload' ? 'Analyze this video' : 'Audit this TikTok'}
        </GradientButton>
        <GradientButton
          variant="secondary"
          size="lg"
          className="sm:min-w-[210px]"
          onClick={() => {
            if (mode === 'upload') {
              fileInputRef.current?.click();
              return;
            }

            setPlatformUrl('');
            setLinkedRoastId('');
            setError(null);
          }}
        >
          {mode === 'upload' ? 'Choose another file' : 'Clear URL'}
        </GradientButton>
      </div>
    </div>
  );
}
