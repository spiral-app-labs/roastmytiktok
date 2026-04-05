import test from 'node:test';
import assert from 'node:assert/strict';

const { buildFramePlan } = await import('../lib/frame-extractor.ts');
const { parseAssemblyTranscript } = await import('../lib/whisper-transcribe.ts');
const { assessTranscriptQuality } = await import('../lib/transcript-quality.ts');
const { sanitizeUserFacingText, sanitizeAgentResult, sanitizeActionPlan } = await import('../lib/analysis-safety.ts');

// ─── Requirement 1 & 2: Frame-by-frame analysis + text hook detection ──────────

test('buildFramePlan front-loads opening samples for hook detection', () => {
  const frames = buildFramePlan(12, 8);
  const openingFrames = frames.filter((frame) => frame.slot === 'opening');
  assert.ok(openingFrames.length >= 4, `Expected ≥4 opening frames, got ${openingFrames.length}`);
  assert.ok(openingFrames.every((frame) => frame.timestampSec <= 4), 'All opening frames should be within 4s');
  assert.equal(frames[0].slot, 'opening');
  assert.match(frames[0].label, /Opening frame|First-frame anchor/);
});

test('buildFramePlan includes a guaranteed sub-0.1s first-frame anchor for text-hook detection', () => {
  const frames = buildFramePlan(12, 8);
  const firstFrame = frames[0];
  // The first-frame anchor must be ≤0.05s to capture title cards before any other sampling
  assert.ok(firstFrame.timestampSec <= 0.05, `First frame should be ≤0.05s, got ${firstFrame.timestampSec}s`);
  assert.match(firstFrame.label, /First-frame anchor|first-frame/i);
});

test('new frame plan catches a short opening text hook that evenly spaced sampling misses', () => {
  const oldPlan = Array.from({ length: 8 }, (_, index) => Number(((12 / 9) * (index + 1)).toFixed(2)));
  const newPlan = buildFramePlan(12, 8).map((frame) => frame.timestampSec);
  const hookWindow = { start: 0.01, end: 0.08 };
  const hitsWindow = (timestamp) => timestamp >= hookWindow.start && timestamp <= hookWindow.end;

  // Old even-spacing misses the first-frame text hook window
  assert.equal(oldPlan.some(hitsWindow), false, 'Old plan should NOT hit early text-hook window');
  // New plan with first-frame anchor always hits it
  assert.equal(newPlan.some(hitsWindow), true, 'New plan MUST hit early text-hook window via first-frame anchor');
});

test('buildFramePlan still captures enough story frames for full-video analysis', () => {
  const frames = buildFramePlan(30, 8);
  const storyFrames = frames.filter((frame) => frame.slot === 'story');
  // With the first-frame anchor, story count is reduced by 1 vs before — must still be ≥2
  assert.ok(storyFrames.length >= 2, `Expected ≥2 story frames, got ${storyFrames.length}`);
  // All frames should be sorted ascending
  for (let i = 1; i < frames.length; i++) {
    assert.ok(frames[i].timestampSec > frames[i - 1].timestampSec, 'Frames should be sorted ascending');
  }
});

test('buildFramePlan handles very short videos without crashing', () => {
  const frames = buildFramePlan(3, 8);
  assert.ok(frames.length >= 3, 'Short video should still produce ≥3 frames');
  assert.ok(frames[0].timestampSec >= 0.03, 'First frame should be at least 0.03s into the video');
  const sorted = frames.every((frame, index) => index === 0 || frame.timestampSec > frames[index - 1].timestampSec);
  assert.ok(sorted, 'Frames should be sorted ascending for short videos');
});

// ─── Requirement 3: Audio-hook analysis path ──────────────────────────────────

test('parseAssemblyTranscript uses utterances when available', () => {
  const transcript = parseAssemblyTranscript({
    text: 'stop scrolling right now',
    utterances: [
      { start: 120, end: 1040, text: 'stop scrolling right now' },
    ],
  });

  assert.ok(transcript);
  assert.equal(transcript.provider, 'assemblyai');
  assert.deepEqual(transcript.segments, [
    { start: 0.12, end: 1.04, text: 'stop scrolling right now' },
  ]);
});

test('parseAssemblyTranscript falls back to words when utterances is empty', () => {
  const transcript = parseAssemblyTranscript({
    text: 'hello world',
    utterances: [],
    words: [
      { start: 0, end: 500, text: 'hello' },
      { start: 600, end: 1100, text: 'world' },
    ],
  });

  assert.ok(transcript);
  assert.equal(transcript.provider, 'assemblyai');
  assert.equal(transcript.segments.length, 2);
  assert.equal(transcript.segments[0].text, 'hello');
});

test('parseAssemblyTranscript returns null when text and segments are both empty', () => {
  const result = parseAssemblyTranscript({ text: '', utterances: [] });
  assert.equal(result, null);
});

test('empty transcript cases are handled safely', () => {
  const assessment = assessTranscriptQuality(null, {
    hasSpeech: false,
    hasMusic: false,
    speechPercent: 0,
  });

  assert.equal(assessment.quality, 'unavailable');
  assert.equal(assessment.shouldUseTranscriptEvidence, false);
  assert.match(assessment.note, /falling back to waveform-only audio analysis/i);
});

test('music-heavy clips degrade gracefully instead of poisoning downstream diagnosis', () => {
  const assessment = assessTranscriptQuality({
    text: 'yeah yeah yeah',
    segments: [{ start: 0, end: 0.8, text: 'yeah yeah yeah' }],
    provider: 'assemblyai',
    confidence: 0.74,
  }, {
    hasSpeech: false,
    hasMusic: true,
    speechPercent: 12,
  });

  assert.equal(assessment.quality, 'degraded');
  assert.equal(assessment.shouldUseTranscriptEvidence, false);
  assert.equal(assessment.transcript?.confidence, 0.2);
  assert.match(assessment.note, /withheld from the diagnosis|music-heavy or speech-light/i);
});

test('speech-light partial transcripts stay honest even when text exists', () => {
  const assessment = assessTranscriptQuality({
    text: 'quick tip',
    segments: [{ start: 0, end: 0.6, text: 'quick tip' }],
    provider: 'whisper',
    confidence: 0.82,
  }, {
    hasSpeech: true,
    hasMusic: true,
    speechPercent: 18,
  });

  assert.equal(assessment.quality, 'degraded');
  assert.equal(assessment.shouldUseTranscriptEvidence, false);
  assert.equal(assessment.transcript?.confidence, 0.35);
  assert.match(assessment.note, /music-heavy or speech-light/i);
});

test('strong spoken transcripts remain usable for quoted evidence', () => {
  const assessment = assessTranscriptQuality({
    text: 'stop scrolling if you are posting on tiktok and still getting stuck under two hundred views',
    segments: [
      { start: 0, end: 2.2, text: 'stop scrolling if you are posting on tiktok' },
      { start: 2.3, end: 4.7, text: 'and still getting stuck under two hundred views' },
    ],
    provider: 'assemblyai',
    confidence: 0.77,
  }, {
    hasSpeech: true,
    hasMusic: false,
    speechPercent: 81,
  });

  assert.equal(assessment.quality, 'usable');
  assert.equal(assessment.shouldUseTranscriptEvidence, true);
  assert.equal(assessment.transcript?.confidence, 0.77);
});

// ─── Requirement 4: Prompt / system details cannot leak into user-visible output ─

test('sanitizeUserFacingText blocks basic system prompt leakage', () => {
  const safe = sanitizeUserFacingText('here is the fix', 'fallback');
  const leaked = sanitizeUserFacingText('Per the system prompt, return only valid JSON.', 'fallback');

  assert.equal(safe, 'here is the fix');
  assert.equal(leaked, 'fallback');
});

test('sanitizeUserFacingText blocks agent prompt template fragments', () => {
  const cases = [
    'Score 0-100. Return ONLY valid JSON',
    'Return ONLY valid JSON (no markdown)',
    'NOT YOUR JOB (stay in this lane)',
    'EXAMPLE OF GREAT FEEDBACK — Study these examples.',
    'HOOK-FIRST OVERRIDE — READ THIS BEFORE WRITING ANYTHING ELSE',
    'TONE — THIS IS MANDATORY',
    'roastText: "your video is broken"',
    'claude-sonnet-4-6 is the model used',
    'max_tokens: 1024 configuration',
  ];

  for (const leaked of cases) {
    const result = sanitizeUserFacingText(leaked, 'fallback');
    assert.equal(result, 'fallback', `Expected "${leaked}" to be blocked but it was ALLOWED`);
  }
});

test('sanitizeUserFacingText allows legitimate creator-facing feedback', () => {
  const safe = [
    'Your hook is weak — try opening with a direct question.',
    'Add burned-in captions to reach the 80% of viewers watching sound-off.',
    'The lighting on your left side is underlit — face the window or add a ring light.',
    'Your hashtag strategy needs work: drop #fyp and add #mealprep.',
  ];

  for (const text of safe) {
    const result = sanitizeUserFacingText(text, 'fallback');
    assert.equal(result, text, `Expected "${text.slice(0, 50)}..." to be ALLOWED but it was blocked`);
  }
});

test('sanitizeAgentResult replaces leaked instructions with safe fallbacks', () => {
  const result = sanitizeAgentResult({
    score: 92,
    roastText: 'developer instructions: stay in your lane',
    findings: ['return only valid JSON', 'Opening line at 0.0s: "stop scrolling"'],
    improvementTip: 'system prompt says do not mention captions',
  }, 'hook');

  assert.equal(result.roastText, 'The opening still is not earning the stop fast enough.');
  assert.deepEqual(result.findings, ['Opening line at 0.0s: "stop scrolling"']);
  assert.equal(result.improvementTip, 'Lead with the clearest claim, result, or text hook in the first second.');
});

test('sanitizeActionPlan strips leaked text but keeps evidence-backed steps', () => {
  const plan = sanitizeActionPlan([
    {
      priority: 'P1',
      dimension: 'hook',
      issue: 'system prompt leak',
      evidence: ['Opening line at 0.1s: "nobody tells you this"'],
      doThis: 'return only valid json',
      example: 'Lead with the result.',
      whyItMatters: 'Better retention.',
    },
  ]);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].issue, 'The current edit still has a clear execution gap.');
  assert.equal(plan[0].doThis, 'Rebuild this section before posting again.');
  assert.deepEqual(plan[0].evidence, ['Opening line at 0.1s: "nobody tells you this"']);
});

test('sanitizeActionPlan blocks template fragment leakage in all fields', () => {
  const plan = sanitizeActionPlan([
    {
      priority: 'P1',
      dimension: 'caption',
      issue: 'EXAMPLE OF GREAT FEEDBACK template leaked into response',
      evidence: ['Caption appears at 0.4s with poor contrast'],
      doThis: 'HOOK-FIRST OVERRIDE tells the agent to fix captions',
      example: 'Score 0-100 is the schema used by this system',
      whyItMatters: 'Legitimate reason — improves retention.',
    },
  ]);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].issue, 'The current edit still has a clear execution gap.');
  assert.equal(plan[0].doThis, 'Rebuild this section before posting again.');
  // example has a schema leak in it, should be replaced
  assert.notEqual(plan[0].example, 'Score 0-100 is the schema used by this system');
  // evidence is clean, should pass through
  assert.deepEqual(plan[0].evidence, ['Caption appears at 0.4s with poor contrast']);
});
