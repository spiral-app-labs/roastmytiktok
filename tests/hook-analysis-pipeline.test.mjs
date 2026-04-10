import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildHookAnalysisPrompt,
  deriveHookAnalysis,
  parseHookAnalysisResponse,
} = await import('../lib/hook-analysis.ts');

const openingFrames = [
  {
    timestampSec: 0.05,
    zone: 'hook',
    sceneDescription: 'Creator faces the camera in a bright kitchen while holding up a finished meal container.',
    setting: 'kitchen',
    settingType: 'indoor',
    peopleCount: 1,
    facialExpressions: ['confident'],
    eyeContact: true,
    bodyLanguage: 'holding up container',
    framing: 'close-up',
    faceFillPercent: 42,
    lightingQuality: 'good',
    lightingDirection: 'front window light',
    lightingIssues: [],
    lightingTemperature: 'neutral',
    colorSaturation: 'normal',
    colorTemperature: 'neutral',
    colorGrade: 'clean/natural',
    dominantColors: ['white', 'green'],
    textOnScreen: ['STOP WASTING GROCERIES'],
    textPosition: 'top',
    textReadable: true,
    textContrast: 'high',
    captionsPresent: false,
    captionStyle: null,
    captionReadable: false,
    captionInSafeZone: false,
    backgroundDescription: 'clean kitchen counter',
    backgroundClutter: 'clean',
    distractingElements: [],
    cameraAngle: 'eye level',
    cameraWork: 'static tripod',
    compositionQuality: 'strong',
    compositionNotes: 'subject centered tightly',
    motionType: 'minimal movement',
    sceneChanged: false,
    hasWatermark: false,
    hasBrandElements: false,
    productionTier: 'casual',
    visualEnergy: 'medium',
  },
  {
    timestampSec: 0.72,
    zone: 'hook',
    sceneDescription: 'Quick cut to a tighter close-up of the meal container.',
    setting: 'kitchen',
    settingType: 'indoor',
    peopleCount: 1,
    facialExpressions: ['confident'],
    eyeContact: true,
    bodyLanguage: 'leans into camera',
    framing: 'close-up',
    faceFillPercent: 48,
    lightingQuality: 'good',
    lightingDirection: 'front window light',
    lightingIssues: [],
    lightingTemperature: 'neutral',
    colorSaturation: 'normal',
    colorTemperature: 'neutral',
    colorGrade: 'clean/natural',
    dominantColors: ['white', 'green'],
    textOnScreen: ['STOP WASTING GROCERIES'],
    textPosition: 'top',
    textReadable: true,
    textContrast: 'high',
    captionsPresent: false,
    captionStyle: null,
    captionReadable: false,
    captionInSafeZone: false,
    backgroundDescription: 'clean kitchen counter',
    backgroundClutter: 'clean',
    distractingElements: [],
    cameraAngle: 'eye level',
    cameraWork: 'static tripod',
    compositionQuality: 'strong',
    compositionNotes: 'subject centered tightly',
    motionType: 'scene cut',
    sceneChanged: true,
    hasWatermark: false,
    hasBrandElements: false,
    productionTier: 'casual',
    visualEnergy: 'high',
  },
];

const transcript = {
  text: 'stop wasting groceries with this one prep rule',
  segments: [{ start: 0.1, end: 1.6, text: 'stop wasting groceries with this one prep rule' }],
  provider: 'whisper',
  confidence: 0.84,
};

test('deriveHookAnalysis returns a richer hook-first report with scores and probabilities', () => {
  const analysis = deriveHookAnalysis({
    openingFrames,
    transcript,
    shouldUseTranscriptEvidence: true,
    audioChars: {
      hasSpeech: true,
      hasMusic: true,
      speechPercent: 74,
      pacingHint: 'fast',
      meanVolumeDB: -17,
      maxVolumeDB: -2.1,
      silenceGapCount: 2,
      durationSec: 5,
    },
  });

  assert.equal(analysis.windowSec, 6);
  assert.ok(analysis.observed.ocr.length >= 1);
  assert.ok(analysis.scores.hookScore > 0);
  assert.ok(analysis.predictions.pStay3s >= 0 && analysis.predictions.pStay3s <= 1);
  assert.ok(analysis.predictions.pStay5s >= 0 && analysis.predictions.pStay5s <= 1);
  assert.ok(analysis.editFixes.length >= 1);
  assert.ok(analysis.replacementHooks.length >= 1);
});

test('buildHookAnalysisPrompt includes the baseline hook report and strict JSON shape', () => {
  const prompt = buildHookAnalysisPrompt({
    platform: 'tiktok',
    openingFrames,
    hookZoneSummary: 'The opening starts with a tight close-up, readable text, and a clear prop payoff.',
    transcript,
    shouldUseTranscriptEvidence: true,
    audioChars: {
      hasSpeech: true,
      hasMusic: true,
      speechPercent: 74,
      pacingHint: 'fast',
      meanVolumeDB: -17,
      maxVolumeDB: -2.1,
      silenceGapCount: 2,
      durationSec: 5,
    },
    transcriptQualityNote: 'Transcript is reliable.',
    detectedSoundNote: 'original kitchen ambience',
  });

  assert.match(prompt, /HOOK_AUDIT_JSON_V2/);
  assert.match(prompt, /silent-first reasoning/i);
  assert.match(prompt, /replacementHooks/);
  assert.match(prompt, /STOP WASTING GROCERIES/);
  assert.match(prompt, /pStay3s/);
});

test('parseHookAnalysisResponse merges model refinements onto a deterministic fallback', () => {
  const fallback = deriveHookAnalysis({
    openingFrames,
    transcript,
    shouldUseTranscriptEvidence: true,
    audioChars: {
      hasSpeech: true,
      hasMusic: true,
      speechPercent: 74,
      pacingHint: 'fast',
      meanVolumeDB: -17,
      maxVolumeDB: -2.1,
      silenceGapCount: 2,
      durationSec: 5,
    },
  });

  const parsed = parseHookAnalysisResponse(`{
    "summary": "The opener is clear early, but a stronger first cut would make it hit harder.",
    "observed": { "visual": "A creator opens on a readable promise and food proof in frame one." },
    "labels": {
      "mechanisms": ["problem_callout", "pattern_interrupt"],
      "primaryFail": "visual_monotony"
    },
    "editFixes": [
      {
        "impact": "high",
        "do": "At 0:00 cut straight to the tight product close-up before any setup frame.",
        "why": "That makes the proof visual land before the swipe decision."
      }
    ],
    "reshootPlan": {
      "firstShot": "Open on the finished meal in a tight crop.",
      "first5sScript": "Say the payoff immediately while the proof is visible.",
      "shotBeats": ["0.0-0.8s proof shot", "0.8-3.0s direct promise", "3.0-5.0s preview the next beat"],
      "lighting": "Keep the subject facing the window."
    },
    "replacementHooks": [
      {
        "hook": "Stop wasting groceries with this fix.",
        "shot": "Open tight on the meal prep result.",
        "overlay": "STOP WASTING FOOD @ 0.0-1.0s"
      }
    ],
    "dimensions": {
      "visual": { "score": 8, "justification": "The proof is visible, but a faster cut would sharpen the stop power." },
      "audio": { "score": 7, "justification": "The line lands quickly enough to help the hook." },
      "narrative": { "score": 8, "justification": "The payoff is clear in the first second." }
    }
  }`, fallback);

  assert.equal(parsed.labels.primaryFail, 'visual_monotony');
  assert.equal(parsed.editFixes[0].impact, 'high');
  assert.equal(parsed.replacementHooks[0].hook, 'Stop wasting groceries with this fix.');
  assert.equal(parsed.dimensions?.visual.score, 8);
  assert.ok(parsed.topFixes?.[0].includes('0:00'));
});
