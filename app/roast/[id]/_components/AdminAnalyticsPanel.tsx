'use client';

import { useMemo } from 'react';
import type { RoastResult } from '@/lib/types';

interface AdminAnalyticsPanelProps {
  roast: RoastResult;
}

function formatDuration(ms: number | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return 'n/a';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toFixed(1)}s`;
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-sky-300/85">
        {label}
      </div>
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-white/6 bg-zinc-950/90 p-4 text-[11px] leading-5 text-zinc-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-white">{value}</div>
      {detail ? <p className="mt-2 text-sm text-zinc-400">{detail}</p> : null}
    </div>
  );
}

export default function AdminAnalyticsPanel({ roast }: AdminAnalyticsPanelProps) {
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const admin = roast.adminAnalytics;
  const frameMetadata = useMemo(() => admin?.media.frameMetadata ?? [], [admin]);

  if (!isLocalhost || !admin) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-white/[0.06] pt-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-sky-200">
          Localhost only
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Admin Analytics
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Raw hook analysis diagnostics, timing, transcript data, and frame-by-frame metadata from this run.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upload to result"
          value={formatDuration(admin.timing.uploadToCompleteMs)}
          detail={admin.timing.uploadStartedAt ? `Started ${new Date(admin.timing.uploadStartedAt).toLocaleTimeString()}` : 'Upload start fell back to analysis start.'}
        />
        <StatCard
          label="Analysis only"
          value={formatDuration(admin.timing.analysisOnlyMs)}
          detail={`Completed ${new Date(admin.timing.analysisCompletedAt).toLocaleTimeString()}`}
        />
        <StatCard
          label="Frames analyzed"
          value={`${admin.media.frameCount}`}
          detail={`Hook ${admin.media.frameCountsByZone.hook} · Transition ${admin.media.frameCountsByZone.transition} · Body ${admin.media.frameCountsByZone.body}`}
        />
        <StatCard
          label="Transcript"
          value={admin.transcript.quality}
          detail={admin.transcript.provider ? `${admin.transcript.provider} · ${Math.round((admin.transcript.confidence ?? 0) * 100)}% confidence` : admin.transcript.qualityNote}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <JsonBlock label="Timing" value={admin.timing} />
        <JsonBlock label="Reasoning" value={admin.reasoning} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <JsonBlock label="Transcript" value={admin.transcript} />
        <JsonBlock label="Media + OCR" value={admin.media} />
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Frame metadata
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Every analyzed frame with its returned metadata payload.
            </p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-sky-300/80">
            {frameMetadata.length} frames
          </div>
        </div>

        <div className="space-y-3">
          {frameMetadata.map((frame, index) => {
            const typedFrame = frame as {
              timestampSec?: number;
              zone?: string;
              sceneDescription?: string;
              textOnScreen?: string[];
              lightingQuality?: string;
              visualEnergy?: string;
            };

            return (
              <details
                key={`${typedFrame.timestampSec ?? index}-${typedFrame.zone ?? 'frame'}`}
                className="group rounded-2xl border border-white/8 bg-black/25 p-4 open:border-sky-400/20 open:bg-sky-500/[0.04]"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-sky-200/90">
                      {typedFrame.zone ?? 'frame'} · {typeof typedFrame.timestampSec === 'number' ? `${typedFrame.timestampSec.toFixed(1)}s` : `#${index + 1}`}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {typedFrame.sceneDescription ?? 'No scene description returned.'}
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      Lighting: {typedFrame.lightingQuality ?? 'n/a'} · Energy: {typedFrame.visualEnergy ?? 'n/a'}
                    </div>
                    {typedFrame.textOnScreen?.length ? (
                      <div className="mt-2 text-xs text-zinc-500">
                        Text: {typedFrame.textOnScreen.join(' | ')}
                      </div>
                    ) : null}
                  </div>
                  <div className="pt-1 text-xs text-zinc-500 transition-colors group-open:text-sky-300">
                    expand
                  </div>
                </summary>
                <div className="mt-4">
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-white/6 bg-zinc-950/90 p-4 text-[11px] leading-5 text-zinc-300">
                    {JSON.stringify(frame, null, 2)}
                  </pre>
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <JsonBlock label="Raw roast result" value={roast} />
        <JsonBlock label="Raw admin analytics" value={admin} />
      </div>
    </section>
  );
}
