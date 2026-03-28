import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

/**
 * Extract audio from a video file as a 16kHz mono WAV using ffmpeg.
 * Returns the path to the WAV file, or null if extraction fails.
 */
export function extractAudio(videoPath: string): string | null {
  const outputPath = `${videoPath}.audio.wav`;

  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y 2>/dev/null`,
      { timeout: 30000 }
    );

    if (existsSync(outputPath)) {
      return outputPath;
    }
    return null;
  } catch (err) {
    console.warn('[audio-extractor] Failed to extract audio:', err);
    return null;
  }
}

/**
 * Clean up an extracted audio file.
 */
export function cleanupAudio(audioPath: string): void {
  try {
    if (existsSync(audioPath)) unlinkSync(audioPath);
  } catch { /* ignore cleanup errors */ }
}
