'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, UploadCloud, X } from 'lucide-react';
import { GradientButton } from '@/components/ui';
import { getSessionId } from '@/lib/history';
import { AnalysisStageProgress } from './AnalysisStageProgress';
import { getUploadErrorMessage, validateVideoFile } from './uploadFlow';

interface UnifiedUploadFlowProps {
  variant?: 'compact' | 'full';
}

export default function UnifiedUploadFlow({ variant = 'compact' }: UnifiedUploadFlowProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const startAnalysis = useCallback(async () => {
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

  const cardPadding = variant === 'full' ? 'p-6 sm:p-8' : 'p-5 sm:p-6';

  if (uploading && file) {
    return (
      <AnalysisStageProgress
        activeIndex={0}
        progressPercent={12}
        eyebrow="Upload in progress"
        title="Uploading your draft for analysis"
        description="Your video is being moved into the hook-first analysis pipeline. As soon as the upload lands, we extract the first 6 seconds, score hook survival, and only expand if the opening earns it."
        liveDetail={file.name}
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
            One upload flow
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Upload once. Fix the hook before you post.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            We start with the first 3 to 6 seconds, score whether viewers will stay, then tell you what to edit now versus what to refilm.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500">
            <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5">MP4, MOV, WebM</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5">Under 150MB</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5">Best results under 3 minutes</span>
          </div>
        </div>

        {file ? (
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
        ) : null}
      </div>

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
          One clean upload path. The hook gets judged first because the rest of the video only matters if viewers survive the opener.
        </p>
      </motion.div>

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
          disabled={!file}
        >
          Analyze this video
        </GradientButton>
        <GradientButton
          variant="secondary"
          size="lg"
          className="sm:min-w-[210px]"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose another file
        </GradientButton>
      </div>
    </div>
  );
}
