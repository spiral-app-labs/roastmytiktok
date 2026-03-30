import { execSync } from 'child_process';
import { existsSync, unlinkSync, statSync } from 'fs';

/**
 * Extract audio from a video file as a 16kHz mono WAV using ffmpeg.
 * Returns the path to the WAV file, or null if extraction fails.
 */
export function extractAudio(videoPath: string): string | null {
  const outputPath = `${videoPath}.audio.wav`;

  try {
    if (!existsSync(videoPath)) {
      console.error(`[audio-extractor] Video file not found: ${videoPath}`);
      return null;
    }

    const videoSize = statSync(videoPath).size;
    console.log(`[audio-extractor] Extracting audio from ${videoPath} (${(videoSize / 1024).toFixed(1)} KB)`);

    execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y 2>&1`,
      { timeout: 30000 }
    );

    if (existsSync(outputPath)) {
      const audioSize = statSync(outputPath).size;
      if (audioSize === 0) {
        console.error('[audio-extractor] Extracted audio file is empty (0 bytes) — video may have no audio track');
        unlinkSync(outputPath);
        return null;
      }
      console.log(`[audio-extractor] Audio extracted: ${outputPath} (${(audioSize / 1024).toFixed(1)} KB)`);
      return outputPath;
    }

    console.error('[audio-extractor] ffmpeg ran but output file not found');
    return null;
  } catch (err) {
    console.error('[audio-extractor] Failed to extract audio:', err);
    // Clean up partial output
    if (existsSync(outputPath)) {
      try { unlinkSync(outputPath); } catch { /* ignore */ }
    }
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
