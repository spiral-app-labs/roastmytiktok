import { execSync } from 'child_process';

export type DurationCategory =
  | 'WAY_TOO_SHORT'
  | 'TOO_SHORT'
  | 'OPTIMAL'
  | 'TOO_LONG'
  | 'WAY_TOO_LONG';

export interface VideoDuration {
  durationSeconds: number;
  durationFormatted: string;
}

export interface DurationAnalysis {
  duration: VideoDuration;
  category: DurationCategory;
  optimalRange: { min: number; max: number };
  deltaSeconds: number; // negative = under, positive = over, 0 = in range
}

/**
 * Extract video duration using ffprobe.
 * Returns null if ffprobe fails or duration can't be determined.
 */
export function getVideoDuration(videoPath: string): VideoDuration | null {
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      { encoding: 'utf-8', timeout: 10000 },
    ).trim();

    const seconds = parseFloat(raw);
    if (isNaN(seconds) || seconds <= 0) return null;

    const rounded = Math.round(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    const formatted = mins > 0
      ? `${mins}m ${secs}s`
      : `${secs}s`;

    return { durationSeconds: seconds, durationFormatted: formatted };
  } catch {
    return null;
  }
}

/**
 * Parse an optimalLength string like "15-45 seconds" into { min, max }.
 */
export function parseOptimalRange(optimalLength: string): { min: number; max: number } {
  const match = optimalLength.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return { min: 15, max: 60 }; // safe fallback
  return { min: parseInt(match[1]), max: parseInt(match[2]) };
}

/**
 * Compare actual duration to niche-specific optimal range.
 */
export function analyzeDuration(
  duration: VideoDuration,
  optimalLength: string,
): DurationAnalysis {
  const range = parseOptimalRange(optimalLength);
  const secs = duration.durationSeconds;

  let category: DurationCategory;
  let deltaSeconds: number;

  if (secs < range.min) {
    deltaSeconds = secs - range.min; // negative
    const halfMin = range.min * 0.5;
    category = secs < halfMin ? 'WAY_TOO_SHORT' : 'TOO_SHORT';
  } else if (secs > range.max) {
    deltaSeconds = secs - range.max; // positive
    const overThreshold = range.max * 1.5;
    category = secs > overThreshold ? 'WAY_TOO_LONG' : 'TOO_LONG';
  } else {
    deltaSeconds = 0;
    category = 'OPTIMAL';
  }

  return {
    duration,
    category,
    optimalRange: range,
    deltaSeconds: Math.round(deltaSeconds),
  };
}
