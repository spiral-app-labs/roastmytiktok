'use client';

import { motion } from 'framer-motion';

export const ANALYSIS_STAGE_LABELS = [
  'Uploading video...',
  'Extracting hook frames (0-6s)...',
  'Reading the opener and scoring the hook...',
  'Measuring first-change timing and hold...',
  'Deciding whether to expand analysis...',
  'Building the hook action plan...',
  'Done!',
] as const;

export type AnalysisStageLabel = (typeof ANALYSIS_STAGE_LABELS)[number];

type StageState = 'pending' | 'active' | 'done';

function getStageState(index: number, activeIndex: number): StageState {
  if (index < activeIndex) return 'done';
  if (index === activeIndex) return 'active';
  return 'pending';
}

export function deriveAnalysisStageIndex(params: {
  uploadComplete?: boolean;
  statusMessage?: string;
  completedAgents?: number;
  totalAgents?: number;
  hookStarted?: boolean;
  mediaAgentsStarted?: boolean;
  verdictReady?: boolean;
  done?: boolean;
}): number {
  const {
    uploadComplete = false,
    statusMessage = '',
    completedAgents = 0,
    totalAgents = 6,
    hookStarted = false,
    mediaAgentsStarted = false,
    verdictReady = false,
    done = false,
  } = params;

  if (done) return 6;
  if (verdictReady || completedAgents >= totalAgents) return 5;

  const normalized = statusMessage.toLowerCase();

  if (!uploadComplete) return 0;
  if (normalized.includes('extracting hook frame') || normalized.includes('extracting frame')) return 1;
  if (hookStarted && completedAgents <= 1) return 2;
  if (normalized.includes('expand') || normalized.includes('loaded through 10 seconds') || normalized.includes('full-video secondary analysis')) return 4;
  if (mediaAgentsStarted) return 4;
  if (completedAgents > 0 || normalized.includes('analyzing hook frames') || normalized.includes('opening text') || normalized.includes('hook survival')) return 3;
  if (
    normalized.includes('extracting audio') ||
    normalized.includes('transcrib') ||
    normalized.includes('caption') ||
    normalized.includes('audio')
  ) {
    return 4;
  }

  return 1;
}

export function deriveAnalysisProgressPercent(activeIndex: number, completedAgents = 0, totalAgents = 6): number {
  const anchors = [14, 28, 46, 64, 82, 94, 100];

  if (activeIndex <= 1) return anchors[activeIndex];
  if (activeIndex === 2) return Math.max(anchors[2], 46 + Math.round((Math.min(completedAgents, 1) / 1) * 8));
  if (activeIndex === 3) return Math.max(anchors[3], 60 + Math.round((Math.min(completedAgents, totalAgents) / totalAgents) * 12));
  if (activeIndex === 4) return Math.max(anchors[4], 78 + Math.round((Math.min(completedAgents, totalAgents) / totalAgents) * 8));
  if (activeIndex === 5) return anchors[5];
  return 100;
}

interface AnalysisStageProgressProps {
  activeIndex: number;
  progressPercent?: number;
  eyebrow?: string;
  title?: string;
  description?: string;
  liveDetail?: string;
  compact?: boolean;
}

export function AnalysisStageProgress({
  activeIndex,
  progressPercent,
  eyebrow = 'Go Viral analysis',
  title = 'Working through your video',
  description = 'The system is moving through the real analysis pipeline so you can see what is happening next.',
  liveDetail,
  compact = false,
}: AnalysisStageProgressProps) {
  const percent = progressPercent ?? deriveAnalysisProgressPercent(activeIndex);

  return (
    <div
      className={`rounded-[28px] border border-orange-500/20 bg-zinc-950/85 shadow-2xl shadow-orange-500/5 backdrop-blur-xl ${
        compact ? 'p-5' : 'p-6 sm:p-8'
      }`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">
            <motion.span
              className="h-2 w-2 rounded-full bg-orange-400"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.15, repeat: Infinity }}
            />
            {eyebrow}
          </div>

          <h1 className={`${compact ? 'mt-4 text-2xl' : 'mt-5 text-3xl sm:text-4xl'} font-black tracking-tight text-white`}>
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{description}</p>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Overall progress</span>
              <span className="font-mono text-orange-300">{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-pink-500"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </div>
          </div>

          {liveDetail ? <p className="mt-3 text-xs text-zinc-500">{liveDetail}</p> : null}
        </div>

        <div className="w-full max-w-xl space-y-3">
          {ANALYSIS_STAGE_LABELS.map((label, index) => {
            const stageState = getStageState(index, activeIndex);

            return (
              <div
                key={label}
                className={`rounded-2xl border px-4 py-3 transition-all duration-300 ${
                  stageState === 'done'
                    ? 'border-emerald-500/25 bg-emerald-500/10'
                    : stageState === 'active'
                      ? 'border-orange-500/30 bg-orange-500/10'
                      : 'border-zinc-800/80 bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      stageState === 'done'
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : stageState === 'active'
                          ? 'border-orange-500/30 bg-orange-500/15 text-orange-200'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    {stageState === 'done' ? '✓' : `${index + 1}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        stageState === 'pending'
                          ? 'text-zinc-500'
                          : stageState === 'done'
                            ? 'text-zinc-200'
                            : 'text-white'
                      }`}
                    >
                      {label}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      stageState === 'done'
                        ? 'text-emerald-300'
                        : stageState === 'active'
                          ? 'text-orange-300'
                          : 'text-zinc-600'
                    }`}
                  >
                    {stageState === 'done' ? 'done' : stageState === 'active' ? 'working' : 'queued'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
