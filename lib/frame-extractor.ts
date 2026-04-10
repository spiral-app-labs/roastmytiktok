import { execSync } from 'child_process';
import { readFileSync, mkdirSync, rmSync, existsSync, statSync } from 'fs';

export type FrameZone = 'hook' | 'transition' | 'body';
export type FramePlanMode = 'hook-only' | 'extended_10s' | 'full_video';

export interface ExtractedFrame {
  timestampSec: number;
  imageBase64: string;
  zone: FrameZone;
  label: string;
}

interface PlannedFrame {
  timestampSec: number;
  zone: FrameZone;
  label: string;
}

/** Minimum JPEG size in bytes - anything smaller is likely corrupt or blank. */
const MIN_FRAME_BYTES = 500;

/** Maximum time (ms) to allow for a single ffprobe/ffmpeg call. */
const FFMPEG_TIMEOUT_MS = 15_000;

/**
 * Build a variable-density frame plan with an explicit analysis mode.
 *
 * hook-only:
 * - 0-3s at ~3 fps (9 frames including a first-frame anchor)
 * - 3-6s at ~2 fps (6 frames)
 *
 * extended_10s:
 * - hook-only plan
 * - 6-10s at ~1 fps (4 frames)
 *
 * full_video:
 * - extended_10s plan
 * - sparse body coverage after 10s, capped for long videos
 */
export function buildFramePlan(durationSec: number, mode: FramePlanMode = 'full_video'): PlannedFrame[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('Could not determine video duration');
  }

  const timestamps = new Map<number, PlannedFrame>();

  const pushFrame = (rawTimestamp: number, zone: FrameZone, label?: string) => {
    const clamped = Math.max(0.03, Math.min(durationSec - 0.05, rawTimestamp));
    const timestampSec = Number(clamped.toFixed(2));
    if (timestamps.has(timestampSec)) return;
    const defaultLabel = `${zone} frame at ${timestampSec.toFixed(1)}s`;
    timestamps.set(timestampSec, { timestampSec, zone, label: label ?? defaultLabel });
  };

  // --- Hook zone (0-6s): 0-3s at ~3 fps, 3-6s at ~2 fps ---
  const hookEnd = Math.min(6, durationSec);
  const hookAnchors = [
    0.05, 0.38, 0.72, 1.05, 1.38, 1.72, 2.05, 2.38, 2.72,
    3.0, 3.5, 4.0, 4.5, 5.0, 5.5,
  ];
  for (const anchor of hookAnchors) {
    if (anchor < hookEnd) {
      const label = anchor <= 0.05
        ? `First frame at ${anchor}s (thumbnail / title card)`
        : `Hook frame at ${anchor.toFixed(1)}s`;
      pushFrame(anchor, 'hook', label);
    }
  }

  if (mode === 'hook-only') {
    return [...timestamps.values()].sort((a, b) => a.timestampSec - b.timestampSec);
  }

  // --- Transition zone (6-10s): ~1 fps ---
  if (durationSec > 6) {
    const transitionEnd = Math.min(10, durationSec);
    for (let t = 6.5; t < transitionEnd; t += 1.0) {
      pushFrame(t, 'transition', `Extended hook frame at ${t.toFixed(1)}s`);
    }
  }

  if (mode === 'extended_10s') {
    return [...timestamps.values()].sort((a, b) => a.timestampSec - b.timestampSec);
  }

  // --- Body zone (10s+): 1 fps, capped ---
  if (durationSec > 10) {
    const bodyStart = 10.5;
    const bodyEnd = durationSec - 0.1;
    const bodySpan = bodyEnd - bodyStart;
    if (bodySpan <= 0) {
      return [...timestamps.values()].sort((a, b) => a.timestampSec - b.timestampSec);
    }
    const maxBodyFrames = Math.min(30, Math.floor(bodySpan));
    const step = bodySpan / Math.max(1, maxBodyFrames);

    for (let i = 0; i < maxBodyFrames; i++) {
      pushFrame(bodyStart + step * i, 'body');
    }
  }

  return [...timestamps.values()].sort((a, b) => a.timestampSec - b.timestampSec);
}

/**
 * Extract variable-density frames from a video file using ffmpeg.
 *
 * Hook zone (0-6s): dense default sampling for the critical attention window.
 * Transition zone (6-10s): optional extension when the hook is strong.
 * Body (10s+): sparse coverage only for full-video mode.
 *
 * Hardened: validates video before extraction, catches per-frame failures,
 * detects corrupt/blank frames, and continues with whatever frames succeed.
 */
export function extractFrames(videoPath: string, mode: FramePlanMode = 'full_video'): ExtractedFrame[] {
  if (!existsSync(videoPath)) {
    console.error(`[frame-extractor] Video file not found: ${videoPath}`);
    return [];
  }

  const videoSize = statSync(videoPath).size;
  if (videoSize === 0) {
    console.error(`[frame-extractor] Video file is empty (0 bytes): ${videoPath}`);
    return [];
  }

  const framesDir = `${videoPath}_frames`;
  mkdirSync(framesDir, { recursive: true });

  try {
    let durationStr: string;
    try {
      durationStr = execSync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
        { encoding: 'utf-8', timeout: FFMPEG_TIMEOUT_MS }
      ).trim();
    } catch (probeErr) {
      console.error('[frame-extractor] ffprobe failed - video may be corrupt or unsupported format:', probeErr);
      return [];
    }

    const duration = parseFloat(durationStr);
    if (!Number.isFinite(duration) || duration <= 0) {
      console.error(`[frame-extractor] Invalid video duration: "${durationStr}"`);
      return [];
    }

    const framePlan = buildFramePlan(duration, mode);
    console.log(`[frame-extractor] Planned ${framePlan.length} frames for ${duration.toFixed(1)}s video in ${mode} mode (hook: ${framePlan.filter(f => f.zone === 'hook').length}, transition: ${framePlan.filter(f => f.zone === 'transition').length}, body: ${framePlan.filter(f => f.zone === 'body').length})`);

    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < framePlan.length; i++) {
      const frame = framePlan[i];
      const outputPath = `${framesDir}/frame_${i + 1}.jpg`;

      try {
        execSync(
          `ffmpeg -ss ${frame.timestampSec.toFixed(2)} -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}" -y 2>/dev/null`,
          { timeout: FFMPEG_TIMEOUT_MS }
        );

        if (!existsSync(outputPath)) {
          console.warn(`[frame-extractor] Frame ${i + 1} not written at ${frame.timestampSec}s - skipping`);
          continue;
        }

        const fileSize = statSync(outputPath).size;
        if (fileSize < MIN_FRAME_BYTES) {
          console.warn(`[frame-extractor] Frame ${i + 1} too small (${fileSize}B) - likely corrupt or blank, skipping`);
          continue;
        }

        const buffer = readFileSync(outputPath);
        frames.push({
          timestampSec: frame.timestampSec,
          imageBase64: buffer.toString('base64'),
          zone: frame.zone,
          label: frame.label,
        });
      } catch (frameErr) {
        const errMsg = frameErr instanceof Error ? frameErr.message : String(frameErr);
        const isTimeout = errMsg.includes('ETIMEDOUT') || errMsg.includes('timed out');
        console.warn(
          `[frame-extractor] Frame ${i + 1} at ${frame.timestampSec}s failed${isTimeout ? ' (timeout)' : ''}: ${errMsg.slice(0, 200)}`
        );
        continue;
      }
    }

    if (frames.length === 0 && framePlan.length > 0) {
      console.error(`[frame-extractor] All ${framePlan.length} frame extractions failed for ${videoPath}`);
    } else if (frames.length < framePlan.length) {
      console.warn(`[frame-extractor] Partial extraction: ${frames.length}/${framePlan.length} frames succeeded`);
    }

    return frames;
  } finally {
    if (existsSync(framesDir)) {
      rmSync(framesDir, { recursive: true, force: true });
    }
  }
}
