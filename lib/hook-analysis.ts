import type { FrameAnalysis } from '@/lib/frame-analysis';
import type { AudioCharacteristics } from '@/lib/speech-music-detect';
import type {
  HookAnalysis,
  HookAudioSummary,
  HookEditFix,
  HookLegibility,
  HookMechanismLabel,
  HookOCRRole,
  HookOCRSegment,
  HookPredictionSummary,
  HookPrimaryFail,
  HookReplacement,
  HookReshootPlan,
  HookRiskLevel,
  HookSpeechSegment,
} from '@/lib/types';
import type { TranscriptionResult } from '@/lib/whisper-transcribe';

const HOOK_WINDOW_SEC = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function cleanSentence(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function normalizePhrase(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s$%'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function inferOCRRole(text: string): HookOCRRole {
  const normalized = text.toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized.includes('?')) return 'question';
  if (/\b(stop|don['’]?t|quit|wrong|mistake|killing|ruining|avoid)\b/.test(normalized)) return 'problem';
  if (/\b(how|fix|get|gain|grow|make|save|double|3x|results?|changed|one change)\b/.test(normalized)) return 'payoff_preview';
  if (/\b(if you|for creators|for moms|for founders|if your)\b/.test(normalized)) return 'promise';
  if (/\b(follow|save|comment|share|dm|link)\b/.test(normalized)) return 'cta';
  if (/\b(today|watch|here|basically|so)\b/.test(normalized)) return 'context';
  if (normalized.split(' ').length <= 4) return 'label';
  return 'unknown';
}

function inferLegibility(frame: FrameAnalysis): HookLegibility {
  if (!frame.textOnScreen.length) return 'poor';
  if (frame.textReadable && frame.textContrast === 'high') return 'good';
  if (frame.textReadable || frame.textContrast === 'medium') return 'ok';
  return 'poor';
}

function inferSafe(frame: FrameAnalysis): boolean {
  if (!frame.textOnScreen.length) return true;
  if (frame.textPosition == null) return true;
  return !/bottom|lower/i.test(frame.textPosition);
}

function inferTextRisk(segments: HookOCRSegment[]): HookRiskLevel {
  if (segments.length === 0) return 'high';
  const goodCount = segments.filter((segment) => segment.legibility === 'good').length;
  if (goodCount === segments.length) return 'low';
  if (goodCount > 0) return 'med';
  return 'high';
}

function inferSafeRisk(segments: HookOCRSegment[]): HookRiskLevel {
  if (segments.length === 0) return 'low';
  const unsafeCount = segments.filter((segment) => !segment.safe).length;
  if (unsafeCount === 0) return 'low';
  if (unsafeCount < segments.length) return 'med';
  return 'high';
}

function inferLighting(frames: FrameAnalysis[]): HookAnalysis['visual']['lighting'] {
  if (frames.some((frame) => /backlit/i.test(frame.lightingDirection) || frame.lightingIssues.some((issue) => /backlit/i.test(issue)))) {
    return 'backlit';
  }
  const poorCount = frames.filter((frame) => frame.lightingQuality === 'poor').length;
  if (poorCount >= Math.ceil(frames.length / 2)) return 'under';
  const fairCount = frames.filter((frame) => frame.lightingQuality === 'fair').length;
  if (fairCount >= Math.ceil(frames.length / 2)) return 'mixed';
  return 'good';
}

function inferFaceLuma(frames: FrameAnalysis[]): number | null {
  const lighting = frames.map((frame) => frame.lightingQuality);
  if (!lighting.length) return null;
  const avg = lighting.reduce((sum, quality) => {
    if (quality === 'excellent') return sum + 0.72;
    if (quality === 'good') return sum + 0.55;
    if (quality === 'fair') return sum + 0.34;
    return sum + 0.2;
  }, 0) / lighting.length;
  return round(avg);
}

function inferSpecificityScore(frame: FrameAnalysis | undefined): number {
  if (!frame) return 0;
  let score = 0;
  if (frame.textOnScreen.length > 0) score += 3;
  if (frame.peopleCount > 0) score += 2;
  if (frame.framing.toLowerCase().includes('close')) score += 1;
  if (frame.sceneDescription.split(' ').length >= 6) score += 2;
  return clamp(score, 0, 7);
}

function inferPromiseVisible(segments: HookOCRSegment[], frames: FrameAnalysis[]): number {
  const strongText = segments.some((segment) => ['promise', 'problem', 'payoff_preview', 'question'].includes(segment.role));
  if (strongText) return 8;
  const firstFrame = frames[0];
  if (!firstFrame) return 0;
  const demonstrative = /show|holding|before|after|finished|result|proof|dashboard|receipt|tracker|close-up/i.test(firstFrame.sceneDescription);
  return demonstrative ? 6 : 2;
}

function inferHookMechanisms(
  segments: HookOCRSegment[],
  speechSegments: HookSpeechSegment[],
  frames: FrameAnalysis[],
): HookMechanismLabel[] {
  const combinedText = [
    ...segments.map((segment) => segment.text),
    ...speechSegments.map((segment) => segment.text),
  ].join(' ').toLowerCase();
  const mechanisms: HookMechanismLabel[] = [];

  if (segments.some((segment) => segment.role === 'question') || combinedText.includes('?')) mechanisms.push('question');
  if (segments.some((segment) => segment.role === 'payoff_preview') || /\bhow i|7 days|one change|results?|save|made \$|\d+x\b/.test(combinedText)) {
    mechanisms.push('payoff_preview');
  }
  if (/\bwhy|nobody tells you|one thing|this is why|here's why|stopped doing\b/.test(combinedText)) {
    mechanisms.push('curiosity_gap');
  }
  if (/\bif your|if you|you are|you're|stop\b/.test(combinedText)) mechanisms.push('problem_callout');
  if (/\bwrong|hate|unpopular|nobody|never|always|almost never\b/.test(combinedText)) mechanisms.push('surprising_claim');
  if (/\bmade \$|\d+ views|\d+k|\d+ clients|receipts?|results?\b/.test(combinedText)) mechanisms.push('social_proof');
  if (frames.some((frame, index) => index > 0 && frame.sceneChanged)) mechanisms.push('pattern_interrupt');
  if (mechanisms.length === 0) mechanisms.push('statement_of_intent');

  return mechanisms.slice(0, 3);
}

function inferPrimaryFail(
  clarity: number,
  text: number,
  pacing: number,
  human: number,
  lighting: number,
  audio: HookAudioSummary,
): HookPrimaryFail {
  if (audio.dependencyRisk === 'high') return 'audio_dependency';
  const ranked = [
    { key: 'clarity_gap', value: clarity },
    { key: 'text_overload', value: text },
    { key: 'visual_monotony', value: pacing },
    { key: 'trust_friction', value: human },
    { key: 'brand_penalty', value: lighting },
  ] as const;
  const lowest = ranked.toSorted((a, b) => a.value - b.value)[0];
  if (lowest.value >= 15) return 'none';
  return lowest.key;
}

function buildOCRSegments(frames: FrameAnalysis[]): HookOCRSegment[] {
  const segments: HookOCRSegment[] = [];

  for (const frame of frames) {
    const text = frame.textOnScreen.join(' ').trim();
    if (!text) continue;
    const legibility = inferLegibility(frame);
    const safe = inferSafe(frame);
    const existing = segments[segments.length - 1];

    if (existing && existing.text.toLowerCase() === text.toLowerCase() && Math.abs(existing.t1 - frame.timestampSec) <= 0.45) {
      existing.t1 = round(Math.max(existing.t1, frame.timestampSec + 0.2), 1);
      if (legibility === 'good') existing.legibility = 'good';
      if (!safe) existing.safe = false;
      continue;
    }

    segments.push({
      t0: round(frame.timestampSec, 1),
      t1: round(Math.min(HOOK_WINDOW_SEC, frame.timestampSec + 0.4), 1),
      text,
      role: inferOCRRole(text),
      legibility,
      safe,
    });
  }

  return segments;
}

function buildSpeechSegments(
  transcript: TranscriptionResult | null,
  shouldUseTranscriptEvidence: boolean,
): HookSpeechSegment[] {
  if (!shouldUseTranscriptEvidence || !transcript?.segments?.length) return [];
  return transcript.segments
    .filter((segment) => segment.start < HOOK_WINDOW_SEC)
    .map((segment) => ({
      t0: round(segment.start, 1),
      t1: round(Math.min(HOOK_WINDOW_SEC, segment.end), 1),
      text: segment.text.trim(),
      confidence: round(transcript.confidence ?? 0.7, 2),
    }))
    .filter((segment) => segment.text.length > 0);
}

function propositionTimeFromText(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\?|if you|if your|stop|fix|how|why|one thing|wrong|save|made \$|\d+x|result|proof|nobody/i.test(normalized);
}

function buildEditFixes(
  analysis: HookAnalysis,
  firstSpokenLine: string,
): HookEditFix[] {
  const fixes: HookEditFix[] = [];

  if (analysis.timing.propositionTimeSec == null || analysis.timing.propositionTimeSec > 3) {
    fixes.push({
      impact: 'high',
      do: `At 0:00 move the clearest promise into the opener instead of waiting until ${analysis.timing.propositionTimeSec?.toFixed(1) ?? 'later'}s.`,
      why: 'Earlier proposition timing lifts clarity before the first swipe decision.',
    });
  }

  if (analysis.ocr.legibilityRisk !== 'low') {
    fixes.push({
      impact: 'med',
      do: 'Add one bold upper-third text overlay in frame one and keep it readable on mute.',
      why: 'Readable text lowers audio dependence and makes the hook land faster.',
    });
  }

  if (analysis.visual.pace === 'low') {
    fixes.push({
      impact: 'high',
      do: 'Create a clear change event before 0.8s with a cut, zoom, prop reveal, or tighter crop.',
      why: 'An earlier pattern interrupt gives the opener more stop power.',
    });
  }

  if (analysis.visual.lighting !== 'good') {
    fixes.push({
      impact: 'med',
      do: 'Brighten the opening shot and make the face or proof visual easier to read immediately.',
      why: 'Better legibility reduces trust friction at scroll speed.',
    });
  }

  if (fixes.length === 0) {
    fixes.push({
      impact: 'med',
      do: `Trim any setup before the strongest line${firstSpokenLine ? `, especially "${firstSpokenLine}"` : ''}.`,
      why: 'A tighter first beat keeps the opener from feeling buffered.',
    });
  }

  return fixes.slice(0, 4);
}

function buildReshootPlan(
  analysis: HookAnalysis,
  firstSpokenLine: string,
  openerText: string,
): HookReshootPlan {
  const defaultHook = analysis.replacementHooks[0]?.hook || openerText || 'Lead with the strongest claim immediately.';
  return {
    firstShot: analysis.visual.facePresent
      ? 'Tight close-up in frame one with direct eye contact, motion toward camera, and the payoff or problem visible immediately.'
      : 'Open on the clearest proof visual or result shot at 0.0s, not the setup.',
    first5sScript: firstSpokenLine
      ? `Replace "${firstSpokenLine}" with "${defaultHook}".`
      : `Start speaking immediately with "${defaultHook}".`,
    shotBeats: [
      '0.0-0.8s: deliver the promise while the proof visual or strongest frame is already on screen.',
      '0.8-3.0s: make the viewer feel the problem, proof, or surprise before adding context.',
      '3.0-5.0s: preview the next payoff beat so the hold survives past the hook window.',
    ],
    lighting: analysis.visual.lighting === 'good'
      ? 'Keep the current exposure, but preserve contrast on the face or proof object.'
      : 'Face a window or key light and avoid backlit or muddy opening frames.',
  };
}

function buildReplacementHooks(
  mechanisms: HookMechanismLabel[],
  firstSpokenLine: string,
  topicSeed: string,
): HookReplacement[] {
  const safeTopic = topicSeed || 'this topic';
  const templates: Record<HookMechanismLabel, HookReplacement> = {
    question: {
      hook: `Why does ${safeTopic} keep failing here?`,
      shot: 'Open on the exact problem visual in a tight frame.',
      overlay: 'WHY THIS FAILS @ 0.0-1.0s',
    },
    payoff_preview: {
      hook: `This is the fix that changes ${safeTopic}.`,
      shot: 'Show the result first, then cut tighter as the line lands.',
      overlay: 'THE FIX FIRST @ 0.0-1.2s',
    },
    curiosity_gap: {
      hook: `The reason ${safeTopic} stalls is usually this.`,
      shot: 'Start with direct eye contact or proof, not setup.',
      overlay: 'IT USUALLY IS THIS @ 0.0-1.1s',
    },
    problem_callout: {
      hook: `If you're doing ${safeTopic} like this, stop.`,
      shot: 'Lead with the mistake or awkward result in frame one.',
      overlay: 'STOP DOING THIS @ 0.0-1.0s',
    },
    surprising_claim: {
      hook: `${safeTopic} is probably dying for this reason.`,
      shot: 'Use a stronger facial reaction or proof visual immediately.',
      overlay: 'THIS KILLS IT @ 0.0-1.0s',
    },
    social_proof: {
      hook: `This is what changed my ${safeTopic} results.`,
      shot: 'Open on the proof or before/after instead of the intro shot.',
      overlay: 'REAL RESULTS @ 0.0-1.0s',
    },
    pattern_interrupt: {
      hook: `Watch this before you post ${safeTopic}.`,
      shot: 'Create a cut or prop reveal before 0.8s.',
      overlay: 'DON\'T POST YET @ 0.0-0.8s',
    },
    statement_of_intent: {
      hook: firstSpokenLine
        ? `Replace "${firstSpokenLine}" with the actual payoff.`
        : `Say the strongest part of ${safeTopic} first.`,
      shot: 'Skip the setup shot and open on a tighter, more specific frame.',
      overlay: 'LEAD WITH THE PAYOFF @ 0.0-1.0s',
    },
  };

  const seen = new Set<string>();
  return mechanisms
    .map((mechanism) => templates[mechanism])
    .concat(templates.problem_callout, templates.payoff_preview, templates.curiosity_gap)
    .filter((replacement) => {
      if (seen.has(replacement.hook)) return false;
      seen.add(replacement.hook);
      return true;
    })
    .slice(0, 4);
}

export function deriveHookAnalysis(input: {
  openingFrames: FrameAnalysis[];
  transcript: TranscriptionResult | null;
  shouldUseTranscriptEvidence: boolean;
  audioChars: AudioCharacteristics;
}): HookAnalysis {
  const openingFrames = input.openingFrames
    .filter((frame) => frame.timestampSec <= HOOK_WINDOW_SEC)
    .toSorted((a, b) => a.timestampSec - b.timestampSec);
  const observedOCR = buildOCRSegments(openingFrames);
  const observedSpeech = buildSpeechSegments(input.transcript, input.shouldUseTranscriptEvidence);
  const firstFrame = openingFrames[0];
  const firstOCR = observedOCR[0];
  const firstSpokenLine = observedSpeech[0]?.text ?? '';

  const propositionCandidates = [
    ...observedOCR
      .filter((segment) => propositionTimeFromText(segment.text))
      .map((segment) => segment.t0),
    ...observedSpeech
      .filter((segment) => propositionTimeFromText(segment.text))
      .map((segment) => segment.t0),
  ].toSorted((a, b) => a - b);
  const propositionTimeSec = propositionCandidates[0] ?? null;

  const textChangeTimes = observedOCR.map((segment) => segment.t0);
  const motionChangeTimes = openingFrames
    .filter((frame) =>
      frame.sceneChanged ||
      frame.visualEnergy === 'high' ||
      /zoom|pan|tracking|subject movement|scene cut/i.test(frame.motionType)
    )
    .map((frame) => frame.timestampSec);
  const firstChangeTimeSec = [...textChangeTimes, ...motionChangeTimes].toSorted((a, b) => a - b)[0] ?? null;
  const firstCutTimeSec = openingFrames.find((frame) => frame.sceneChanged)?.timestampSec ?? null;

  const wpsPeak = observedOCR.reduce((max, segment) => {
    const duration = Math.max(0.2, segment.t1 - segment.t0);
    const wps = words(segment.text).length / duration;
    return Math.max(max, wps);
  }, 0);

  const cuts = openingFrames.filter((frame) => frame.sceneChanged).length;
  const motion = clamp01(openingFrames.reduce((sum, frame) => {
    let weight = 0;
    if (frame.visualEnergy === 'high') weight += 0.45;
    else if (frame.visualEnergy === 'medium') weight += 0.28;
    if (/zoom|pan|tracking|shake|movement|cut/i.test(frame.motionType)) weight += 0.35;
    if (/handheld|tracking|zoom/i.test(frame.cameraWork)) weight += 0.2;
    return sum + Math.min(1, weight);
  }, 0) / Math.max(1, openingFrames.length));

  const faceFrames = openingFrames.filter((frame) => frame.peopleCount > 0);
  const faceArea = faceFrames.length
    ? round(faceFrames.reduce((sum, frame) => sum + frame.faceFillPercent / 100, 0) / faceFrames.length, 2)
    : 0;
  const eyeRatio = faceFrames.length
    ? faceFrames.filter((frame) => frame.eyeContact).length / faceFrames.length
    : 0;
  const eyeContact = eyeRatio >= 0.6 ? 'direct' : eyeRatio > 0 ? 'partial' : 'none';
  const expression = faceFrames[0]?.facialExpressions?.[0] ?? 'neutral';

  const audio: HookAudioSummary = {
    transcriptPresent: observedSpeech.length > 0,
    transcriptStartSec: observedSpeech[0]?.t0 ?? null,
    transcriptConfidence: round(input.transcript?.confidence ?? 0, 2),
    dependencyRisk: observedOCR.length === 0 && observedSpeech.length > 0
      ? 'high'
      : observedOCR.length > 0 && observedSpeech.length > 0
        ? 'med'
        : 'low',
    upliftReason: observedSpeech.length > 0
      ? 'Speech can help the opener, but only if the promise arrives early and the hook still reads on mute.'
      : 'This hook needs to work silently because there is no reliable opening transcript signal.',
  };

  const clarity =
    (propositionTimeSec == null ? 0 : propositionTimeSec <= 1.5 ? 10 : propositionTimeSec <= 3 ? 6 : propositionTimeSec <= 5 ? 2 : 0) +
    inferPromiseVisible(observedOCR, openingFrames) +
    inferSpecificityScore(firstFrame);
  const text =
    (inferTextRisk(observedOCR) === 'low' ? 8 : inferTextRisk(observedOCR) === 'med' ? 5 : 1) +
    (wpsPeak === 0 ? 0 : wpsPeak <= 10 ? 6 : wpsPeak <= 12 ? 3 : 1) +
    (observedOCR.some((segment) => ['promise', 'problem', 'payoff_preview', 'question'].includes(segment.role)) ? 6 : observedOCR.length > 0 ? 3 : 0);
  const pacing =
    (firstChangeTimeSec == null ? 0 : firstChangeTimeSec <= 0.8 ? 8 : firstChangeTimeSec <= 1.2 ? 6 : firstChangeTimeSec <= 2 ? 3 : 1) +
    (motion >= 0.65 ? 6 : motion >= 0.35 ? 4 : 1) +
    (cuts >= 2 || motion >= 0.55 ? 6 : cuts === 1 ? 3 : 1);
  const human =
    (faceFrames.some((frame) => frame.timestampSec <= 0.5) ? 10 : faceFrames.length > 0 ? 4 : 0) +
    (faceArea >= 0.06 ? 6 : faceArea >= 0.04 ? 3 : 0) +
    (expression !== 'neutral' ? 4 : eyeContact === 'direct' ? 3 : 1);
  const lighting =
    (inferLighting(openingFrames) === 'good' ? 8 : inferLighting(openingFrames) === 'mixed' ? 5 : inferLighting(openingFrames) === 'backlit' ? 2 : 3) +
    (inferTextRisk(observedOCR) === 'low' ? 7 : inferTextRisk(observedOCR) === 'med' ? 4 : 2);

  let audioUplift = 0;
  if (audio.transcriptPresent && audio.transcriptConfidence >= 0.8 && (audio.transcriptStartSec ?? 99) <= 1.5) audioUplift += 6;
  else if (audio.transcriptPresent && (audio.transcriptStartSec ?? 99) <= 3) audioUplift += 3;
  if (firstSpokenLine && words(firstSpokenLine).length <= 8) audioUplift += 2;
  if (audio.dependencyRisk === 'high') audioUplift -= 8;
  else if (audio.dependencyRisk === 'med') audioUplift -= 4;
  if (audio.transcriptPresent && audio.transcriptConfidence < 0.6) audioUplift -= 2;

  const silentScore = clamp(clarity + text + pacing + human + lighting, 0, 100);
  const hookScore = clamp(silentScore + audioUplift, 0, 100);
  const confidence = round(
    clamp01(
      0.45 +
      (openingFrames.length >= 12 ? 0.15 : 0.08) +
      (observedSpeech.length > 0 ? 0.12 : 0) +
      (observedOCR.length > 0 ? 0.12 : 0) +
      (firstFrame ? 0.08 : 0)
    ),
    2,
  );

  const mechanisms = inferHookMechanisms(observedOCR, observedSpeech, openingFrames);
  const primaryFail = inferPrimaryFail(clarity, text, pacing, human, lighting, audio);

  const predictions: HookPredictionSummary = {
    pStay3s: round(sigmoid((hookScore - 55) / 10), 2),
    pStay5s: round(sigmoid((hookScore - 68) / 10), 2),
    viralProbability: round(clamp01(sigmoid((hookScore - 74) / 9) * (0.65 + sigmoid((hookScore - 60) / 12) * 0.35)), 2),
    confidence,
  };

  const topicSeed = normalizePhrase(firstOCR?.text || firstSpokenLine || firstFrame?.sceneDescription || 'this video', 'this video');
  const replacementHooks = buildReplacementHooks(mechanisms, firstSpokenLine, topicSeed);

  const base: HookAnalysis = {
    windowSec: HOOK_WINDOW_SEC,
    summary: cleanSentence(
      hookScore < 40
        ? 'The hook is losing people before the value is clear.'
        : hookScore < 70
          ? 'The hook has signal, but it still feels too slow or too soft to fully earn the hold.'
          : 'The hook is doing enough early work that the rest of the video has room to matter.',
      'The hook needs a clearer early promise.',
    ),
    observed: {
      visual: cleanSentence(firstFrame?.sceneDescription ?? 'No opening frame evidence was available.', 'No opening frame evidence was available.'),
      ocr: observedOCR,
      speech: observedSpeech,
    },
    timing: {
      propositionTimeSec,
      firstChangeTimeSec,
      firstCutTimeSec,
    },
    ocr: {
      segments: observedOCR,
      wpsPeak: round(wpsPeak, 1),
      legibilityRisk: inferTextRisk(observedOCR),
      safeZoneRisk: inferSafeRisk(observedOCR),
    },
    visual: {
      cuts,
      motion: round(motion, 2),
      pace: motion >= 0.65 || cuts >= 2 ? 'high' : motion >= 0.35 || cuts === 1 ? 'med' : 'low',
      facePresent: faceFrames.length > 0,
      faceStartSec: faceFrames[0]?.timestampSec ?? null,
      faceArea,
      eyeContact,
      expression,
      lighting: inferLighting(openingFrames),
      faceLuma: inferFaceLuma(openingFrames),
    },
    audio,
    labels: {
      mechanisms,
      primaryFail,
    },
    scores: {
      subscores: {
        clarity,
        text,
        pacing,
        human,
        lighting,
      },
      silentScore,
      audioUplift,
      hookScore,
      confidence,
    },
    predictions,
    editFixes: [],
    reshootPlan: {
      firstShot: 'Open on the strongest visual proof immediately.',
      first5sScript: 'Lead with the clearest claim in the first line.',
      shotBeats: [],
      lighting: 'Keep the subject readable at phone-scroll speed.',
    },
    replacementHooks,
    dimensions: {
      visual: {
        score: clamp(Math.round((pacing + lighting) / 3.5), 1, 10),
        justification: cleanSentence(
          firstFrame
            ? `${firstFrame.sceneDescription} ${motion < 0.35 ? 'The opener still needs an earlier visual change event.' : 'The opener has some visual motion or proof early enough to help.'}`
            : 'The opening visual evidence is limited.',
          'The opening visual needs more immediate stop power.',
        ),
      },
      audio: {
        score: clamp(Math.round((10 + audioUplift) / 2), 1, 10),
        justification: cleanSentence(audio.upliftReason, 'The opening audio is not doing enough work yet.'),
      },
      narrative: {
        score: clamp(Math.round(clarity / 2.5), 1, 10),
        justification: cleanSentence(
          propositionTimeSec != null && propositionTimeSec <= 3
            ? `The proposition lands by ${propositionTimeSec.toFixed(1)}s, so the opening has at least some narrative clarity.`
            : 'The opening waits too long to make the promise or stakes clear.',
          'The opening needs a clearer first-beat promise.',
        ),
      },
    },
    overallScore: clamp(Math.round(hookScore / 10), 1, 10),
    topFixes: [],
  };

  base.editFixes = buildEditFixes(base, firstSpokenLine);
  base.reshootPlan = buildReshootPlan(base, firstSpokenLine, replacementHooks[0]?.hook ?? '');
  base.topFixes = base.editFixes.map((fix) => fix.do).slice(0, 3);

  return base;
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
  const baseline = deriveHookAnalysis(input);

  return `TASK: HOOK_AUDIT_JSON_V2

Analyze ONLY t=0.0-${HOOK_WINDOW_SEC.toFixed(1)}s. Use silent-first reasoning, then apply audio-transcript uplift.
Never guess song identity. If music exists, describe it only qualitatively.

You are improving a hook-first TikTok/Reels diagnosis. Use the observed evidence and computed features below.
Your job is to keep the numeric fields grounded, then sharpen the summary, labels, fixes, and replacement hooks.

INPUT CONTEXT:
- platform: ${input.platform}
- hook_zone_summary: ${input.hookZoneSummary || 'Unavailable.'}
- transcript_quality_note: ${input.transcriptQualityNote}
${input.detectedSoundNote ? `- detected_sound_note: ${input.detectedSoundNote}` : ''}

BASELINE JSON:
${JSON.stringify(baseline, null, 2)}

RULES:
1. Stay inside the first ${HOOK_WINDOW_SEC.toFixed(0)} seconds only.
2. Preserve the overall schema and existing numeric ranges.
3. Keep timestamp evidence tied to actual observed text/speech when possible.
4. Prefer creator-usable fixes over abstract commentary.
5. Output valid JSON only. No markdown.

REQUIRED OUTPUT SHAPE:
{
  "summary": "one tight sentence",
  "observed": {
    "visual": "1-2 literal sentences"
  },
  "labels": {
    "mechanisms": ["question|payoff_preview|curiosity_gap|problem_callout|surprising_claim|social_proof|pattern_interrupt|statement_of_intent"],
    "primaryFail": "clarity_gap|payoff_delay|visual_monotony|text_overload|trust_friction|brand_penalty|audio_dependency|none"
  },
  "editFixes": [
    { "impact": "high|med|low", "do": "timestamped action", "why": "one sentence" }
  ],
  "reshootPlan": {
    "firstShot": "exact framing + action",
    "first5sScript": "spoken and/or on-screen text plan",
    "shotBeats": ["0.0-0.8s ...", "0.8-3.0s ...", "3.0-5.0s ..."],
    "lighting": "1 sentence"
  },
  "replacementHooks": [
    { "hook": "<=12 words preferred", "shot": "first frame direction", "overlay": "<=10 words @ t0-t1" }
  ],
  "dimensions": {
    "visual": { "score": 1, "justification": "one sentence" },
    "audio": { "score": 1, "justification": "one sentence" },
    "narrative": { "score": 1, "justification": "one sentence" }
  }
}`;
}

export function parseHookAnalysisResponse(text: string, fallback: HookAnalysis): HookAnalysis {
  let jsonText = text.trim();
  const codeMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeMatch) jsonText = codeMatch[1].trim();
  const firstBrace = jsonText.indexOf('{');
  const lastBrace = jsonText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const labels = (parsed.labels && typeof parsed.labels === 'object') ? parsed.labels as Record<string, unknown> : {};
    const observed = (parsed.observed && typeof parsed.observed === 'object') ? parsed.observed as Record<string, unknown> : {};
    const dimensions = (parsed.dimensions && typeof parsed.dimensions === 'object') ? parsed.dimensions as Record<string, unknown> : {};
    const reshootPlan = (parsed.reshootPlan && typeof parsed.reshootPlan === 'object') ? parsed.reshootPlan as Record<string, unknown> : {};

    const next: HookAnalysis = {
      ...fallback,
      summary: cleanSentence(parsed.summary, fallback.summary),
      observed: {
        ...fallback.observed,
        visual: cleanSentence(observed.visual, fallback.observed.visual),
      },
      labels: {
        mechanisms: Array.isArray(labels.mechanisms)
          ? labels.mechanisms.filter((item): item is HookMechanismLabel => typeof item === 'string').slice(0, 3)
          : fallback.labels.mechanisms,
        primaryFail: typeof labels.primaryFail === 'string'
          ? labels.primaryFail as HookPrimaryFail
          : fallback.labels.primaryFail,
      },
      editFixes: Array.isArray(parsed.editFixes)
        ? parsed.editFixes
            .map((item) => {
              const fix = item && typeof item === 'object' ? item as Record<string, unknown> : {};
              return {
                impact: fix.impact === 'high' || fix.impact === 'med' || fix.impact === 'low' ? fix.impact : 'med',
                do: cleanSentence(fix.do, ''),
                why: cleanSentence(fix.why, ''),
              } satisfies HookEditFix;
            })
            .filter((fix) => fix.do && fix.why)
            .slice(0, 4)
        : fallback.editFixes,
      reshootPlan: {
        firstShot: cleanSentence(reshootPlan.firstShot, fallback.reshootPlan.firstShot),
        first5sScript: cleanSentence(reshootPlan.first5sScript, fallback.reshootPlan.first5sScript),
        shotBeats: Array.isArray(reshootPlan.shotBeats)
          ? reshootPlan.shotBeats
              .filter((item): item is string => typeof item === 'string')
              .map((item) => normalizePhrase(item, ''))
              .filter(Boolean)
              .slice(0, 3)
          : fallback.reshootPlan.shotBeats,
        lighting: cleanSentence(reshootPlan.lighting, fallback.reshootPlan.lighting),
      },
      replacementHooks: Array.isArray(parsed.replacementHooks)
        ? parsed.replacementHooks
            .map((item) => {
              const replacement = item && typeof item === 'object' ? item as Record<string, unknown> : {};
              return {
                hook: normalizePhrase(replacement.hook, ''),
                shot: cleanSentence(replacement.shot, ''),
                overlay: normalizePhrase(replacement.overlay, ''),
              } satisfies HookReplacement;
            })
            .filter((replacement) => replacement.hook && replacement.shot && replacement.overlay)
            .slice(0, 4)
        : fallback.replacementHooks,
      dimensions: {
        visual: mergeDimensionScore(
          dimensions.visual,
          fallback.dimensions?.visual ?? { score: 5, justification: fallback.summary },
        ),
        audio: mergeDimensionScore(
          dimensions.audio,
          fallback.dimensions?.audio ?? { score: 5, justification: fallback.audio.upliftReason },
        ),
        narrative: mergeDimensionScore(
          dimensions.narrative,
          fallback.dimensions?.narrative ?? { score: 5, justification: fallback.summary },
        ),
      },
    };

    next.overallScore = clamp(
      Math.round(
        ((next.dimensions?.visual.score ?? 5) + (next.dimensions?.audio.score ?? 5) + (next.dimensions?.narrative.score ?? 5)) / 3,
      ),
      1,
      10,
    );
    next.topFixes = next.editFixes.map((fix) => fix.do).slice(0, 3);
    return next;
  } catch {
    return fallback;
  }
}

function mergeDimensionScore(
  raw: unknown,
  fallback: { score: number; justification: string },
): { score: number; justification: string } {
  const parsed = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const score = clamp(Math.round(Number(parsed.score ?? fallback.score)), 1, 10);
  return {
    score,
    justification: cleanSentence(parsed.justification, fallback.justification),
  };
}
