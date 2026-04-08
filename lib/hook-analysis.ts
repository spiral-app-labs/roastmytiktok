import type { FrameAnalysis } from '@/lib/frame-analysis';
import type { AudioCharacteristics } from '@/lib/speech-music-detect';
import type { HookAnalysis } from '@/lib/types';
import type { TranscriptionResult } from '@/lib/whisper-transcribe';

function clampScore(score: unknown): number {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 5;
  return Math.max(1, Math.min(10, Math.round(numeric)));
}

function cleanSentence(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.endsWith('.') || normalized.endsWith('!') || normalized.endsWith('?')
    ? normalized
    : `${normalized}.`;
}

function isSpecificFix(value: string): boolean {
  if (value.length < 24) return false;
  return /\b(first second|frame 1|frame one|0:\d{2}|seconds?|close-up|move|cut|replace|swap|open with|text|overlay|camera|lighting|music|spoken|line)\b/i.test(value);
}

function normalizeFixes(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const cleaned = raw
    .map((item) => cleanSentence(item, ''))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);

  const specific = cleaned.filter(isSpecificFix).slice(0, 2);
  if (specific.length > 0) return specific;

  return [
    'Replace the first spoken line with a direct claim or curiosity gap that lands in the first second, instead of easing into the topic.',
    'Make frame one do visible work by tightening the shot and putting one short high-contrast text overlay on screen immediately.',
  ];
}

export function parseHookAnalysisResponse(text: string): HookAnalysis {
  let jsonText = text.trim();
  const codeMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeMatch) {
    jsonText = codeMatch[1].trim();
  }

  const firstBrace = jsonText.indexOf('{');
  const lastBrace = jsonText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  const visual = (parsed.visual ?? {}) as Record<string, unknown>;
  const audio = (parsed.audio ?? {}) as Record<string, unknown>;
  const narrative = (parsed.narrative ?? {}) as Record<string, unknown>;

  return {
    visual: {
      score: clampScore(visual.score),
      justification: cleanSentence(
        visual.justification,
        'The opening frame does not yet present a strong visual reason to stop scrolling.'
      ),
    },
    audio: {
      score: clampScore(audio.score),
      justification: cleanSentence(
        audio.justification,
        'The opening audio does not create an immediate enough attention spike to carry the first beat.'
      ),
    },
    narrative: {
      score: clampScore(narrative.score),
      justification: cleanSentence(
        narrative.justification,
        'The first 3-5 seconds are not yet making the promise or stakes clear enough for a cold viewer.'
      ),
    },
    overallScore: clampScore(parsed.overallScore),
    summary: cleanSentence(
      parsed.summary,
      'The hook needs a clearer first-second promise and a stronger visual reason to stay.'
    ),
    topFixes: normalizeFixes(parsed.topFixes),
  };
}

function summarizeOpeningFrames(openingFrames: FrameAnalysis[]): string {
  if (openingFrames.length === 0) return 'No opening frame analysis available.';

  return openingFrames.slice(0, 5).map((frame, index) => {
    const text = frame.textOnScreen.length > 0 ? `"${frame.textOnScreen.join('" | "')}"` : 'none';
    const lightingIssues = frame.lightingIssues.length > 0 ? frame.lightingIssues.join(', ') : 'none';
    const distractions = frame.distractingElements.length > 0 ? frame.distractingElements.join(', ') : 'none';
    return [
      `Frame ${index + 1} at ${frame.timestampSec.toFixed(1)}s`,
      `scene=${frame.sceneDescription}`,
      `people=${frame.peopleCount}`,
      `expressions=${frame.facialExpressions.join(', ') || 'none'}`,
      `framing=${frame.framing}`,
      `face_fill=${frame.faceFillPercent}%`,
      `text=${text}`,
      `lighting=${frame.lightingQuality} (${lightingIssues})`,
      `camera=${frame.cameraWork}`,
      `composition=${frame.compositionQuality} (${frame.compositionNotes})`,
      `motion=${frame.motionType}`,
      `setting=${frame.setting}`,
      `background=${frame.backgroundDescription}`,
      `distractions=${distractions}`,
      `energy=${frame.visualEnergy}`,
    ].join(' | ');
  }).join('\n');
}

function summarizeTranscript(transcript: TranscriptionResult | null, shouldUseTranscriptEvidence: boolean): string {
  if (!transcript?.segments?.length || !shouldUseTranscriptEvidence) {
    return 'No reliable spoken transcript in the first 5 seconds.';
  }

  const openingSegments = transcript.segments.filter((segment) => segment.start <= 5).slice(0, 6);
  if (openingSegments.length === 0) {
    return 'No reliable spoken transcript in the first 5 seconds.';
  }

  return openingSegments
    .map((segment) => `${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s: "${segment.text.trim()}"`)
    .join('\n');
}

export function buildHookAnalysisPrompt(input: {
  platform: 'tiktok' | 'reels';
  openingFrames: FrameAnalysis[];
  hookZoneSummary: string;
  transcript: TranscriptionResult | null;
  shouldUseTranscriptEvidence: boolean;
  audioChars: AudioCharacteristics;
  transcriptQualityNote: string;
  detectedSoundNote?: string;
}): string {
  const {
    platform,
    openingFrames,
    hookZoneSummary,
    transcript,
    shouldUseTranscriptEvidence,
    audioChars,
    transcriptQualityNote,
    detectedSoundNote,
  } = input;

  const openingFrameSummary = summarizeOpeningFrames(openingFrames);
  const transcriptSummary = summarizeTranscript(transcript, shouldUseTranscriptEvidence);
  const firstWords = shouldUseTranscriptEvidence
    ? transcript?.segments?.filter((segment) => segment.start <= 2).map((segment) => segment.text.trim()).join(' ').trim()
    : '';

  return `You are a hook-analysis specialist for ${platform === 'reels' ? 'Instagram Reels' : 'TikTok'}.

Your entire job is to analyze ONLY the first 3-5 seconds of the video. Ignore the rest.

Score these three dimensions from 1-10, where 1 = hook is failing badly and 10 = excellent:

1. visual
Evaluate all of these:
- Is there an attractive or interesting person on screen in the first second?
- Is there compelling or curiosity-invoking text on screen?
- Is the shot visually interesting, through framing, motion, or setting?
- Is the lighting good enough to avoid distraction?
- Is there anything that demands a second look?

2. audio
Evaluate all of these when signal exists:
- Does the first spoken word or sound immediately grab attention?
- Does music set a mood immediately?
- Is there a surprising or provocative opening statement?
If audio is limited, still give a 1-10 score based on the absence of an opening audio hook and say that clearly.

3. narrative
Evaluate all of these:
- Is it clear what is happening?
- Does it create curiosity through an open loop or unanswered question?
- Does it create emotion, such as shock, humor, relatability, or desire?
- Is there a reason to stay past second 3?
- Does it feel native to TikTok/Reels instead of stiff or over-produced?

For each dimension, provide exactly one sentence of justification.
Then provide:
- overallScore: 1-10
- summary: exactly one sentence summarizing the hook quality
- topFixes: 1-2 fixes only, each specific and actionable. Never say vague things like "improve lighting" or "make it more engaging".

Use only the evidence below. Do not invent unseen details.

OPENING FRAME SUMMARY:
${openingFrameSummary}

HOOK ZONE SUMMARY:
${hookZoneSummary || 'Unavailable.'}

OPENING AUDIO / TRANSCRIPT:
${transcriptSummary}

AUDIO SIGNALS:
- speech_detected=${audioChars.hasSpeech}
- music_detected=${audioChars.hasMusic}
- speech_percent=${audioChars.speechPercent}
- pacing_hint=${audioChars.pacingHint ?? 'unknown'}
- mean_volume_db=${audioChars.meanVolumeDB?.toFixed(1) ?? 'unknown'}
- max_volume_db=${audioChars.maxVolumeDB?.toFixed(1) ?? 'unknown'}
- silence_gap_count=${audioChars.silenceGapCount ?? 'unknown'}
- transcript_quality_note=${transcriptQualityNote}
${detectedSoundNote ? `- detected_sound=${detectedSoundNote}` : ''}
${firstWords ? `- first_spoken_words="${firstWords}"` : '- first_spoken_words=none reliably available'}

Return ONLY valid JSON with this exact shape:
{
  "visual": { "score": 1, "justification": "one sentence" },
  "audio": { "score": 1, "justification": "one sentence" },
  "narrative": { "score": 1, "justification": "one sentence" },
  "overallScore": 1,
  "summary": "one sentence",
  "topFixes": ["specific fix 1", "specific fix 2"]
}`;
}
