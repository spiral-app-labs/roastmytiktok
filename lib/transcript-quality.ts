import type { AudioCharacteristics } from './speech-music-detect';
import type { TranscriptionResult } from './whisper-transcribe';

export type TranscriptQuality = 'usable' | 'degraded' | 'unavailable';

export interface TranscriptAssessment {
  transcript: TranscriptionResult | null;
  quality: TranscriptQuality;
  note: string;
  shouldUseTranscriptEvidence: boolean;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function capConfidence(transcript: TranscriptionResult, maxConfidence: number): TranscriptionResult {
  return {
    ...transcript,
    confidence: Math.min(transcript.confidence, maxConfidence),
  };
}

export function assessTranscriptQuality(
  transcript: TranscriptionResult | null,
  audio: AudioCharacteristics
): TranscriptAssessment {
  const hasTranscriptText = !!transcript?.text?.trim();
  const hasSegments = (transcript?.segments?.length ?? 0) > 0;

  if (!transcript || (!hasTranscriptText && !hasSegments)) {
    return {
      transcript: null,
      quality: 'unavailable',
      note: audio.hasSpeech
        ? 'Speech may be present, but transcription was unavailable. Falling back to waveform-only audio analysis.'
        : 'No reliable speech transcript available. Falling back to waveform-only audio analysis.',
      shouldUseTranscriptEvidence: false,
    };
  }

  const words = wordCount(transcript.text);
  const speechPercent = audio.speechPercent ?? 0;
  const musicHeavySpeechLight = audio.hasMusic && (!audio.hasSpeech || speechPercent < 35);
  const speechDetectionMismatch = !audio.hasSpeech && hasTranscriptText;
  const veryShortTranscript = words > 0 && words < 4;
  const lowConfidence = transcript.confidence < 0.45;

  if (speechDetectionMismatch) {
    return {
      transcript: capConfidence(transcript, 0.2),
      quality: 'degraded',
      note: 'Transcript disagrees with the audio signal, so quoted speech is being withheld from the diagnosis.',
      shouldUseTranscriptEvidence: false,
    };
  }

  if (musicHeavySpeechLight) {
    return {
      transcript: capConfidence(transcript, 0.35),
      quality: 'degraded',
      note: 'Audio appears music-heavy or speech-light, so the transcript is treated as partial and withheld from non-audio diagnosis.',
      shouldUseTranscriptEvidence: false,
    };
  }

  if (veryShortTranscript || lowConfidence) {
    return {
      transcript: capConfidence(transcript, 0.4),
      quality: 'degraded',
      note: 'Transcript looks partial or too thin to quote confidently, so the product falls back to visual and waveform evidence.',
      shouldUseTranscriptEvidence: false,
    };
  }

  return {
    transcript,
    quality: 'usable',
    note: 'Transcript quality is strong enough to use as quoted evidence.',
    shouldUseTranscriptEvidence: true,
  };
}
