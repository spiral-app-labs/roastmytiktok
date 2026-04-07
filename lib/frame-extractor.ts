import { execSync } from 'child_process';
import { readFileSync, mkdirSync, rmSync, existsSync, statSync } from 'fs';

export type FrameZone = 'hook' | 'transition' | 'body';

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
 * Build a variable-density frame plan.
 *
 * Hook zone (0-5s): ~2.5 fps = 13 frames  - captures text hooks, title cards, expressions
 * Transition zone (5-8s): ~1 fps = 3 frames - captures shift from hook to body
 * Body (8s+): 1 fps - captures the rest of the video
 *
 * Scales dynamically with video duration. Short videos (<8s) get dense hook
 * sampling only. Long videos (>60s) cap body frames to keep total reasonable.
 */
export function buildFramePlan(durationSec: number): PlannedFrame[] {
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

  // --- Hook zone (0-5s): ~2.5 fps ---
  // Dense sampling where attention decisions happen
  const hookEnd = Math.min(5, durationSec);
  const hookAnchors = [0.05, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0, 4.4, 4.8];
  for (const anchor of hookAnchors) {
    if (anchor < hookEnd) {
      const label = anchor <= 0.05
        ? `First frame at ${anchor}s (thumbnail / title card)`
        : `Hook frame at ${anchor.toFixed(1)}s`;
      pushFrame(anchor, 'hook', label);
    }
  }

  // --- Transition zone (5-8s): ~1 fps ---
  if (durationSec > 5) {
    const transitionEnd = Math.min(8, durationSec);
    for (let t = 5.5; t < transitionEnd; t += 1.0) {
      pushFrame(t, 'transition');
    }
  }

  // --- Body zone (8s+): 1 fps, capped ---
  if (durationSec > 8) {
    const bodyStart = 8.5;
    const bodyEnd = durationSec - 0.1;
    const bodySpan = bodyEnd - bodyStart;
    // Cap at 40 body frames for very long videos
    const maxBodyFrames = Math.min(40, Math.floor(bodySpan));
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
 * Hook zone (0-5s): ~2.5 fps for maximum detail in the critical attention window.
 * Transition zone (5-8s): ~1 fps to catch the shift from hook to body.
 * Body (8s+): 1 fps for the rest, capped for long videos.
 *
 * Hardened: validates video before extraction, catches per-frame failures,
 * detects corrupt/blank frames, and continues with whatever frames succeed.
 */
export function extractFrames(videoPath: string): ExtractedFrame[] {
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

    const framePlan = buildFramePlan(duration);
    console.log(`[frame-extractor] Planned ${framePlan.length} frames for ${duration.toFixed(1)}s video (hook: ${framePlan.filter(f => f.zone === 'hook').length}, transition: ${framePlan.filter(f => f.zone === 'transition').length}, body: ${framePlan.filter(f => f.zone === 'body').length})`);

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
