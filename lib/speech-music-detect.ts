import { execSync } from 'child_process';

export interface AudioCharacteristics {
  hasSpeech: boolean;
  hasMusic: boolean;
  speechPercent: number;
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

    return { hasSpeech, hasMusic, speechPercent };
  } catch (err) {
    console.warn('[speech-music-detect] Detection failed:', err);
    return { hasSpeech: false, hasMusic: false, speechPercent: 0 };
  }
}
