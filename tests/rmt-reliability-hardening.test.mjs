import test from 'node:test';
import assert from 'node:assert/strict';

const { buildFramePlan } = await import('../lib/frame-extractor.ts');
const { parseAssemblyTranscript } = await import('../lib/whisper-transcribe.ts');
const { sanitizeUserFacingText, sanitizeAgentResult, sanitizeActionPlan } = await import('../lib/analysis-safety.ts');

test('buildFramePlan front-loads opening samples for hook detection', () => {
  const frames = buildFramePlan(12, 8);
  assert.equal(frames.length, 8);
  const openingFrames = frames.filter((frame) => frame.slot === 'opening');
  assert.ok(openingFrames.length >= 4);
  assert.ok(openingFrames.every((frame) => frame.timestampSec <= 4));
  assert.equal(frames[0].slot, 'opening');
  assert.match(frames[0].label, /Opening frame/);
});

test('new frame plan catches a short opening text hook that evenly spaced sampling misses', () => {
  const oldPlan = Array.from({ length: 8 }, (_, index) => Number(((12 / 9) * (index + 1)).toFixed(2)));
  const newPlan = buildFramePlan(12, 8).map((frame) => frame.timestampSec);
  const hookWindow = { start: 0.1, end: 0.9 };
  const hitsWindow = (timestamp) => timestamp >= hookWindow.start && timestamp <= hookWindow.end;

  assert.equal(oldPlan.some(hitsWindow), false);
  assert.equal(newPlan.some(hitsWindow), true);
});

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

test('sanitizeUserFacingText blocks prompt leakage', () => {
  const safe = sanitizeUserFacingText('here is the fix', 'fallback');
  const leaked = sanitizeUserFacingText('Per the system prompt, return only valid JSON.', 'fallback');

  assert.equal(safe, 'here is the fix');
  assert.equal(leaked, 'fallback');
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
