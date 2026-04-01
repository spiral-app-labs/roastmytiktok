import { execSync } from 'child_process';
import { readFileSync, mkdirSync, rmSync, existsSync, statSync } from 'fs';

export interface ExtractedFrame {
  timestampSec: number;
  imageBase64: string;
  slot: 'opening' | 'story';
  label: string;
}

interface PlannedFrame {
  timestampSec: number;
  slot: 'opening' | 'story';
  label: string;
}

/** Minimum JPEG size in bytes — anything smaller is likely corrupt or blank. */
const MIN_FRAME_BYTES = 500;

/** Maximum time (ms) to allow for a single ffprobe/ffmpeg call. */
const FFMPEG_TIMEOUT_MS = 15_000;

/**
 * Fixed opening timestamps for text-hook detection.
 * These are the critical moments where on-screen text hooks appear:
 * 0s (title card), 0.5s, 1s, 1.5s, 2s, 3s — dense sampling in the
 * opening 3 seconds where 63% of attention decisions happen.
 */
const OPENING_ANCHORS = [0.05, 0.5, 1.0, 1.5, 2.0, 3.0];

export function buildFramePlan(durationSec: number, numFrames: number = 8): PlannedFrame[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('Could not determine video duration');
  }

  const desiredFrames = Math.max(4, numFrames);
  const timestamps = new Map<number, PlannedFrame>();

  const pushFrame = (rawTimestamp: number, slot: 'opening' | 'story', forcedLabel?: string) => {
    const clamped = Math.max(0.03, Math.min(durationSec - 0.05, rawTimestamp));
    const timestampSec = Number(clamped.toFixed(2));
    if (timestamps.has(timestampSec)) return;
    const label = forcedLabel ?? (slot === 'opening'
      ? `Opening frame at ${timestampSec.toFixed(2)}s`
      : `Story frame at ${timestampSec.toFixed(2)}s`);
    timestamps.set(timestampSec, { timestampSec, slot, label });
  };

  // Guaranteed opening anchor frames at 0s, 0.5s, 1s, 1.5s, 2s, 3s
  // These ensure text hooks, title cards, and on-screen text are always captured
  for (const anchor of OPENING_ANCHORS) {
    if (anchor < durationSec) {
      const label = anchor <= 0.05
        ? `First-frame anchor at ${anchor.toFixed(2)}s (title-card / text-hook sample)`
        : `Opening text-detection frame at ${anchor.toFixed(1)}s`;
      pushFrame(anchor, 'opening', label);
    }
  }

  // Fill remaining slots with story frames from later in the video
  const storyCount = Math.max(0, desiredFrames - timestamps.size);
  if (storyCount > 0 && durationSec > 3.5) {
    const storyStart = Math.min(3.5, durationSec * 0.4);
    const storySpan = Math.max(durationSec - storyStart - 0.1, durationSec * 0.2);

    for (let i = 0; i < storyCount; i++) {
      const raw = storyCount === 1
        ? storyStart + storySpan / 2
        : storyStart + storySpan * ((i + 1) / (storyCount + 1));
      pushFrame(raw, 'story');
    }
  }

  return [...timestamps.values()].sort((a, b) => a.timestampSec - b.timestampSec).slice(0, desiredFrames);
}

/**
 * Extract strategically sampled frames from a video file using ffmpeg.
 * Densely samples the opening so hook text and frame-one changes are less likely to be missed,
 * then samples the remaining story beats.
 *
 * Hardened: validates video before extraction, catches per-frame failures,
 * detects corrupt/blank frames, and continues with whatever frames succeed.
 */
export function extractFrames(videoPath: string, numFrames: number = 8): ExtractedFrame[] {
  // Validate video file exists and has content
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
    // Get video duration with validation
    let durationStr: string;
    try {
      durationStr = execSync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
        { encoding: 'utf-8', timeout: FFMPEG_TIMEOUT_MS }
      ).trim();
    } catch (probeErr) {
      console.error('[frame-extractor] ffprobe failed — video may be corrupt or unsupported format:', probeErr);
      return [];
    }

    const duration = parseFloat(durationStr);
    if (!Number.isFinite(duration) || duration <= 0) {
      console.error(`[frame-extractor] Invalid video duration: "${durationStr}"`);
      return [];
    }

    const framePlan = buildFramePlan(duration, numFrames);
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
          console.warn(`[frame-extractor] Frame ${i + 1} not written at ${frame.timestampSec}s — skipping`);
          continue;
        }

        const fileSize = statSync(outputPath).size;
        if (fileSize < MIN_FRAME_BYTES) {
          console.warn(`[frame-extractor] Frame ${i + 1} too small (${fileSize}B) — likely corrupt or blank, skipping`);
          continue;
        }

        const buffer = readFileSync(outputPath);
        frames.push({
          timestampSec: frame.timestampSec,
          imageBase64: buffer.toString('base64'),
          slot: frame.slot,
          label: frame.label,
        });
      } catch (frameErr) {
        // Individual frame failure — log and continue with remaining frames
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
