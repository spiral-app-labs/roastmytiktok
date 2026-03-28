import { execSync } from 'child_process';
import { existsSync, unlinkSync, statSync } from 'fs';

/**
 * Extract audio from a video file as 16kHz mono WAV using ffmpeg.
 * Returns the path to the WAV file, or null if extraction fails.
 */
export function extractAudio(videoPath: string): string | null {
  const outputPath = `${videoPath}.audio.wav`;

  try {
    // Don't suppress stderr — capture it for debugging
    const result = execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y 2>&1`,
      { timeout: 30000, encoding: 'utf-8' }
    );

    if (existsSync(outputPath)) {
      // Verify the file has actual content (not just a header)
      const stats = statSync(outputPath);
      if (stats.size < 1000) {
        console.warn('[audio-extractor] Extracted audio file is too small, likely no audio track:', stats.size, 'bytes');
        try { unlinkSync(outputPath); } catch { /* ignore */ }
        return null;
      }
      return outputPath;
    }

    console.warn('[audio-extractor] Output file not created. ffmpeg output:', result);
    return null;
  } catch (err) {
    // ffmpeg returns non-zero exit code even on success sometimes
    // Check if the file was actually created
    if (existsSync(outputPath)) {
      const stats = statSync(outputPath);
      if (stats.size >= 1000) {
        return outputPath;
      }
      try { unlinkSync(outputPath); } catch { /* ignore */ }
    }
    console.warn('[audio-extractor] Failed to extract audio:', err instanceof Error ? err.message : err);
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
