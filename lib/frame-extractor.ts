import { execSync } from 'child_process';
import { readFileSync, mkdirSync, rmSync, existsSync } from 'fs';

/**
 * Extract evenly-spaced frames from a video file using ffmpeg.
 * Returns an array of base64-encoded JPEG strings.
 */
export function extractFrames(videoPath: string, numFrames: number = 8): string[] {
  const framesDir = `${videoPath}_frames`;
  mkdirSync(framesDir, { recursive: true });

  try {
    // Get video duration
    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      { encoding: 'utf-8' }
    ).trim();
    const duration = parseFloat(durationStr);

    if (isNaN(duration) || duration <= 0) {
      throw new Error('Could not determine video duration');
    }

    const interval = duration / (numFrames + 1);
    const frames: string[] = [];

    for (let i = 1; i <= numFrames; i++) {
      const timestamp = interval * i;
      const outputPath = `${framesDir}/frame_${i}.jpg`;
      execSync(
        `ffmpeg -ss ${timestamp.toFixed(2)} -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}" -y 2>/dev/null`,
        { timeout: 15000 }
      );

      if (existsSync(outputPath)) {
        const buffer = readFileSync(outputPath);
        frames.push(buffer.toString('base64'));
      }
    }

    return frames;
  } finally {
    // Clean up frames directory
    if (existsSync(framesDir)) {
      rmSync(framesDir, { recursive: true, force: true });
    }
  }
}
