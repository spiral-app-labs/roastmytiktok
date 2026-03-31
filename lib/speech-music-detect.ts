import { execSync } from 'child_process';

export interface AudioCharacteristics {
  hasSpeech: boolean;
  hasMusic: boolean;
  speechPercent: number;
  /** Estimated speaking pace category — only set when speech is detected without a full transcript. */
  pacingHint?: 'fast' | 'normal' | 'slow';
  /** Mean audio volume in dBFS — helps audio agent characterize loudness/clarity. */
  meanVolumeDB?: number;
  /** Max audio volume in dBFS — used to detect clipping or very quiet recordings. */
  maxVolumeDB?: number;
  /** Number of detected silence gaps — correlates with speaking pace and natural pauses. */
  silenceGapCount?: number;
  /** Audio duration in seconds. */
  durationSec?: number;
}

/**
 * Basic speech vs music detection using ffmpeg audio analysis heuristics.
 * Uses silence detection and volume statistics to infer content type.
 */
export function detectSpeechMusic(audioPath: string): AudioCharacteristics {
  try {
    // Get audio duration
    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();
    const duration = parseFloat(durationStr);

    if (isNaN(duration) || duration <= 0) {
      return { hasSpeech: false, hasMusic: false, speechPercent: 0 };
    }

    // Silence detection: speech has gaps, music is more continuous
    let silenceDuration = 0;
    try {
      const silenceOutput = execSync(
        `ffmpeg -i "${audioPath}" -af silencedetect=noise=-30dB:d=0.5 -f null - 2>&1`,
        { encoding: 'utf-8', timeout: 15000 }
      );

      const silenceMatches = silenceOutput.match(/silence_duration:\s*([\d.]+)/g);
      if (silenceMatches) {
        for (const match of silenceMatches) {
          const val = parseFloat(match.replace('silence_duration: ', ''));
          if (!isNaN(val)) silenceDuration += val;
        }
      }
    } catch { /* silence detection failed, continue with volume analysis */ }

    // Volume detection
    let meanVolume = -Infinity;
    let maxVolume = -Infinity;
    try {
      const volumeOutput = execSync(
        `ffmpeg -i "${audioPath}" -af volumedetect -f null - 2>&1`,
        { encoding: 'utf-8', timeout: 15000 }
      );

      const meanMatch = volumeOutput.match(/mean_volume:\s*([-\d.]+)/);
      const maxMatch = volumeOutput.match(/max_volume:\s*([-\d.]+)/);
      if (meanMatch) meanVolume = parseFloat(meanMatch[1]);
      if (maxMatch) maxVolume = parseFloat(maxMatch[1]);
    } catch { /* volume detection failed */ }

    const silenceRatio = silenceDuration / duration;
    const volumeRange = maxVolume - meanVolume;

    // Heuristics:
    // Speech: has silence gaps (pauses between words), moderate volume variation
    // Music: continuous audio, high average volume, low variation
    const hasSpeech = silenceRatio > 0.05 && silenceRatio < 0.8 && meanVolume > -50;
    const hasMusic = meanVolume > -30 && volumeRange < 15 && silenceRatio < 0.2;

    // Estimate speech percentage based on non-silence ratio
    const speechPercent = hasSpeech
      ? Math.round(Math.min(100, Math.max(0, (1 - silenceRatio) * 100)))
      : 0;

    // Count silence gaps to estimate speaking pace when transcript is unavailable.
    // TikTok speech at ~140-160 wpm creates roughly 2-4 silence gaps per second.
    let silenceGapCount = 0;
    try {
      const silenceGapOutput = execSync(
        `ffmpeg -i "${audioPath}" -af silencedetect=noise=-30dB:d=0.3 -f null - 2>&1`,
        { encoding: 'utf-8', timeout: 15000 }
      );
      const gapMatches = silenceGapOutput.match(/silence_start:/g);
      silenceGapCount = gapMatches ? gapMatches.length : 0;
    } catch { /* ignore */ }

    // Pacing heuristic: gaps per second on speech-active audio
    let pacingHint: AudioCharacteristics['pacingHint'];
    if (hasSpeech && duration > 0) {
      const speechDuration = duration * (1 - silenceRatio);
      const gapsPerSecond = speechDuration > 0 ? silenceGapCount / speechDuration : 0;
      // Rough calibration: fast speech ~4+ gaps/s, normal ~2-4, slow <2
      if (gapsPerSecond >= 3.5) pacingHint = 'fast';
      else if (gapsPerSecond >= 1.5) pacingHint = 'normal';
      else if (hasSpeech) pacingHint = 'slow';
    }

    return {
      hasSpeech,
      hasMusic,
      speechPercent,
      pacingHint,
      meanVolumeDB: Number.isFinite(meanVolume) ? meanVolume : undefined,
      maxVolumeDB: Number.isFinite(maxVolume) ? maxVolume : undefined,
      silenceGapCount,
      durationSec: duration,
    };
  } catch (err) {
    console.warn('[speech-music-detect] Detection failed:', err);
    return { hasSpeech: false, hasMusic: false, speechPercent: 0 };
  }
}
