import { execSync } from 'child_process';
import { readFileSync, mkdirSync, rmSync, existsSync } from 'fs';

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

export function buildFramePlan(durationSec: number, numFrames: number = 8): PlannedFrame[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('Could not determine video duration');
  }

  const desiredFrames = Math.max(4, numFrames);
  const openingWindow = Math.min(Math.max(durationSec * 0.35, 2.5), 4);
  const openingCount = Math.min(4, Math.max(3, Math.ceil(desiredFrames / 2)));
  const storyCount = Math.max(0, desiredFrames - openingCount);
  const timestamps = new Map<number, PlannedFrame>();

  const pushFrame = (rawTimestamp: number, slot: 'opening' | 'story') => {
    const clamped = Math.max(0.05, Math.min(durationSec - 0.05, rawTimestamp));
    const timestampSec = Number(clamped.toFixed(2));
    if (timestamps.has(timestampSec)) return;
    const label = slot === 'opening'
      ? `Opening frame at ${timestampSec.toFixed(2)}s`
      : `Story frame at ${timestampSec.toFixed(2)}s`;
    timestamps.set(timestampSec, { timestampSec, slot, label });
  };

  for (let i = 0; i < openingCount; i++) {
    const raw = openingCount === 1
      ? Math.min(0.35, durationSec / 2)
      : 0.15 + (openingWindow - 0.15) * (i / (openingCount - 1));
    pushFrame(raw, 'opening');
  }

  if (storyCount > 0) {
    const remainingWindowStart = Math.min(openingWindow + 0.35, Math.max(durationSec * 0.45, openingWindow));
    const remainingSpan = Math.max(durationSec - remainingWindowStart, durationSec * 0.2);

    for (let i = 0; i < storyCount; i++) {
      const raw = storyCount === 1
        ? remainingWindowStart + remainingSpan / 2
        : remainingWindowStart + remainingSpan * ((i + 1) / (storyCount + 1));
      pushFrame(raw, 'story');
    }
  }

  return [...timestamps.values()].sort((a, b) => a.timestampSec - b.timestampSec).slice(0, desiredFrames);
}

/**
 * Extract strategically sampled frames from a video file using ffmpeg.
 * Densely samples the opening so hook text and frame-one changes are less likely to be missed,
 * then samples the remaining story beats.
 */
export function extractFrames(videoPath: string, numFrames: number = 8): ExtractedFrame[] {
  const framesDir = `${videoPath}_frames`;
  mkdirSync(framesDir, { recursive: true });

  try {
    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      { encoding: 'utf-8' }
    ).trim();
    const duration = parseFloat(durationStr);
    const framePlan = buildFramePlan(duration, numFrames);
    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < framePlan.length; i++) {
      const frame = framePlan[i];
      const outputPath = `${framesDir}/frame_${i + 1}.jpg`;
      execSync(
        `ffmpeg -ss ${frame.timestampSec.toFixed(2)} -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}" -y 2>/dev/null`,
        { timeout: 15000 }
      );

      if (existsSync(outputPath)) {
        const buffer = readFileSync(outputPath);
        frames.push({
          timestampSec: frame.timestampSec,
          imageBase64: buffer.toString('base64'),
          slot: frame.slot,
          label: frame.label,
        });
      }
    }

    return frames;
  } finally {
    if (existsSync(framesDir)) {
      rmSync(framesDir, { recursive: true, force: true });
    }
  }
}
