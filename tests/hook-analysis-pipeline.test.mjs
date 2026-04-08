import test from 'node:test';
import assert from 'node:assert/strict';

const { buildHookAnalysisPrompt, parseHookAnalysisResponse } = await import('../lib/hook-analysis.ts');

test('buildHookAnalysisPrompt stays focused on the first 3-5 seconds and required dimensions', () => {
  const prompt = buildHookAnalysisPrompt({
    platform: 'tiktok',
    openingFrames: [
      {
        timestampSec: 0.1,
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
    ],
    hookZoneSummary: 'The opening starts with a tight close-up, readable text, and a clear prop payoff.',
    transcript: {
      text: 'stop wasting groceries with this one prep rule',
      segments: [{ start: 0.1, end: 1.6, text: 'stop wasting groceries with this one prep rule' }],
      provider: 'whisper',
      confidence: 0.84,
    },
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

  assert.match(prompt, /first 3-5 seconds/i);
  assert.match(prompt, /visual/i);
  assert.match(prompt, /audio/i);
  assert.match(prompt, /narrative/i);
  assert.match(prompt, /topFixes/i);
  assert.match(prompt, /STOP WASTING GROCERIES/);
  assert.match(prompt, /stop wasting groceries with this one prep rule/);
});

test('parseHookAnalysisResponse clamps scores and preserves specific fixes', () => {
  const parsed = parseHookAnalysisResponse(`{
    "visual": { "score": 11, "justification": "Frame one has a clear face, bold text, and a visible payoff." },
    "audio": { "score": 7, "justification": "The first line lands immediately and the music supports the mood instead of delaying it." },
    "narrative": { "score": 0, "justification": "The promise is clear, but the curiosity could still sharpen." },
    "overallScore": 12,
    "summary": "The opener is strong, but it can still tighten the narrative tension.",
    "topFixes": [
      "Swap the first spoken line for a sharper audience call-out that lands before 0:01.",
      "Cut from the static intro frame to a tighter close-up in frame one so the payoff is visible immediately.",
      "third extra fix should be dropped"
    ]
  }`);

  assert.equal(parsed.visual.score, 10);
  assert.equal(parsed.audio.score, 7);
  assert.equal(parsed.narrative.score, 1);
  assert.equal(parsed.overallScore, 10);
  assert.equal(parsed.topFixes.length, 2);
  assert.match(parsed.topFixes[0], /0:01|first spoken line/i);
  assert.match(parsed.topFixes[1], /frame one|close-up/i);
});

test('parseHookAnalysisResponse replaces vague or missing fixes with specific defaults', () => {
  const parsed = parseHookAnalysisResponse(`{
    "visual": { "score": 4, "justification": "The first frame looks flat and forgettable." },
    "audio": { "score": 3, "justification": "Nothing in the opening audio creates urgency." },
    "narrative": { "score": 4, "justification": "The setup explains the topic, but it does not create enough curiosity." },
    "overallScore": 4,
    "summary": "The opener needs more stop power.",
    "topFixes": ["Improve lighting", "Make it more engaging"]
  }`);

  assert.equal(parsed.topFixes.length, 2);
  assert.match(parsed.topFixes[0], /first second|opening line/i);
  assert.match(parsed.topFixes[1], /frame one|text overlay|tighter shot/i);
});
