import { execSync } from 'child_process';
import { existsSync, unlinkSync, statSync } from 'fs';

/** Maximum video file size we'll attempt audio extraction on (500 MB). */
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

/** ffmpeg extraction timeout (30s). */
const EXTRACT_TIMEOUT_MS = 30_000;

/**
 * Extract audio from a video file as a 16kHz mono WAV using ffmpeg.
 * Returns the path to the WAV file, or null if extraction fails.
 *
 * Hardened: validates file size limits, categorizes errors (missing audio track,
 * corrupt video, timeout), and always cleans up partial output.
 */
export function extractAudio(videoPath: string): string | null {
  const outputPath = `${videoPath}.audio.wav`;

  try {
    if (!existsSync(videoPath)) {
      console.error(`[audio-extractor] Video file not found: ${videoPath}`);
      return null;
    }

    const videoSize = statSync(videoPath).size;
    if (videoSize === 0) {
      console.error('[audio-extractor] Video file is empty (0 bytes)');
      return null;
    }

    if (videoSize > MAX_VIDEO_SIZE_BYTES) {
      console.error(`[audio-extractor] Video too large for audio extraction (${(videoSize / 1024 / 1024).toFixed(1)} MB > ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB limit)`);
      return null;
    }

    console.log(`[audio-extractor] Extracting audio from ${videoPath} (${(videoSize / 1024).toFixed(1)} KB)`);

    // Check if video has an audio stream before attempting extraction
    let hasAudioStream = true;
    try {
      const probeOutput = execSync(
        `ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${videoPath}"`,
        { encoding: 'utf-8', timeout: 10_000 }
      ).trim();
      hasAudioStream = probeOutput.includes('audio');
    } catch {
      // If probe fails, still attempt extraction - ffmpeg will handle it
    }

    if (!hasAudioStream) {
      console.warn('[audio-extractor] No audio stream detected in video - video may be silent');
      return null;
    }

    execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y 2>&1`,
      { timeout: EXTRACT_TIMEOUT_MS }
    );

    if (existsSync(outputPath)) {
      const audioSize = statSync(outputPath).size;
      if (audioSize === 0) {
        console.error('[audio-extractor] Extracted audio file is empty (0 bytes) - video may have no audio track');
        unlinkSync(outputPath);
        return null;
      }
      console.log(`[audio-extractor] Audio extracted: ${outputPath} (${(audioSize / 1024).toFixed(1)} KB)`);
      return outputPath;
    }

    console.error('[audio-extractor] ffmpeg ran but output file not found');
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('ETIMEDOUT') || message.includes('timed out');

    if (isTimeout) {
      console.error(`[audio-extractor] Audio extraction timed out after ${EXTRACT_TIMEOUT_MS}ms`);
    } else {
      console.error('[audio-extractor] Failed to extract audio:', message.slice(0, 300));
    }

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
