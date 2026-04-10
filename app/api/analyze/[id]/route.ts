import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractFrames, type ExtractedFrame, type FramePlanMode } from '@/lib/frame-extractor';
import type { CaptionQualityReport } from '@/lib/caption-quality';
import { analyzeFrames, extractTextFromAnalysis, deriveCaptionQuality, type FrameAnalysis } from '@/lib/frame-analysis';
import { extractAudio, cleanupAudio } from '@/lib/audio-extractor';
import { transcribeAudio, TranscriptionResult } from '@/lib/whisper-transcribe';
import { detectSpeechMusic, AudioCharacteristics } from '@/lib/speech-music-detect';
import { assessTranscriptQuality } from '@/lib/transcript-quality';
import { supabaseServer } from '@/lib/supabase-server';
import { existsSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { DimensionKey, type AdminAnalyticsPayload, type AgentConfidence } from '@/lib/types';
import { buildViewProjection } from '@/lib/view-projection';
import { detectNiche, NicheDetection } from '@/lib/niche-detect';
import { NICHE_CONTEXT } from '@/lib/niche-context';
import { getVideoDuration, analyzeDuration, DurationAnalysis } from '@/lib/video-duration';
import { buildEvidenceLedger, buildFallbackActionPlan, parseStrategicSummary } from '@/lib/action-plan';
import { sanitizeActionPlan, sanitizeAgentResult, sanitizeUserFacingText, sanitizePromptInput } from '@/lib/analysis-safety';
import { logSuccess, logFailure } from '@/lib/analysis-logger';
import type { ActionPlanStep, RoastResult } from '@/lib/types';
import { detectTikTokSound } from '@/lib/tiktok-sound-detect';
import { getFirstFiveSecondsDiagnosis } from '@/lib/hook-help';
import { buildHookAnalysisPrompt, deriveHookAnalysis, parseHookAnalysisResponse } from '@/lib/hook-analysis';

export const maxDuration = 120; // allow up to 2 min for analysis
const HOOK_AUDIO_WINDOW_SEC = 6;

type AgentConfidenceLevel = AgentConfidence['level'];

type HookMechanism =
  | 'curiosity_gap'
  | 'identity_callout'
  | 'pattern_interrupt'
  | 'emotional'
  | 'pov'
  | 'spoken_absurdity'
  | 'visual_interrupt'
  | 'text_overlay';

interface HookAnalysis {
  hookTypes: HookMechanism[];
  dominantMechanism: HookMechanism | 'none';
  keyWord: {
    text: string;
    why: string;
  };
  curiosityGap: {
    present: boolean;
    explanation: string;
  };
  identityCallout: {
    present: boolean;
    who: string;
  };
  patternInterrupt: {
    present: boolean;
    explanation: string;
  };
  hookToPayoffAlignment: {
    status: 'aligned' | 'misaligned' | 'partial';
    explanation: string;
  };
  strengthScore: number;
  rewrites: Array<{
    hook: string;
    why: string;
  }>;
  confidence: AgentConfidence;
}

interface PromptEvidenceBundle {
  frameFacts: string[];
  firstFrameVisual: string | null;
  firstSpokenLine: string | null;
  firstOnScreenText: string | null;
  openingMotionOrSound: string;
  hookZoneSummary: string;
  patternInterruptEvents: string[];
  facePresenceSummary: string;
  nicheGuess: string;
  transcriptQuality: string;
  audioSummary: string;
  captionSummary: string;
  ctaSummary: string;
  authenticitySummary: string;
  hookContext?: string;
}

interface ExtractionOutput {
  score: number;
  scoreJustification: string[];
  findings: string[];
  observedStrength: string;
  primaryFix: string;
  confidence: {
    level: AgentConfidenceLevel;
    reason: string;
  };
  hookAnalysis?: HookAnalysis;
}

interface ExplanationOutput {
  roastText: string;
  improvementTip: string;
}

const HOOK_MECHANISMS: HookMechanism[] = [
  'curiosity_gap',
  'identity_callout',
  'pattern_interrupt',
  'emotional',
  'pov',
  'spoken_absurdity',
  'visual_interrupt',
  'text_overlay',
];

interface AgentResult {
  score: number;
  roastText: string;
  findings: string[];
  improvementTip: string;
  scoreJustification: string[];
  confidence: AgentConfidence;
  hookAnalysis?: HookAnalysis;
  failed?: boolean;
  failureReason?: string;
}

type AgentPromptSpec = {
  name: string;
  extractionTask: string;
  explanationTask: string;
  fewShot: string;
};

const AGENT_PROMPTS: Record<DimensionKey, AgentPromptSpec> = {
  hook: {
    name: 'Hook Agent',
    extractionTask: 'You are Hook Agent. Judge only the opening hook of this short-form video: the first frame and the first 1-3 seconds. Job A is factual extraction only. Decide whether the opener gives the right viewer an immediate reason to stop, understand who the content is for, and keep watching long enough to reach the payoff. Do not judge the full video. Do not judge later pacing, CTA quality, thumbnail quality, comment bait, or general production beyond how they affect the opening beat. Use only the provided first-frame facts, first spoken words, first on-screen text, opening motion or sound, hook-zone summary, and opening-specific evidence. If transcript quality is weak or evidence is missing, say so directly instead of guessing. Classify the hook mechanisms actually present using only these labels: curiosity_gap, identity_callout, pattern_interrupt, emotional, pov, spoken_absurdity, visual_interrupt, text_overlay. Use multi-label classification when needed, then choose one dominantMechanism. Identify the single most important word or short phrase in the opener and explain why it carries the hook. Explicitly assess whether there is a real curiosity gap, whether there is a clear identity callout, whether there is a pattern interrupt, and whether the hook aligns with the likely payoff. Score strengthScore from 1-10 for the intended audience in this niche, not generic virality. Give 2-3 concrete rewrite hooks tailored to this exact topic and niche. Use different strategic angles when possible. Do not use generic templates. Reference actual evidence from the opening. Quote the creator’s first spoken words when available. Mention first-frame text overlay when available. Separate what is observed from what is inferred.',
    explanationTask: 'Job B is creator-facing explanation constrained by Job A only. Explain why the hook works or fails for this niche using the extracted hook types, dominant mechanism, key word, curiosity gap, identity callout, pattern interrupt, hook-to-payoff alignment, strength score, rewrites, and confidence. Be specific, opinionated, and actionable. If the hook is strong, say why without forcing criticism. If it is weak, identify the first change that matters most. Do not mention prompt mechanics, schemas, or unsupported statistics. Do not diagnose thumbnail strategy or comment bait.',
    fewShot: `Extraction example:
Input bundle says firstFrameVisual shows a static medium shot, firstSpokenLine is "today i want to talk about my skincare routine", firstOnScreenText is null, openingMotionOrSound says "no clear opening motion cue", and hookZoneSummary says visual energy stays low.
Output: {"score":31,"scoreJustification":["The first spoken line explains the topic instead of creating tension","No opening text, motion, or visual interrupt creates stop power","The hook promise is broad and does not create a strong reason to keep watching"],"findings":["The opener is informational, not interruptive","There is no real curiosity gap for a skincare viewer"],"observedStrength":"The topic is visible quickly, so the viewer is not confused.","primaryFix":"Lead with a sharper claim or problem statement before you explain the routine.","confidence":{"level":"high","reason":"The first frame, first line, and lack of opening text all point in the same direction."},"hookAnalysis":{"hookTypes":[],"dominantMechanism":"none","keyWord":{"text":"skincare routine","why":"It states the topic, but it does not add tension or novelty."},"curiosityGap":{"present":false,"explanation":"The viewer already knows the creator is about to explain a routine, so there is no unresolved question pulling them forward."},"identityCallout":{"present":false,"who":"It speaks to anyone, not a specific skincare viewer with a problem."},"patternInterrupt":{"present":false,"explanation":"The opening stays visually and verbally flat, so nothing clearly breaks the scroll."},"hookToPayoffAlignment":{"status":"partial","explanation":"The video appears to discuss skincare, but the opener does not promise a distinct payoff worth waiting for."},"strengthScore":3,"rewrites":[{"hook":"If your skin looks worse after a 10-step routine, this is probably why.","why":"Adds a direct problem and gives skincare viewers a reason to stay for the fix."},{"hook":"The best thing I did for my skin was cutting this one step.","why":"Creates curiosity around a specific change without overexplaining the setup."}],"confidence":{"level":"high","reason":"The available opening evidence is explicit and consistent."}}}

Explanation example:
Output: {"roastText":"Your opener tells me the category, but it does not force a skincare viewer to care yet. \"Today I want to talk about my skincare routine\" is safe, and safe hooks get swiped. There is no real curiosity gap, no identity callout, and no pattern interrupt doing any work for you.","improvementTip":"Open on the mistake, result, or opinion first, then explain the routine after the viewer has a reason to stay."}`,
  },
  visual: {
    name: 'Visual Agent',
    extractionTask: 'Judge how the video looks once someone stops. Focus on framing, lighting, background clarity, motion, and visual energy.',
    explanationTask: 'Write a concise creator-facing diagnosis of the visual package. Stay concrete and reference visible details only.',
    fewShot: `Extraction example:
Input bundle says three frame facts mention overhead shadows, clutter behind the subject, and one late scene cut.
Output: {"score":41,"scoreJustification":["Lighting creates visible shadows on the face","Background clutter competes with the subject","Most sampled frames are static"],"findings":["The setup looks casual instead of intentional","The shot does not gain energy until late"],"observedStrength":"The framing stays readable on a phone.","primaryFix":"Clean the frame and light the subject from the front or side before recording.","confidence":{"level":"high","reason":"The frame evidence directly shows the visual issues."}}

Explanation example:
Output: {"roastText":"The shot is readable, but it still looks like you hit record before you staged the frame. The lighting and background are doing you zero favors.","improvementTip":"Simplify the background and relight the face so the subject wins the frame immediately."}`,
  },
  audio: {
    name: 'Audio Agent',
    extractionTask: 'Judge only the sound experience. Focus on speech clarity, transcript reliability, sound strategy, pacing, and whether the message is easy to follow.',
    explanationTask: 'Write a creator-facing audio diagnosis that stays grounded in the extracted evidence and quotes the opening line when it is reliable.',
    fewShot: `Extraction example:
Input bundle says transcript quality is degraded, audio summary says music is present and speech is unclear.
Output: {"score":37,"scoreJustification":["Transcript quality is degraded, which usually tracks with weak speech clarity","Audio summary says speech is present but not clean","The opening line cannot be trusted as a strong verbal hook"],"findings":["The message is harder to process than it should be","The audio strategy is adding friction instead of helping"],"observedStrength":"There is at least a clear attempt at spoken delivery.","primaryFix":"Make the voice easier to understand before layering in music or extra texture.","confidence":{"level":"medium","reason":"The waveform summary is clear, but transcript evidence is degraded."}}

Explanation example:
Output: {"roastText":"The sound is carrying too much friction. If viewers have to work to decode the voice, they leave before the idea lands.","improvementTip":"Prioritize clean, dominant speech first, then add supporting sound only if it stays out of the way."}`,
  },
  authenticity: {
    name: 'Authenticity Agent',
    extractionTask: 'Judge whether the creator comes across like a real person with conviction. Focus on specificity, delivery, eye contact, body language, and whether the language feels lived-in or generic.',
    explanationTask: 'Write a creator-facing authenticity diagnosis that calls out performative phrasing or stiff delivery without becoming theatrical.',
    fewShot: `Extraction example:
Input bundle says eye contact is inconsistent, first line is generic, and authenticity summary says the script language feels polished but impersonal.
Output: {"score":46,"scoreJustification":["The opening line sounds templated","Face presence is inconsistent across the opening frames","Delivery signals feel more rehearsed than lived"],"findings":["The creator voice does not feel distinct yet","The delivery loses trust because it sounds polished instead of personal"],"observedStrength":"The creator does show up on camera instead of hiding behind B-roll.","primaryFix":"Use plainer language and a more specific opinion or lived detail.","confidence":{"level":"medium","reason":"Authenticity is inferential, but the language and body-language cues are consistent."}}

Explanation example:
Output: {"roastText":"Nothing here feels fake exactly, but it does feel buffered. The delivery sounds cleaned up in a way that strips out personality.","improvementTip":"Keep the point, drop the polished filler, and say the opinion the way you would say it off-camera."}`,
  },
  conversion: {
    name: 'Conversion Agent',
    extractionTask: 'Judge whether the video creates a clear payoff or ask. Focus on the presence, clarity, and timing of any CTA, payoff, or comment-driving prompt.',
    explanationTask: 'Write a creator-facing conversion diagnosis that explains whether the ending gives viewers a reason to act.',
    fewShot: `Extraction example:
Input bundle says no CTA is detected, first text is topical only, and cta summary says the transcript contains no follow, save, or comment ask.
Output: {"score":34,"scoreJustification":["No clear CTA or payoff ask is present","On-screen text explains the topic but not the next action","Nothing in the evidence invites a save, share, or response"],"findings":["The video ends without converting attention into action","The payoff is not packaged into a clear next step"],"observedStrength":"The topic itself may still attract the right viewer.","primaryFix":"Add one explicit, niche-matched action or payoff line near the end.","confidence":{"level":"high","reason":"The bundle clearly shows the absence of a conversion event."}}

Explanation example:
Output: {"roastText":"You may win a few seconds of attention, but you are not converting that attention into anything useful. The video ends without a clean ask or payoff.","improvementTip":"Pick one action you want, then make the reward for that action obvious before the video finishes."}`,
  },
  accessibility: {
    name: 'Accessibility Agent',
    extractionTask: 'Judge whether the video still makes sense with low audio or no audio. Focus on on-screen text timing, caption clarity, contrast, and whether visuals carry the message.',
    explanationTask: 'Write a creator-facing accessibility diagnosis that frames caption and text issues as comprehension problems, not compliance talk.',
    fewShot: `Extraction example:
Input bundle says first on-screen text is null, caption summary says no burned-in captions detected, and transcript quality is usable.
Output: {"score":22,"scoreJustification":["No burned-in captions were detected","The message depends on speech even though transcript shows spoken content","There is no early on-screen text to orient sound-off viewers"],"findings":["The video is weak in mute mode","Comprehension starts too late for viewers scanning silently"],"observedStrength":"If audio is on, the spoken message may still be understandable.","primaryFix":"Add readable on-screen text early and keep captions present when speech carries the meaning.","confidence":{"level":"high","reason":"Caption absence and speech dependence are both explicit in the bundle."}}

Explanation example:
Output: {"roastText":"This asks too much from a silent viewer. If the words matter, the words need to be visible.","improvementTip":"Get readable text on screen early and keep the key spoken points visible while they are said."}`,
  },
};

function buildPromptBlock(
  task: string,
  allowedEvidence: unknown,
  outputSchema: string,
  fewShot: string,
): string {
  return [
    `TASK\n${task}`,
    `ALLOWED EVIDENCE\n${JSON.stringify(allowedEvidence, null, 2)}`,
    `OUTPUT SCHEMA\n${outputSchema}`,
    `FEW-SHOT EXAMPLES\n${fewShot}`,
  ].join('\n\n');
}

function buildExtractionPrompt(dimension: DimensionKey, bundle: PromptEvidenceBundle): string {
  const spec = AGENT_PROMPTS[dimension];
  const outputSchema = dimension === 'hook'
    ? `Return ONLY valid JSON:
{"score": number, "scoreJustification": string[], "findings": string[], "observedStrength": string, "primaryFix": string, "confidence": {"level": "high" | "medium" | "low", "reason": string}, "hookAnalysis": {"hookTypes": ["curiosity_gap" | "identity_callout" | "pattern_interrupt" | "emotional" | "pov" | "spoken_absurdity" | "visual_interrupt" | "text_overlay"], "dominantMechanism": "curiosity_gap" | "identity_callout" | "pattern_interrupt" | "emotional" | "pov" | "spoken_absurdity" | "visual_interrupt" | "text_overlay" | "none", "keyWord": {"text": string, "why": string}, "curiosityGap": {"present": boolean, "explanation": string}, "identityCallout": {"present": boolean, "who": string}, "patternInterrupt": {"present": boolean, "explanation": string}, "hookToPayoffAlignment": {"status": "aligned" | "misaligned" | "partial", "explanation": string}, "strengthScore": number, "rewrites": [{"hook": string, "why": string}], "confidence": {"level": "high" | "medium" | "low", "reason": string}}}`
    : `Return ONLY valid JSON:
{"score": number, "scoreJustification": string[], "findings": string[], "observedStrength": string, "primaryFix": string, "confidence": {"level": "high" | "medium" | "low", "reason": string}}`;
  return buildPromptBlock(
    `${spec.extractionTask} Stay factual, terse, and schema-first. Use only the allowed evidence. If evidence is missing, lower confidence instead of guessing.`,
    bundle,
    outputSchema,
    spec.fewShot,
  );
}

function buildExplanationPrompt(
  dimension: DimensionKey,
  bundle: PromptEvidenceBundle,
  extraction: ExtractionOutput,
): string {
  const spec = AGENT_PROMPTS[dimension];
  return buildPromptBlock(
    `${spec.explanationTask} Keep it tight. Sound like a sharp backend creator coach, not a comedian. Use only the allowed evidence and extracted diagnosis. Two short paragraphs max worth of content.`,
    { bundle, extraction },
    `Return ONLY valid JSON:
{"roastText": string, "improvementTip": string}`,
    spec.fewShot,
  );
}

function extractJsonObject(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  const startIdx = jsonStr.indexOf('{');
  if (startIdx === -1) throw new Error('No JSON object found');

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIdx = -1;

  for (let i = startIdx; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx === -1) throw new Error('Truncated JSON object');
  return jsonStr.slice(startIdx, endIdx + 1);
}

function isHookMechanism(value: unknown): value is HookMechanism {
  return typeof value === 'string' && HOOK_MECHANISMS.includes(value as HookMechanism);
}

function sanitizeHookAnalysis(raw: unknown): HookAnalysis {
  const parsed: Record<string, unknown> = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const hookTypes = Array.isArray(parsed.hookTypes)
    ? parsed.hookTypes.filter(isHookMechanism).slice(0, HOOK_MECHANISMS.length)
    : [];
  const confidence = (parsed.confidence && typeof parsed.confidence === 'object')
    ? parsed.confidence as Record<string, unknown>
    : undefined;
  const keyWord = (parsed.keyWord && typeof parsed.keyWord === 'object')
    ? parsed.keyWord as Record<string, unknown>
    : undefined;
  const curiosityGap = (parsed.curiosityGap && typeof parsed.curiosityGap === 'object')
    ? parsed.curiosityGap as Record<string, unknown>
    : undefined;
  const identityCallout = (parsed.identityCallout && typeof parsed.identityCallout === 'object')
    ? parsed.identityCallout as Record<string, unknown>
    : undefined;
  const patternInterrupt = (parsed.patternInterrupt && typeof parsed.patternInterrupt === 'object')
    ? parsed.patternInterrupt as Record<string, unknown>
    : undefined;
  const hookToPayoffAlignment = (parsed.hookToPayoffAlignment && typeof parsed.hookToPayoffAlignment === 'object')
    ? parsed.hookToPayoffAlignment as Record<string, unknown>
    : undefined;
  const confidenceLevel = confidence?.level;

  return {
    hookTypes,
    dominantMechanism: isHookMechanism(parsed.dominantMechanism) ? parsed.dominantMechanism : 'none',
    keyWord: {
      text: sanitizeUserFacingText(keyWord?.text ?? 'No single word is carrying the opener.', 'No single word is carrying the opener.'),
      why: sanitizeUserFacingText(keyWord?.why ?? 'The opener does not have a sharp verbal lever yet.', 'The opener does not have a sharp verbal lever yet.'),
    },
    curiosityGap: {
      present: Boolean(curiosityGap?.present),
      explanation: sanitizeUserFacingText(curiosityGap?.explanation ?? 'There is no clear unresolved question in the opener.', 'There is no clear unresolved question in the opener.'),
    },
    identityCallout: {
      present: Boolean(identityCallout?.present),
      who: sanitizeUserFacingText(identityCallout?.who ?? 'The opener does not clearly call out a specific viewer.', 'The opener does not clearly call out a specific viewer.'),
    },
    patternInterrupt: {
      present: Boolean(patternInterrupt?.present),
      explanation: sanitizeUserFacingText(patternInterrupt?.explanation ?? 'Nothing in the opening clearly breaks the scroll.', 'Nothing in the opening clearly breaks the scroll.'),
    },
    hookToPayoffAlignment: {
      status: hookToPayoffAlignment?.status === 'aligned' || hookToPayoffAlignment?.status === 'misaligned' || hookToPayoffAlignment?.status === 'partial'
        ? hookToPayoffAlignment.status
        : 'partial',
      explanation: sanitizeUserFacingText(hookToPayoffAlignment?.explanation ?? 'The opener and the payoff only partially line up from the available evidence.', 'The opener and the payoff only partially line up from the available evidence.'),
    },
    strengthScore: Math.max(1, Math.min(10, Math.round(Number(parsed.strengthScore ?? 5)))),
    rewrites: Array.isArray(parsed.rewrites)
      ? parsed.rewrites
          .map((rewrite: unknown) => {
            const parsedRewrite = (rewrite && typeof rewrite === 'object') ? rewrite as Record<string, unknown> : {};
            return {
              hook: sanitizeUserFacingText(parsedRewrite.hook ?? '', ''),
              why: sanitizeUserFacingText(parsedRewrite.why ?? '', ''),
            };
          })
          .filter((rewrite: { hook: string; why: string }) => rewrite.hook.length > 0)
          .slice(0, 3)
      : [],
    confidence: {
      level: confidenceLevel === 'high' || confidenceLevel === 'medium' || confidenceLevel === 'low' ? confidenceLevel : 'medium',
      reason: sanitizeUserFacingText(confidence?.reason ?? 'Hook confidence is limited by the opening evidence quality.', 'Hook confidence is limited by the opening evidence quality.'),
    },
  };
}

function parseExtractionResponse(text: string, dimension: DimensionKey): ExtractionOutput {
  const parsed = JSON.parse(extractJsonObject(text)) as Partial<ExtractionOutput> & { hookAnalysis?: unknown };
  const level = parsed.confidence?.level;
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0)))),
    scoreJustification: Array.isArray(parsed.scoreJustification) ? parsed.scoreJustification.slice(0, 3).map(item => sanitizeUserFacingText(String(item), '')) : [],
    findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 4).map(item => sanitizeUserFacingText(String(item), '')) : [],
    observedStrength: sanitizeUserFacingText(parsed.observedStrength ?? 'Some evidence is present, but it is not carrying the whole dimension.', 'Some evidence is present, but it is not carrying the whole dimension.'),
    primaryFix: sanitizeUserFacingText(parsed.primaryFix ?? 'Tighten the weakest part of this dimension before posting again.', 'Tighten the weakest part of this dimension before posting again.'),
    confidence: {
      level: level === 'high' || level === 'medium' || level === 'low' ? level : 'medium',
      reason: sanitizeUserFacingText(parsed.confidence?.reason ?? 'The available evidence is mixed.', 'The available evidence is mixed.'),
    },
    ...(dimension === 'hook' ? { hookAnalysis: sanitizeHookAnalysis(parsed.hookAnalysis) } : {}),
  };
}

function parseExplanationResponse(text: string): ExplanationOutput {
  const parsed = JSON.parse(extractJsonObject(text)) as Partial<ExplanationOutput>;
  return {
    roastText: sanitizeUserFacingText(parsed.roastText ?? 'No diagnosis generated.', 'No diagnosis generated.'),
    improvementTip: sanitizeUserFacingText(parsed.improvementTip ?? 'Tighten this dimension before posting again.', 'Tighten this dimension before posting again.'),
  };
}

function summarizeFrame(frame: FrameAnalysis): string {
  const text = frame.textOnScreen.length > 0 ? ` text="${frame.textOnScreen.join(' / ')}"` : '';
  const face = frame.peopleCount > 0 ? ` face=${frame.framing} ${frame.faceFillPercent}% eyeContact=${frame.eyeContact}` : ' no-face';
  const motion = frame.sceneChanged ? ' scene-change' : ` motion=${frame.motionType}`;
  const captions = frame.captionsPresent ? ` captions=${frame.captionStyle ?? 'present'} readable=${frame.captionReadable}` : ' captions=none';
  return `${frame.timestampSec.toFixed(1)}s ${frame.sceneDescription}; lighting=${frame.lightingQuality}; energy=${frame.visualEnergy};${face};${motion};${captions}; background=${frame.backgroundClutter}.${text}`;
}

function buildPatternInterruptEvents(analysis: FrameAnalysis[]): string[] {
  return analysis
    .filter(frame => frame.sceneChanged || frame.visualEnergy === 'high' || frame.motionType.toLowerCase().includes('zoom'))
    .slice(0, 5)
    .map(frame => `${frame.timestampSec.toFixed(1)}s ${frame.sceneChanged ? 'scene change' : frame.motionType}; energy=${frame.visualEnergy}`);
}

function buildOpeningMotionOrSoundSummary(
  analysis: FrameAnalysis[],
  audioChars: AudioCharacteristics,
): string {
  const openingEvent = buildPatternInterruptEvents(analysis.slice(0, 5))[0] ?? 'no major opening motion event detected';
  return [
    openingEvent,
    audioChars.hasSpeech ? 'speech starts in the opener' : 'no clear speech start detected',
    audioChars.hasMusic ? 'music or background audio is present early' : 'no strong opening music cue detected',
  ].join(' | ');
}

function buildHookZoneSummary(analysis: FrameAnalysis[]): string {
  const hookFrames = analysis.slice(0, 5);
  if (hookFrames.length === 0) return 'No hook-zone frame data available.';

  const textHooks = hookFrames
    .filter(frame => frame.textOnScreen.length > 0)
    .map(frame => `"${frame.textOnScreen.join(' / ')}" @ ${frame.timestampSec.toFixed(1)}s`);

  return [
    `${hookFrames.length} sampled opening frames`,
    `sceneChanges=${hookFrames.filter(frame => frame.sceneChanged).length}`,
    `eyeContactFrames=${hookFrames.filter(frame => frame.eyeContact).length}/${hookFrames.length}`,
    `textHooks=${textHooks.length > 0 ? textHooks.join(', ') : 'none'}`,
    `visualEnergy=${hookFrames.map(frame => frame.visualEnergy).join(', ')}`,
  ].join(' | ');
}

function buildFacePresenceSummary(analysis: FrameAnalysis[]): string {
  if (analysis.length === 0) return 'No frame evidence.';
  const withFace = analysis.filter(frame => frame.peopleCount > 0);
  if (withFace.length === 0) return 'No face visible in sampled frames.';
  const avgFaceFill = Math.round(withFace.reduce((sum, frame) => sum + frame.faceFillPercent, 0) / withFace.length);
  const eyeContactFrames = withFace.filter(frame => frame.eyeContact).length;
  return `${withFace.length}/${analysis.length} sampled frames show a face. Average face fill ${avgFaceFill}%. Eye contact in ${eyeContactFrames}/${withFace.length} face frames.`;
}

function buildAudioSummary(audioChars: AudioCharacteristics, transcript: TranscriptionResult | null, transcriptQuality: string, detectedSoundNote: string | null): string {
  const pieces = [
    transcriptQuality,
    audioChars.hasSpeech ? 'speech-detected' : 'speech-not-clear',
    audioChars.hasMusic ? 'music-detected' : 'no-continuous-music',
    audioChars.pacingHint ? `pace=${audioChars.pacingHint}` : '',
    audioChars.meanVolumeDB != null ? `mean=${audioChars.meanVolumeDB.toFixed(1)}dBFS` : '',
    audioChars.maxVolumeDB != null ? `peak=${audioChars.maxVolumeDB.toFixed(1)}dBFS` : '',
    transcript?.provider ? `transcript-provider=${transcript.provider}` : '',
    detectedSoundNote ?? '',
  ].filter(Boolean);
  return pieces.join(' | ');
}

function buildCaptionReportFromFrames(
  captionQualityDerived: ReturnType<typeof deriveCaptionQuality>,
  analysis: FrameAnalysis[],
  transcript: TranscriptionResult | null,
): CaptionQualityReport {
  const firstCaptionFrame = analysis.find(frame => frame.captionsPresent);
  const speechStartTimeSec = transcript?.segments?.find(segment => segment.text.trim().length > 0)?.start ?? null;
  const firstCaptionTimeSec = firstCaptionFrame?.timestampSec ?? null;
  const gap = firstCaptionTimeSec != null && speechStartTimeSec != null
    ? Number((firstCaptionTimeSec - speechStartTimeSec).toFixed(2))
    : null;
  const readabilityScore = captionQualityDerived.hasCaptions
    ? (captionQualityDerived.readable ? 80 : 45) + (captionQualityDerived.inSafeZone ? 10 : -10)
    : 10;

  return {
    hasCaptions: captionQualityDerived.hasCaptions,
    firstCaptionTimeSec,
    speechStartTimeSec,
    captionSpeechGapSec: gap,
    timingGrade: !captionQualityDerived.hasCaptions ? 'F' : gap != null && gap <= 0.5 ? 'A' : gap != null && gap <= 1.5 ? 'B' : 'F',
    readabilityScore,
    fontSizeAssessment: {
      label: captionQualityDerived.hasCaptions ? 'medium' : 'none',
      approxFrameWidthPct: null,
      recommendation: captionQualityDerived.hasCaptions ? 'Keep captions large enough to read quickly on a phone screen.' : 'Add burned-in captions early if spoken words carry the meaning.',
    },
    contrastAssessment: {
      ratioEstimate: null,
      label: captionQualityDerived.hasCaptions && captionQualityDerived.readable ? 'medium' : captionQualityDerived.hasCaptions ? 'low' : 'none',
      recommendation: captionQualityDerived.readable ? 'Keep caption contrast strong across all sampled frames.' : 'Increase contrast so the text stays legible on every background.',
    },
    positionAssessment: {
      verticalZone: captionQualityDerived.inSafeZone ? 'lower-safe' : captionQualityDerived.hasCaptions ? 'bottom-danger' : 'unknown',
      horizontalRisk: 'unknown',
      recommendation: captionQualityDerived.inSafeZone ? 'Keep captions out of the UI danger zones.' : 'Move captions higher so platform UI does not cover them.',
    },
    overallReadability: !captionQualityDerived.hasCaptions ? 'poor' : captionQualityDerived.readable && captionQualityDerived.inSafeZone ? 'good' : 'mixed',
    notableIssues: !captionQualityDerived.hasCaptions
      ? ['No burned-in captions detected in sampled frames.']
      : [
          captionQualityDerived.readable ? 'Caption text is generally readable.' : 'Caption text is present but not consistently readable.',
          captionQualityDerived.inSafeZone ? 'Caption placement stays mostly clear of platform UI.' : 'Caption placement risks overlapping platform UI.',
        ],
    actionableRecommendations: !captionQualityDerived.hasCaptions
      ? ['Add burned-in captions or text overlays when speech carries the message.']
      : [
          captionQualityDerived.readable ? 'Keep the current caption sizing and clarity.' : 'Increase caption size or contrast.',
          captionQualityDerived.inSafeZone ? 'Keep captions in the current safe area.' : 'Raise captions higher on screen.',
        ],
    summary: !captionQualityDerived.hasCaptions
      ? 'No burned-in captions detected.'
      : `Captions appear in ${captionQualityDerived.framesWithCaptions}/${captionQualityDerived.totalFrames} sampled frames. Readable=${captionQualityDerived.readable}. Safe-zone=${captionQualityDerived.inSafeZone}.`,
  };
}

const DIMENSION_ORDER: DimensionKey[] = ['hook', 'visual', 'audio', 'authenticity', 'conversion', 'accessibility'];
const AGENT_TIMESTAMPS: Record<DimensionKey, number> = {
  hook: 0.5,
  visual: 1.5,
  audio: 3.0,
  authenticity: 8.0,
  conversion: 12.0,
  accessibility: 15.0,
};

const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  hook: 0.30,
  visual: 0.20,
  audio: 0.15,
  authenticity: 0.15,
  conversion: 0.12,
  accessibility: 0.08,
};

// When the hook is weak, conversion/accessibility are near-irrelevant -
// nobody reaches the end. Hook weight lifted to 0.45 to make a bad first impression
// dominate the overall score and signal loudly to the creator.
const HOOK_FIRST_WEIGHTS: Record<DimensionKey, number> = {
  hook: 0.45,
  visual: 0.20,
  audio: 0.15,
  authenticity: 0.10,
  conversion: 0.05,
  accessibility: 0.05,
};

const HOOK_EXTENSION_THRESHOLD = Number(process.env.HOOK_EXTENSION_THRESHOLD ?? 68);
const HOOK_FULL_VIDEO_THRESHOLD = Number(process.env.HOOK_FULL_VIDEO_THRESHOLD ?? 82);

// Threshold raised from 55 → 60 so more videos trigger hook-first mode.
// A score of 55-59 was previously "mixed" but in practice those videos still
// have a broken opening -they need the same "fix hook first" messaging.
function classifyHookStrength(score: number): 'weak' | 'mixed' | 'strong' {
  if (score < 60) return 'weak';
  if (score < 78) return 'mixed';
  return 'strong';
}

interface OnScreenTextResult {
  timestampSec: number;
  label: string;
  detectedText: string[];
}

function isLocalhostRequest(req: NextRequest): boolean {
  const hostname = req.nextUrl.hostname || req.headers.get('host')?.split(':')[0] || '';
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getDimensionWeights(hookScore: number | undefined): Record<DimensionKey, number> {
  if (typeof hookScore !== 'number') return DIMENSION_WEIGHTS;
  return classifyHookStrength(hookScore) === 'weak' ? HOOK_FIRST_WEIGHTS : DIMENSION_WEIGHTS;
}

function buildHookSummary(hookResult: AgentResult) {
  const strength = classifyHookStrength(hookResult.score);
  const firstFinding = hookResult.findings[0] || 'The opening is not doing enough work.';
  const headline = strength === 'weak'
    ? 'your first 2-3 seconds are the main reason this stalls'
    : strength === 'mixed'
      ? 'your hook has something there, but it is not fully earning the hold'
      : 'your hook is buying enough attention to care about the rest';
  const distributionRisk = strength === 'weak'
    ? 'tiktok probably tests this, sees people swipe early, and stops giving the rest of the video a real chance.'
    : strength === 'mixed'
      ? 'the opening buys a little curiosity, but not enough to guarantee distribution if the next beat drags.'
      : 'the opening clears the first distribution hurdle, so later execution has room to matter.';
  const focusNote = strength === 'weak'
    ? 'fix the hook before obsessing over CTA polish, caption tweaks, or end-card ideas.'
    : strength === 'mixed'
      ? 'tighten the opening first, then clean up the next biggest leak.'
      : 'the hook is not the bottleneck, so secondary fixes can now move the needle.';

  // Plain-english distribution gate explanation shown in the hook-gate banner on the roast page.
  const earlyDropNote = strength === 'weak'
    ? 'tiktok gives every video a test batch of ~200-500 people. if those viewers swipe in the first second or two, tiktok reads that as a bad signal and stops pushing the video. that is why a weak hook kills distribution before your helpful advice, clean captions, or strong CTA ever get a fair shot. fix the opening and the rest of your work actually reaches people.'
    : strength === 'mixed'
      ? 'the opening gets partial attention but is not fully passing the initial test batch. viewers who almost stay are still a signal risk -if too many of them bail before the 5-second mark, distribution stalls before the rest of the video lands.'
      : undefined;

  return {
    score: hookResult.score,
    strength,
    headline: `${headline} ${firstFinding}`.trim(),
    distributionRisk,
    focusNote,
    ...(earlyDropNote ? { earlyDropNote } : {}),
  };
}

function determineAnalysisExpansion(hookScore: number | undefined): RoastResult['analysisExpansion'] {
  if (typeof hookScore !== 'number') return 'hook_only';
  if (hookScore >= HOOK_FULL_VIDEO_THRESHOLD) return 'full_video';
  if (hookScore >= HOOK_EXTENSION_THRESHOLD) return 'extended_10s';
  return 'hook_only';
}

function buildHookAgentResult(hookAnalysis: RoastResult['hookAnalysis']): AgentResult {
  const hookScore = hookAnalysis?.scores.hookScore ?? 0;
  const firstEditFix = hookAnalysis?.editFixes[0];
  const findings = [
    hookAnalysis?.timing.propositionTimeSec != null
      ? `The main promise becomes clear around ${hookAnalysis.timing.propositionTimeSec.toFixed(1)}s.`
      : 'The opener never makes the payoff clear inside the hook window.',
    hookAnalysis?.labels.primaryFail
      ? `Primary hook failure: ${hookAnalysis.labels.primaryFail.replace(/_/g, ' ')}.`
      : 'Primary hook failure was not identified cleanly.',
    hookAnalysis?.observed.ocr[0]
      ? `On-screen text appears at ${hookAnalysis.observed.ocr[0].t0.toFixed(1)}s: "${hookAnalysis.observed.ocr[0].text}".`
      : '',
  ].filter(Boolean);

  return {
    score: hookScore,
    roastText: hookAnalysis?.summary ?? 'The first few seconds still are not doing enough work.',
    findings,
    improvementTip: firstEditFix?.do ?? 'Lead with the clearest promise in frame one.',
    scoreJustification: [
      `Silent score ${hookAnalysis?.scores.silentScore ?? 0}/100.`,
      `Audio uplift ${(hookAnalysis?.scores.audioUplift ?? 0) >= 0 ? '+' : ''}${hookAnalysis?.scores.audioUplift ?? 0}.`,
      `Predicted hold: ${Math.round((hookAnalysis?.predictions.pStay3s ?? 0) * 100)}% past 3s and ${Math.round((hookAnalysis?.predictions.pStay5s ?? 0) * 100)}% past 5s.`,
    ],
    confidence: {
      level: (hookAnalysis?.scores.confidence ?? 0) >= 0.75 ? 'high' : (hookAnalysis?.scores.confidence ?? 0) >= 0.55 ? 'medium' : 'low',
      reason: `Hook analysis confidence ${(hookAnalysis?.scores.confidence ?? 0).toFixed(2)} based on opening-frame and transcript evidence.`,
    },
  };
}

function buildFixTracks(hookAnalysis: RoastResult['hookAnalysis']): RoastResult['fixTracks'] {
  if (!hookAnalysis) return { editOnly: [], reshoot: [] };
  return {
    editOnly: hookAnalysis.editFixes,
    reshoot: [
      { label: 'First shot', detail: hookAnalysis.reshootPlan.firstShot },
      { label: 'First 5-second script', detail: hookAnalysis.reshootPlan.first5sScript },
      ...hookAnalysis.reshootPlan.shotBeats.map((detail, index) => ({
        label: `Beat ${index + 1}`,
        detail,
      })),
      { label: 'Lighting', detail: hookAnalysis.reshootPlan.lighting },
    ],
  };
}


interface ChronicIssueForPrompt {
  dimension: string;
  finding: string;
  count: number;
}

async function fetchChronicIssues(sessionId: string): Promise<ChronicIssueForPrompt[]> {
  if (!sessionId || sessionId === 'server') return [];

  try {
    const { data, error } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('findings')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length < 2) return [];

    // Count finding occurrences across all previous roasts
    const issueCounts: Record<string, { count: number; dimension: string; finding: string }> = {};

    for (const row of data) {
      const findings = row.findings as Record<string, string[]> | null;
      if (!findings) continue;

      for (const [dim, items] of Object.entries(findings)) {
        for (const finding of items) {
          const key = `${dim}::${finding.slice(0, 40).toLowerCase()}`;
          if (!issueCounts[key]) {
            issueCounts[key] = { count: 0, dimension: dim, finding };
          }
          issueCounts[key].count++;
        }
      }
    }

    return Object.values(issueCounts)
      .filter(i => i.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (err) {
    console.warn('[analyze] Failed to fetch chronic issues:', err);
    return [];
  }
}

function buildEscalationContext(chronicIssues: ChronicIssueForPrompt[], dimension: DimensionKey): string {
  if (chronicIssues.length === 0) return '';

  // Filter for issues relevant to this dimension, plus overall context
  const dimIssues = chronicIssues.filter(i => i.dimension === dimension);
  const otherIssues = chronicIssues.filter(i => i.dimension !== dimension).slice(0, 3);

  if (dimIssues.length === 0 && otherIssues.length === 0) return '';

  let context = '\n\nIMPORTANT: This user has been roasted before. Previous roasts flagged these recurring issues:\n';

  for (const issue of dimIssues) {
    context += `- [YOUR DIMENSION - ${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times) -ESCALATE your roast on this. No mercy.\n`;
  }

  for (const issue of otherIssues) {
    context += `- [${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times)\n`;
  }

  context += '\nEscalate intensity for repeat issues. Reference that you\'ve told them before. Be disappointed, not just savage. Make them feel the weight of not listening.';

  return context;
}

function getFirstSpokenLine(transcript: TranscriptionResult | null, shouldUseTranscriptEvidence: boolean): string | null {
  if (!shouldUseTranscriptEvidence || !transcript?.segments?.length) return null;
  const line = transcript.segments
    .filter(segment => segment.start <= 3)
    .map(segment => segment.text.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return line || null;
}

function buildCtaSummary(transcript: TranscriptionResult | null, onScreenTextResults: OnScreenTextResult[]): string {
  const transcriptText = transcript?.text?.toLowerCase() ?? '';
  const textOverlay = onScreenTextResults.flatMap(result => result.detectedText).join(' ').toLowerCase();
  const ctaTerms = ['follow', 'save', 'comment', 'share', 'dm', 'link in bio'];
  const found = ctaTerms.filter(term => transcriptText.includes(term) || textOverlay.includes(term));
  return found.length > 0 ? `CTA-like language detected: ${found.join(', ')}` : 'No explicit CTA language detected in transcript or sampled text overlays.';
}

function buildAuthenticitySummary(transcript: TranscriptionResult | null, analysis: FrameAnalysis[]): string {
  const firstLine = transcript?.segments?.[0]?.text?.trim() ?? '';
  const genericOpening = firstLine ? /^(hey|okay|so|today|in this video)\b/i.test(firstLine) : false;
  const eyeContactFrames = analysis.filter(frame => frame.eyeContact).length;
  return [
    firstLine ? `opening-line="${sanitizePromptInput(firstLine, 120)}"` : 'opening-line=missing',
    genericOpening ? 'opening-language=generic' : 'opening-language=specific-or-unknown',
    `eye-contact-frames=${eyeContactFrames}/${analysis.length || 0}`,
  ].join(' | ');
}

function buildPromptEvidenceBundle(params: {
  dimension: DimensionKey;
  frameAnalysisFrames: FrameAnalysis[];
  transcript: TranscriptionResult | null;
  shouldUseTranscriptEvidence: boolean;
  transcriptQualityNote: string;
  audioChars: AudioCharacteristics;
  onScreenTextResults: OnScreenTextResult[];
  nicheDetection: NicheDetection;
  detectedSound: Awaited<ReturnType<typeof detectTikTokSound>>;
  captionQuality: CaptionQualityReport | null;
  hookResult?: AgentResult;
}): PromptEvidenceBundle {
  const {
    dimension,
    frameAnalysisFrames,
    transcript,
    shouldUseTranscriptEvidence,
    transcriptQualityNote,
    audioChars,
    onScreenTextResults,
    nicheDetection,
    detectedSound,
    captionQuality,
    hookResult,
  } = params;

  const firstFiveFrames = frameAnalysisFrames.slice(0, 5).map(summarizeFrame);
  const firstSpokenLine = getFirstSpokenLine(transcript, shouldUseTranscriptEvidence);
  const firstOnScreenText = onScreenTextResults.find(result => result.detectedText.length > 0)?.detectedText.join(' | ') ?? null;
  const hookContext = hookResult && dimension !== 'hook'
    ? `hook=${hookResult.score}/100 (${classifyHookStrength(hookResult.score)}); primary-finding=${hookResult.findings[0] ?? 'n/a'}`
    : undefined;

  return {
    frameFacts: firstFiveFrames.length > 0 ? firstFiveFrames : ['No frame facts available.'],
    firstFrameVisual: frameAnalysisFrames[0] ? summarizeFrame(frameAnalysisFrames[0]) : null,
    firstSpokenLine,
    firstOnScreenText,
    openingMotionOrSound: buildOpeningMotionOrSoundSummary(frameAnalysisFrames, audioChars),
    hookZoneSummary: buildHookZoneSummary(frameAnalysisFrames),
    patternInterruptEvents: buildPatternInterruptEvents(frameAnalysisFrames),
    facePresenceSummary: buildFacePresenceSummary(frameAnalysisFrames.slice(0, 5)),
    nicheGuess: nicheDetection.subNiche ? `${nicheDetection.niche} / ${nicheDetection.subNiche} (${nicheDetection.confidence})` : `${nicheDetection.niche} (${nicheDetection.confidence})`,
    transcriptQuality: transcriptQualityNote,
    audioSummary: buildAudioSummary(
      audioChars,
      transcript,
      transcriptQualityNote,
      detectedSound ? `${detectedSound.isOriginal ? 'original-audio' : 'licensed-or-trending-audio'}:${sanitizePromptInput(detectedSound.name, 80)}` : null,
    ),
    captionSummary: captionQuality?.summary ?? 'No caption audit available.',
    ctaSummary: buildCtaSummary(transcript, onScreenTextResults),
    authenticitySummary: buildAuthenticitySummary(transcript, frameAnalysisFrames.slice(0, 5)),
    ...(hookContext ? { hookContext } : {}),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestStartedAtMs = Date.now();
  const localhostDebug = isLocalhostRequest(req);
  const requestHost = req.nextUrl.host;

  // Extract session_id and platform from query params
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? 'server';
  const platform = (req.nextUrl.searchParams.get('platform') === 'reels' ? 'reels' : 'tiktok') as 'tiktok' | 'reels';

  // Fetch video path from Supabase session record
  const { data: session, error: sessionError } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('video_url, filename, tiktok_url, created_at, description')
    .eq('id', id)
    .single();

  if (sessionError || !session?.video_url) {
    return Response.json({ error: 'Video not found. It may have expired.' }, { status: 404 });
  }

  const storagePath = session.video_url as string;
  const ext = storagePath.split('.').pop() || 'mp4';
  const localPath = `/tmp/rmt-${id}.${ext}`;

  // Download video from Supabase Storage to /tmp for ffmpeg
  const downloadStartedAtMs = Date.now();
  const { data: fileData, error: downloadError } = await supabaseServer.storage
    .from('roast-videos')
    .download(storagePath);
  const downloadDurationMs = Date.now() - downloadStartedAtMs;

  if (downloadError || !fileData) {
    return Response.json({ error: 'Failed to retrieve video from storage.' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  await writeFile(localPath, buffer);

  const videoPath = localPath;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let audioPath: string | null = null;
      const analysisStartedAtMs = Date.now();
      const stageTimings: Record<string, number> = {
        session_lookup_and_download: analysisStartedAtMs - requestStartedAtMs,
        video_download: downloadDurationMs,
      };
      const uploadStartedAtIso = typeof (session as { created_at?: string | null }).created_at === 'string'
        ? (session as { created_at?: string | null }).created_at ?? null
        : null;

      try {
        // Fetch repeat-issue context and TikTok sound metadata in parallel
        const chronicIssuesPromise = fetchChronicIssues(sessionId);
        const detectedSoundPromise = detectTikTokSound((session as { video_url: string; filename?: string; tiktok_url?: string }).tiktok_url);

        // Extract hook frames first
        send({ type: 'status', message: 'Extracting hook frames (0-6s)...' });
        let frames: ExtractedFrame[] = [];
        const frameStart = Date.now();
        try {
          frames = extractFrames(videoPath, 'hook-only');
          stageTimings.frame_extraction_hook = Date.now() - frameStart;
          logSuccess('frame-extraction', id, { frameCount: frames.length }, Date.now() - frameStart);
        } catch (err) {
          stageTimings.frame_extraction_hook = Date.now() - frameStart;
          logFailure('frame-extraction', id, err);
          send({ type: 'status', message: 'Frame extraction limited, running text-based analysis...' });
        }

        if (frames.length === 0) {
          // Fallback: still run analysis but note limited visual data
          send({ type: 'status', message: 'No frames extracted. Analysis will be limited.' });
        }

        // Extract video duration
        let durationAnalysis: DurationAnalysis | null = null;
        const videoDuration = getVideoDuration(videoPath);
        if (videoDuration) {
          send({ type: 'status', message: `Video duration: ${videoDuration.durationFormatted}` });
          // We'll compute the full analysis after niche detection
        }

        // Extract and transcribe audio
        send({ type: 'status', message: 'Extracting the first 6 seconds of audio...' });
        let transcript: TranscriptionResult | null = null;
        let audioChars: AudioCharacteristics = { hasSpeech: false, hasMusic: false, speechPercent: 0 };
        let transcriptQuality: 'usable' | 'degraded' | 'unavailable' = 'unavailable';
        let transcriptQualityNote = 'No reliable speech transcript available. Falling back to waveform-only audio analysis.';
        let shouldUseTranscriptEvidence = false;

        try {
          const audioExtractionStart = Date.now();
          audioPath = extractAudio(videoPath, HOOK_AUDIO_WINDOW_SEC);
          stageTimings.audio_extraction_hook = Date.now() - audioExtractionStart;
          if (audioPath) {
            logSuccess('audio-extraction', id, { audioPath });
            const hasTranscriptionKey = !!process.env.OPENAI_API_KEY || !!process.env.ASSEMBLYAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
            if (hasTranscriptionKey) {
              send({ type: 'status', message: 'Transcribing the first 6 seconds...' });
            } else {
              logFailure('transcription', id, 'No transcription API key set');
            }
            // Run transcription and speech/music detection in parallel
            const transcriptionStart = Date.now();
            const [transcriptResult, speechMusicResult] = await Promise.all([
              transcribeAudio(audioPath, 60000),
              Promise.resolve(detectSpeechMusic(audioPath)),
            ]);
            stageTimings.audio_transcription_and_detection = Date.now() - transcriptionStart;
            transcript = transcriptResult;
            audioChars = speechMusicResult;

            const transcriptAssessment = assessTranscriptQuality(transcript, audioChars);
            transcript = transcriptAssessment.transcript;
            transcriptQuality = transcriptAssessment.quality;
            transcriptQualityNote = transcriptAssessment.note;
            shouldUseTranscriptEvidence = transcriptAssessment.shouldUseTranscriptEvidence;

            if (transcript?.text || transcript?.segments?.length) {
              logSuccess('transcription', id, {
                provider: transcript.provider,
                chars: transcript.text.length,
                segments: transcript.segments.length,
                quality: transcriptQuality,
                confidence: transcript.confidence,
              }, Date.now() - transcriptionStart);
              send({
                type: 'status',
                message: transcriptQuality === 'usable'
                  ? `Audio transcribed successfully${transcript.provider ? ` via ${transcript.provider}` : ''}.`
                  : `${transcriptQualityNote}${transcript.provider ? ` (${transcript.provider}, ${Math.round(transcript.confidence * 100)}% confidence)` : ''}`,
              });
            } else if (!hasTranscriptionKey) {
              send({ type: 'status', message: 'Audio transcription unavailable -set OPENAI_API_KEY or ASSEMBLYAI_API_KEY.' });
            } else {
              logSuccess('transcription', id, { result: 'no-speech', quality: transcriptQuality }, Date.now() - transcriptionStart);
              send({ type: 'status', message: transcriptQualityNote });
            }
          } else {
            stageTimings.audio_extraction_hook = stageTimings.audio_extraction_hook ?? 0;
            logSuccess('audio-extraction', id, { result: 'no-audio-track' });
            send({ type: 'status', message: 'No audio track found in video.' });
          }
        } catch (err) {
          stageTimings.audio_extraction_hook = stageTimings.audio_extraction_hook ?? 0;
          logFailure('audio-extraction', id, err);
          send({ type: 'status', message: 'Audio transcription timed out. Running visual-only analysis...' });
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 4 });

        // Analyze hook frames with Gemini vision first.
        send({ type: 'status', message: 'Analyzing hook frames and opening text...' });
        let frameAnalysisFrames: FrameAnalysis[] = [];
        let frameContextForNiche = '';
        let captionQuality: CaptionQualityReport | null = null;
        let onScreenTextResults: OnScreenTextResult[] = [];

        if (frames.length > 0) {
          try {
            const frameAnalysisStart = Date.now();
            const frameAnalysis = await analyzeFrames(frames);
            stageTimings.frame_analysis_hook = Date.now() - frameAnalysisStart;
            frameAnalysisFrames = frameAnalysis.frames;
            logSuccess('frame-analysis', id, { totalFrames: frameAnalysis.totalFrames, model: frameAnalysis.analysisModel }, Date.now() - frameAnalysisStart);
            send({ type: 'status', message: `Analyzed ${frameAnalysis.totalFrames} hook frames` });

            // Derive all downstream data from frame analysis
            onScreenTextResults = extractTextFromAnalysis(frameAnalysisFrames).map(r => ({
              timestampSec: r.timestampSec,
              label: `${r.timestampSec.toFixed(2)}s`,
              detectedText: r.detectedText,
            }));
            const captionQualityDerived = deriveCaptionQuality(frameAnalysisFrames);
            captionQuality = buildCaptionReportFromFrames(captionQualityDerived, frameAnalysisFrames, transcript);
            frameContextForNiche = frameAnalysisFrames.map(summarizeFrame).join('\n');
          } catch (err) {
            stageTimings.frame_analysis_hook = stageTimings.frame_analysis_hook ?? 0;
            logFailure('frame-analysis', id, err);
            send({ type: 'status', message: 'Frame analysis limited, continuing with text-based analysis...' });
          }
        }

        // Build transcript confidence note for status
        if (transcript && transcript.confidence < 0.5) {
          send({ type: 'status', message: `Transcript confidence: ${Math.round(transcript.confidence * 100)}% -transcript may be partial or degraded.` });
        }

        const agentResults: Record<string, AgentResult> = {};
        let hookAnalysis: RoastResult['hookAnalysis'];
        let baselineHookAnalysis: ReturnType<typeof deriveHookAnalysis> | null = null;
        let analysisExpansion: RoastResult['analysisExpansion'] = 'hook_only';
        const chronicIssues = await chronicIssuesPromise;
        const detectedSound = await detectedSoundPromise;

        // Detect niche from available signals (AI-based with fallback)
        const sessionDescription = (session as { description?: string }).description ?? '';
        const nicheDetectionStart = Date.now();
        const nicheDetection: NicheDetection = await detectNiche({
          frameDescriptions: frameContextForNiche,
          transcript: transcript?.text ?? undefined,
          caption: sessionDescription,
          hashtags: sessionDescription.match(/#\w+/g)?.map(token => token.slice(1)) ?? [],
        }, anthropic);
        stageTimings.niche_detection = Date.now() - nicheDetectionStart;
        // Niche detection used internally for agent prompts; not surfaced to user
        console.log(`[analyze] Detected niche: ${nicheDetection.niche}${nicheDetection.subNiche ? ` (${nicheDetection.subNiche})` : ''} [${nicheDetection.confidence} confidence]`);

        // Compute duration analysis now that we know the niche
        if (videoDuration) {
          const nicheInfo = NICHE_CONTEXT[nicheDetection.niche];
          durationAnalysis = analyzeDuration(videoDuration, nicheInfo.optimalLength);
          send({
            type: 'duration',
            durationSeconds: videoDuration.durationSeconds,
            durationFormatted: videoDuration.durationFormatted,
            category: durationAnalysis.category,
            optimalRange: nicheInfo.optimalLength,
            deltaSeconds: durationAnalysis.deltaSeconds,
          });
        }

        if (chronicIssues.length > 0) {
          send({ type: 'status', message: 'Repeat offender detected. Escalating intensity...' });
        }

        try {
          send({ type: 'status', message: 'Scoring hook survival through 3s and 5s...' });
          const hookAnalysisStart = Date.now();
          baselineHookAnalysis = deriveHookAnalysis({
            openingFrames: frameAnalysisFrames.filter((frame) => frame.zone === 'hook'),
            transcript,
            shouldUseTranscriptEvidence,
            audioChars,
          });
          const hookAnalysisPrompt = buildHookAnalysisPrompt({
            platform,
            openingFrames: frameAnalysisFrames.filter((frame) => frame.zone === 'hook'),
            hookZoneSummary: buildHookZoneSummary(frameAnalysisFrames),
            transcript,
            shouldUseTranscriptEvidence,
            audioChars,
            transcriptQualityNote,
            detectedSoundNote: detectedSound
              ? `${detectedSound.name} by ${detectedSound.author}${detectedSound.isOriginal ? ' (original audio)' : ' (licensed/trending sound)'}`
              : undefined,
          });
          const hookAnalysisResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1600,
            messages: [{ role: 'user', content: hookAnalysisPrompt }],
          });
          const hookAnalysisText = hookAnalysisResponse.content[0]?.type === 'text' ? hookAnalysisResponse.content[0].text : '';
          hookAnalysis = parseHookAnalysisResponse(hookAnalysisText, baselineHookAnalysis);
          stageTimings.hook_analysis = Date.now() - hookAnalysisStart;
          send({ type: 'hook-analysis', result: hookAnalysis });
        } catch (err) {
          stageTimings.hook_analysis = stageTimings.hook_analysis ?? 0;
          logFailure('hook-analysis', id, err);
          baselineHookAnalysis = deriveHookAnalysis({
            openingFrames: frameAnalysisFrames.filter((frame) => frame.zone === 'hook'),
            transcript,
            shouldUseTranscriptEvidence,
            audioChars,
          });
          hookAnalysis = baselineHookAnalysis;
        }

        analysisExpansion = determineAnalysisExpansion(hookAnalysis?.scores.hookScore);

        if (analysisExpansion !== 'hook_only') {
          const expansionMode: FramePlanMode = analysisExpansion === 'full_video' ? 'full_video' : 'extended_10s';
          send({
            type: 'status',
            message: analysisExpansion === 'full_video'
              ? 'Hook is strong. Expanding into full-video secondary analysis...'
              : 'Hook cleared the bar. Expanding to the 6-10s window...',
          });

          try {
            const expansionStart = Date.now();
            const expandedFrames = extractFrames(videoPath, expansionMode);
            const expandedAnalysis = await analyzeFrames(expandedFrames);
            stageTimings.frame_analysis_expansion = Date.now() - expansionStart;
            frameAnalysisFrames = expandedAnalysis.frames;
            onScreenTextResults = extractTextFromAnalysis(frameAnalysisFrames).map(r => ({
              timestampSec: r.timestampSec,
              label: `${r.timestampSec.toFixed(2)}s`,
              detectedText: r.detectedText,
            }));
            const captionQualityDerived = deriveCaptionQuality(frameAnalysisFrames);
            captionQuality = buildCaptionReportFromFrames(captionQualityDerived, frameAnalysisFrames, transcript);
            frameContextForNiche = frameAnalysisFrames.map(summarizeFrame).join('\n');
            send({
              type: 'status',
              message: analysisExpansion === 'full_video'
                ? 'Full-video secondary analysis loaded.'
                : 'Extended hook window loaded through 10 seconds.',
            });
          } catch (err) {
            stageTimings.frame_analysis_expansion = stageTimings.frame_analysis_expansion ?? 0;
            logFailure('frame-analysis', id, err, { analysisExpansion, stage: 'expansion' });
            analysisExpansion = 'hook_only';
            send({ type: 'status', message: 'Hook expansion failed, keeping the report focused on the hook only.' });
          }
        }

        async function runAgent(dimension: DimensionKey): Promise<void> {
          const { name } = AGENT_PROMPTS[dimension];
          send({ type: 'agent', agent: dimension, status: 'analyzing', name });

          try {
            const agentStart = Date.now();
            const promptBundle = buildPromptEvidenceBundle({
              dimension,
              frameAnalysisFrames,
              transcript,
              shouldUseTranscriptEvidence,
              transcriptQualityNote,
              audioChars,
              onScreenTextResults,
              nicheDetection,
              detectedSound,
              captionQuality,
              hookResult: agentResults.hook,
            });

            const runModel = async (prompt: string, maxTokens: number): Promise<string> => {
              let lastError: unknown = null;
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  const response = await anthropic.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: maxTokens,
                    messages: [{ role: 'user', content: prompt }],
                  });
                  return response.content[0]?.type === 'text' ? response.content[0].text : '';
                } catch (retryErr) {
                  lastError = retryErr;
                  const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
                  const isRetryable = msg.includes('overloaded') || msg.includes('529') || msg.includes('rate') || msg.includes('timeout');
                  if (!isRetryable || attempt === 3) break;
                  console.warn(`[analyze] Agent ${dimension} attempt ${attempt} failed (retryable): ${msg.slice(0, 200)}`);
                  const baseDelay = 3000 * attempt;
                  const jitter = Math.random() * 2000;
                  await new Promise(r => setTimeout(r, baseDelay + jitter));
                }
              }
              throw lastError ?? new Error(`Agent ${dimension} returned no response`);
            };

            const extraction = parseExtractionResponse(
              await runModel(buildExtractionPrompt(dimension, promptBundle), 900),
              dimension,
            );
            const explanation = parseExplanationResponse(
              await runModel(buildExplanationPrompt(dimension, promptBundle, extraction), 700),
            );
            const sanitized = sanitizeAgentResult({
              score: extraction.score,
              roastText: explanation.roastText,
              findings: extraction.findings,
              improvementTip: explanation.improvementTip,
            }, dimension);
            const escalationContext = buildEscalationContext(chronicIssues, dimension);
            const repeatIssue = escalationContext ? ' This is not the first time this issue has shown up.' : '';
            const result: AgentResult = {
              ...sanitized,
              roastText: `${sanitized.roastText}${repeatIssue}`,
              scoreJustification: extraction.scoreJustification,
              confidence: extraction.confidence,
              ...(extraction.hookAnalysis ? { hookAnalysis: extraction.hookAnalysis } : {}),
            };

            if (!result.findings.length) {
              result.findings = [extraction.primaryFix];
            }
            agentResults[dimension] = result;
            stageTimings[`agent_${dimension}`] = Date.now() - agentStart;
            logSuccess('agent', id, { dimension, score: result.score }, Date.now() - agentStart);

            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...result },
            });
          } catch (err) {
            stageTimings[`agent_${dimension}`] = stageTimings[`agent_${dimension}`] ?? 0;
            logFailure('agent', id, err, { dimension });
            const fallback = {
              score: -1,
              roastText: `${name} could not complete the analysis for this dimension.`,
              findings: ['Analysis unavailable -this dimension was not evaluated'],
              improvementTip: 'Try uploading again for a complete analysis.',
              scoreJustification: ['Analysis unavailable'],
              confidence: { level: 'low' as const, reason: 'The model call failed for this dimension.' },
              failed: true,
              failureReason: `${name} was unable to analyze this dimension. Upload again for a full analysis.`,
            };
            agentResults[dimension] = fallback;
            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...fallback },
            });
          }
        }

        send({ type: 'agent', agent: 'hook', status: 'analyzing', name: AGENT_PROMPTS.hook.name });
        agentResults.hook = buildHookAgentResult(hookAnalysis);
        send({
          type: 'agent',
          agent: 'hook',
          status: 'done',
          name: AGENT_PROMPTS.hook.name,
          result: { agent: 'hook', ...agentResults.hook },
        });

        const remainingDimensions = analysisExpansion === 'full_video'
          ? DIMENSION_ORDER.filter(d => d !== 'hook')
          : analysisExpansion === 'extended_10s'
            ? (['visual', 'audio', 'accessibility'] satisfies DimensionKey[])
            : [];

        await Promise.all(remainingDimensions.map((d, i) =>
          new Promise<void>(resolve => setTimeout(resolve, i * 400))
            .then(() => runAgent(d))
        ));

        const hookScore = agentResults.hook?.score;
        const hookSummary = buildHookSummary(agentResults.hook);
        const analysisMode: RoastResult['analysisMode'] = hookSummary.strength === 'weak' ? 'hook-first' : 'balanced';
        const scoringWeights = getDimensionWeights(hookScore);

        // Calculate weighted overall score, skipping failed agents
        let overallScore = 0;
        let totalWeight = 0;
        for (const dim of DIMENSION_ORDER) {
          const agent = agentResults[dim];
          if (!agent) continue;
          if (agent?.failed) continue;
          const score = agent?.score ?? 50;
          overallScore += score * scoringWeights[dim];
          totalWeight += scoringWeights[dim];
        }
        overallScore = totalWeight > 0 ? Math.round(overallScore / totalWeight) : 0;

        // Generate verdict
        let verdict: string;
        let viralPotential: number = 0;
        let nextSteps: string[] = [];
        let actionPlan: ActionPlanStep[] = [];
        let biggestBlocker: string = '';
        let encouragement: string = '';
        let nichePercentile: string = '';
        // Build fallback action plan before verdict attempt so it's available in catch
        const fallbackActionPlan = buildFallbackActionPlan({
          agentResults,
          transcriptSegments: transcript?.segments,
          captionQuality,
          priorityDimensions: analysisMode === 'hook-first' ? ['hook', 'visual', 'audio'] : [],
        });
        try {
          const verdictStart = Date.now();
          const repeatContext = chronicIssues.length > 0
            ? `\n\nThis is a REPEAT OFFENDER. They've been roasted ${chronicIssues.length > 3 ? 'many' : 'a few'} times before and keep making the same mistakes. Reference this in the verdict. Be extra disappointed.`
            : '';

          const validDims = DIMENSION_ORDER.filter(d => agentResults[d] && !agentResults[d]?.failed);
          const lowestDim = analysisMode === 'hook-first'
            ? 'hook'
            : (validDims.length > 0
                ? validDims.reduce((a, b) =>
                    (agentResults[a]?.score ?? 50) < (agentResults[b]?.score ?? 50) ? a : b
                  )
                : 'hook');
          const highestDim = validDims.length > 0
            ? validDims.reduce((a, b) =>
                (agentResults[a]?.score ?? 50) > (agentResults[b]?.score ?? 50) ? a : b
              )
            : 'hook';
          const evidenceLedger = buildEvidenceLedger({
            agentResults,
            transcriptText: transcript?.text,
            transcriptSegments: transcript?.segments,
            captionQuality,
            durationSec: durationAnalysis?.duration.durationSeconds ?? videoDuration?.durationSeconds,
            nicheLabel: nicheDetection.subNiche ? `${nicheDetection.niche} (${nicheDetection.subNiche})` : nicheDetection.niche,
          });
          const nicheInfo = NICHE_CONTEXT[nicheDetection.niche];

          // Verdict generation with retry for transient API overload
          let verdictResponse: Anthropic.Message | null = null;
          let verdictLastError: unknown = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              verdictResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1800,
            messages: [{
              role: 'user',
              content: `You are a killer TikTok strategist. Your job is not to summarize. Your job is to tell the creator exactly what to fix first, with evidence from THIS video.

Detected niche: ${nicheDetection.niche}${nicheDetection.subNiche ? ` (${nicheDetection.subNiche})` : ''}.
${durationAnalysis ? `Video duration: ${durationAnalysis.duration.durationFormatted} (${durationAnalysis.duration.durationSeconds.toFixed(0)}s). Optimal for ${nicheDetection.niche}: ${nicheInfo.optimalLength}. Category: ${durationAnalysis.category}.` : ''}

Niche benchmark data for ${nicheDetection.niche}:
- Average engagement rate in this niche: ${nicheInfo.avgEngagement}
- Best performing formats: ${nicheInfo.bestFormats.join(', ')}
- Most common mistakes in this niche: ${nicheInfo.commonMistakes.join(', ')}
- Recommended hook styles: ${nicheInfo.bestHooks.join(', ')}

Overall weighted score: ${overallScore}/100\nAnalysis mode: ${analysisMode}\nHook summary: ${hookSummary.headline}\nDistribution risk: ${hookSummary.distributionRisk}\nFocus note: ${hookSummary.focusNote}
Lowest-scoring area: ${lowestDim} (${agentResults[lowestDim]?.score}/100)
Highest-scoring area: ${highestDim} (${agentResults[highestDim]?.score}/100)

All agent scores: ${JSON.stringify(Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d]?.score])))}${repeatContext}

${evidenceLedger}

Return ONLY valid JSON (no markdown):
{
  "verdict": "2-3 sentence overall verdict. Lead with the #1 thing holding this video back and why it hurts performance. Mention one thing that is actually working. Compare to top ${nicheDetection.niche} creators specifically -name what they do differently.",
  "viralPotential": <number 0-100>,
  "nichePercentile": "One crisp sentence comparing this video to the niche average. Use the niche benchmark data. Example: 'This scores in the bottom third of ${nicheDetection.niche} creators on TikTok -the average ${nicheDetection.niche} account hits ${nicheInfo.avgEngagement} engagement, and this video's setup would land below that.' OR 'This is above-average for ${nicheDetection.niche} -most creators in this niche miss [specific thing you got right].' Be honest and specific.",
  "biggestBlocker": "One sentence naming the single biggest bottleneck.",
  "actionPlan": [
    {
      "priority": "P1",
      "dimension": "hook",
      "timestampLabel": "0:00-0:02",
      "timestampSeconds": 0,
      "issue": "what is wrong right now -be specific, not generic",
      "algorithmicConsequence": "what TikTok behavior this issue likely triggers -retention loss, weaker classification, fewer follows, etc.",
      "evidence": ["specific quote, timestamp, or agent finding from THIS video", "second specific proof point"],
      "doThis": "clear, high-level direction - what needs to change and why, not step-by-step tool instructions",
      "example": "a brief illustration of what a stronger version looks like - a concept, not a script",
      "whyItMatters": "why this fix changes retention, conversion, or distribution"
    }
  ],
  "encouragement": "One honest, specific encouraging sentence -name something real that's working, not generic praise."
}

Rules:
- The verdict, biggestBlocker, and P1 actionPlan item must describe the same core problem.
- If analysis mode is hook-first: P1 MUST be the hook. The verdict MUST explain that TikTok kills distribution in the first test batch (~200-500 people) when early swipes are high -so better CTA/captions/strategy cannot help if nobody reaches that part. Explicitly tell the creator that CTA polish and caption fixes are secondary until the opening is fixed.
- Do not introduce multiple headline problems. Pick one bottleneck and make the plan fix that first.
- Give exactly 3 actionPlan items ranked P1 to P3.
- P1 must be the highest-leverage fix, not just the lowest score.
- Every actionPlan item must include a usable timestampLabel and timestampSeconds pointing to the moment the creator should edit first. Use mm:ss or a short mm:ss-mm:ss range.
- Every actionPlan item must include algorithmicConsequence explaining the likely distribution or retention consequence if they leave it unfixed.
- When the hook is weak: P1 doThis should explain what is wrong with the current opening and what kind of hook would work better (reference the tier system). If transcript is available, identify the weak opener. Suggest the direction, not exact replacement words.
- Every actionPlan item must cite 1-3 specific evidence bullets drawn from the agent findings, transcript, or caption audit above. Do not use generic evidence like "the video needs work." Pull specific observations from the evidence ledger.
- Every doThis should make clear WHAT needs to improve and WHY it matters. The creator decides HOW to implement it.
- If the transcript gives you a quote of the opening line, USE IT in P1 evidence. That is the smoking gun.
- Keep the advice creator-grade, not beginner-blog-grade. Assume the creator has posted before and knows TikTok basics.
- nichePercentile must reference the actual niche avg engagement data provided above. Do not invent numbers.`
            }],
              });
              break;
            } catch (retryErr) {
              verdictLastError = retryErr;
              const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              const isRetryable = msg.includes('overloaded') || msg.includes('529') || msg.includes('rate') || msg.includes('timeout');
              if (!isRetryable || attempt === 3) break;
              console.warn(`[analyze] Verdict attempt ${attempt} failed (retryable): ${msg.slice(0, 200)}`);
              const baseDelay = 3000 * attempt;
              const jitter = Math.random() * 2000;
              await new Promise(r => setTimeout(r, baseDelay + jitter));
            }
          }
          if (!verdictResponse) {
            throw verdictLastError ?? new Error('Verdict generation returned no response');
          }

          const verdictText = verdictResponse.content[0].type === 'text' ? verdictResponse.content[0].text : '';
          const parsed = parseStrategicSummary(verdictText, lowestDim, fallbackActionPlan);
          if (parsed) {
            const safePlan = sanitizeActionPlan(parsed.actionPlan);
            verdict = sanitizeUserFacingText(parsed.verdict, 'The opening promise and execution still are not lining up.');
            viralPotential = parsed.viralPotential;
            nichePercentile = sanitizeUserFacingText(parsed.nichePercentile ?? '', '');
            biggestBlocker = sanitizeUserFacingText(parsed.biggestBlocker, safePlan[0]?.issue || 'The video still has one obvious bottleneck holding it back.');
            actionPlan = safePlan.length > 0 ? safePlan : sanitizeActionPlan(fallbackActionPlan);
            for (const item of actionPlan) {
              if (item.evidence) {
                const evidenceStr = Array.isArray(item.evidence) ? item.evidence.join(" ") : String(item.evidence);
                const tsMatch = evidenceStr.match(/(\d+\.?\d*)s[--](\d+\.?\d*)s/);
                if (tsMatch) {
                  item.timestampSeconds = parseFloat(tsMatch[1]);
                } else {
                  item.timestampLabel = null;
                }
              }
            }
            nextSteps = actionPlan.map((step) => `${step.priority}: ${step.doThis}`);
            encouragement = sanitizeUserFacingText(parsed.encouragement, 'There is something here, but the first fix needs to land harder.');
          } else {
            verdict = sanitizeUserFacingText(verdictText, 'Your video exists. That is the nicest thing we can say about it.');
            // Verdict JSON unparseable -still surface the fallback action plan
            actionPlan = sanitizeActionPlan(fallbackActionPlan);
            nextSteps = actionPlan.map((step) => `${step.priority}: ${step.doThis}`);
          }
          stageTimings.verdict_generation = Date.now() - verdictStart;
        } catch (verdictErr) {
          stageTimings.verdict_generation = stageTimings.verdict_generation ?? 0;
          logFailure('verdict', id, verdictErr);
          verdict = 'Analysis partially complete -see individual dimension scores below.';
          // Surface agent-derived action plan so the results page is not empty
          actionPlan = sanitizeActionPlan(fallbackActionPlan);
          nextSteps = actionPlan.map((step) => `${step.priority}: ${step.doThis}`);
        }

        // Build full result
        // Build hook identification from available data
        const openingFrames = frameAnalysisFrames.filter((f: FrameAnalysis) => f.zone === 'hook');
        const openingSlotTimestamps = new Set(openingFrames.map(f => f.timestampSec));
        const hookIdentification = {
          textOnScreen: onScreenTextResults.length > 0
            ? onScreenTextResults
                .filter(r => openingSlotTimestamps.size === 0 || openingSlotTimestamps.has(r.timestampSec))
                .flatMap(r => r.detectedText).join(' ').trim() || null
            : null,
          spokenWords: transcript?.segments?.filter(s => s.start <= 3)
            .map(s => s.text).join(' ').trim() || null,
          visualDescription: agentResults.hook?.findings?.[0] || 'Opening frame analysis unavailable',
        };

        const defaultAgentRows = DIMENSION_ORDER.map((dim) => {
          const existing = agentResults[dim];
          if (existing) return existing;
          return {
            score: -1,
            roastText: 'Skipped because the hook did not clear the threshold for broader analysis.',
            findings: ['Secondary analysis was intentionally suppressed until the hook improves.'],
            improvementTip: 'Fix the hook first, then rerun the analysis for downstream diagnostics.',
            scoreJustification: ['Skipped in hook-only mode.'],
            confidence: { level: 'low' as const, reason: 'This dimension was not analyzed because the hook failed the expansion gate.' },
            failed: true,
            failureReason: 'Skipped in hook-first mode because the hook needs work before downstream analysis matters.',
          } satisfies AgentResult;
        });

        const fixTracks = buildFixTracks(hookAnalysis);

        // Build view projection
        const viewProjectionInput: Pick<RoastResult, 'overallScore' | 'hookSummary' | 'agents' | 'metadata' | 'niche'> = {
          overallScore,
          hookSummary,
          agents: DIMENSION_ORDER.map((dim, index) => ({
            agent: dim,
            score: defaultAgentRows[index].score,
            failed: defaultAgentRows[index].failed,
            roastText: '', findings: [], improvementTip: '',
          })),
          metadata: { duration: 0, description: '' },
          niche: { detected: nicheDetection.niche, subNiche: nicheDetection.subNiche, confidence: nicheDetection.confidence },
        };
        const viewProjectionData = buildViewProjection(viewProjectionInput as RoastResult);

        const result: RoastResult = {
          id,
          tiktokUrl: (session as { video_url: string; filename?: string; tiktok_url?: string }).tiktok_url ?? '',
          overallScore,
          verdict,
          viralPotential,
          ...(nichePercentile ? { nichePercentile } : {}),
          biggestBlocker,
          nextSteps,
          actionPlan,
          encouragement,
          analysisMode,
          analysisExpansion,
          hookSummary,
          hookIdentification,
          ...(hookAnalysis ? { hookPredictions: hookAnalysis.predictions, fixTracks } : {}),
          ...(hookAnalysis ? { hookAnalysis } : {}),
          viewProjection: viewProjectionData,
          agents: DIMENSION_ORDER.map((dim, index) => ({
            agent: dim,
            score: defaultAgentRows[index].score,
            roastText: defaultAgentRows[index].roastText,
            findings: defaultAgentRows[index].findings,
            improvementTip: defaultAgentRows[index].improvementTip,
            scoreJustification: defaultAgentRows[index].scoreJustification,
            confidence: defaultAgentRows[index].confidence,
            ...(defaultAgentRows[index].failed ? { failed: true, failureReason: defaultAgentRows[index].failureReason } : {}),
            timestamp_seconds: AGENT_TIMESTAMPS[dim],
          })),
          niche: {
            detected: nicheDetection.niche,
            subNiche: nicheDetection.subNiche,
            confidence: nicheDetection.confidence,
          },
          ...(detectedSound ? { detectedSound } : {}),
          ...(shouldUseTranscriptEvidence && transcript?.text ? { audioTranscript: transcript.text } : {}),
          ...(shouldUseTranscriptEvidence && transcript?.segments?.length ? { audioSegments: transcript.segments } : {}),
          transcriptQuality,
          transcriptQualityNote,
          ...(transcript ? { transcriptConfidence: transcript.confidence, transcriptProvider: transcript.provider } : {}),
          metadata: {
            duration: videoDuration?.durationSeconds ?? 0,
            description: 'Uploaded video',
          },
        };
        const analysisCompletedAtMs = Date.now();
        const uploadStartedAtMs = uploadStartedAtIso ? new Date(uploadStartedAtIso).getTime() : null;
        const uploadToCompleteMs = uploadStartedAtMs && Number.isFinite(uploadStartedAtMs)
          ? Math.max(0, analysisCompletedAtMs - uploadStartedAtMs)
          : null;
        const adminAnalytics: AdminAnalyticsPayload | undefined = localhostDebug
          ? {
              host: requestHost,
              generatedAt: new Date(analysisCompletedAtMs).toISOString(),
              timing: {
                uploadStartedAt: uploadStartedAtIso,
                uploadStartSource: uploadStartedAtIso ? 'session_created_at' : 'analysis_start_fallback',
                analysisStartedAt: new Date(analysisStartedAtMs).toISOString(),
                analysisCompletedAt: new Date(analysisCompletedAtMs).toISOString(),
                analysisOnlyMs: Math.max(0, analysisCompletedAtMs - analysisStartedAtMs),
                uploadToCompleteMs,
                stagesMs: stageTimings,
              },
              media: {
                videoDurationSec: videoDuration?.durationSeconds ?? 0,
                frameCount: frameAnalysisFrames.length,
                frameCountsByZone: {
                  hook: frameAnalysisFrames.filter((frame) => frame.zone === 'hook').length,
                  transition: frameAnalysisFrames.filter((frame) => frame.zone === 'transition').length,
                  body: frameAnalysisFrames.filter((frame) => frame.zone === 'body').length,
                },
                sampledFrames: frameAnalysisFrames.map((frame) => ({
                  timestampSec: frame.timestampSec,
                  zone: frame.zone,
                  label: `${frame.zone} frame at ${frame.timestampSec.toFixed(1)}s`,
                })),
                frameMetadata: frameAnalysisFrames as unknown as Array<Record<string, unknown>>,
                onScreenTextResults,
              },
              transcript: {
                text: transcript?.text ?? null,
                segments: transcript?.segments ?? [],
                ...(transcript?.provider ? { provider: transcript.provider } : {}),
                confidence: transcript?.confidence ?? null,
                quality: transcriptQuality,
                qualityNote: transcriptQualityNote,
                usedInAnalysis: shouldUseTranscriptEvidence,
              },
              reasoning: {
                platform,
                analysisMode: analysisMode ?? 'balanced',
                analysisExpansion: analysisExpansion ?? 'hook_only',
                niche: {
                  detected: nicheDetection.niche,
                  subNiche: nicheDetection.subNiche,
                  confidence: nicheDetection.confidence,
                },
                ...(hookSummary ? { hookSummary } : {}),
                ...(baselineHookAnalysis ? { baselineHookAnalysis } : {}),
                ...(hookAnalysis ? { hookAnalysis } : {}),
                ...(fixTracks ? { fixTracks } : {}),
                ...(actionPlan ? { actionPlan } : {}),
                ...(biggestBlocker ? { biggestBlocker } : {}),
                ...(encouragement ? { encouragement } : {}),
                verdict,
                agentResults,
                captionQuality: captionQuality as Record<string, unknown> | null,
                audioCharacteristics: audioChars as unknown as Record<string, unknown>,
                durationAnalysis: durationAnalysis as Record<string, unknown> | null,
                ...(detectedSound ? { detectedSound } : {}),
                ...(viewProjectionData ? { viewProjection: viewProjectionData } : {}),
              },
            }
          : undefined;
        if (adminAnalytics) {
          result.adminAnalytics = adminAnalytics;
        }
        result.firstFiveSecondsDiagnosis = getFirstFiveSecondsDiagnosis(result);

        send({
          type: 'verdict',
          overallScore,
          verdict,
          viralPotential,
          ...(nichePercentile ? { nichePercentile } : {}),
          biggestBlocker,
          nextSteps,
          actionPlan,
          encouragement,
          analysisMode,
          analysisExpansion,
          hookSummary,
          ...(hookAnalysis ? { hookPredictions: hookAnalysis.predictions, fixTracks } : {}),
          ...(hookAnalysis ? { hookAnalysis } : {}),
          firstFiveSecondsDiagnosis: result.firstFiveSecondsDiagnosis,
          niche: { detected: nicheDetection.niche, subNiche: nicheDetection.subNiche, confidence: nicheDetection.confidence },
          ...(durationAnalysis ? {
            duration: {
              seconds: durationAnalysis.duration.durationSeconds,
              formatted: durationAnalysis.duration.durationFormatted,
              category: durationAnalysis.category,
              optimalRange: NICHE_CONTEXT[nicheDetection.niche].optimalLength,
            },
          } : {}),
        });

        // Update session in Supabase with results
        try {
          const saveStart = Date.now();
          const agentScores = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].score]));
          const findings = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].findings]));

          await supabaseServer.from('rmt_roast_sessions').update({
            overall_score: overallScore,
            verdict,
            agent_scores: agentScores,
            findings,
            result_json: result,
          }).eq('id', id);
          stageTimings.supabase_save = Date.now() - saveStart;
        } catch (err) {
          stageTimings.supabase_save = stageTimings.supabase_save ?? 0;
          logFailure('supabase-save', id, err);
        }

        send({ type: 'done', overallScore, id });
      } catch (err) {
        logFailure('agent', id, err, { stage: 'stream-outer' });
        try {
          await supabaseServer.from('rmt_roast_sessions').update({
            verdict: 'Analysis failed',
          }).eq('id', id);
        } catch (saveErr) {
          logFailure('supabase-save', id, saveErr, { status: 'failed' });
        }
        send({ type: 'error', message: 'Analysis failed. Please try again.' });
      } finally {
        // Clean up temp video and audio
        try {
          if (existsSync(videoPath)) unlinkSync(videoPath);
        } catch { /* ignore cleanup errors */ }
        if (audioPath) cleanupAudio(audioPath);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
