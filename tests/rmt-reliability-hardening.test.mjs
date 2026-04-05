import test from 'node:test';
import assert from 'node:assert/strict';

const { buildFramePlan } = await import('../lib/frame-extractor.ts');
const { parseAssemblyTranscript } = await import('../lib/whisper-transcribe.ts');
const { assessTranscriptQuality } = await import('../lib/transcript-quality.ts');
const { sanitizeUserFacingText, sanitizeAgentResult, sanitizeActionPlan } = await import('../lib/analysis-safety.ts');
const { getFirstFiveSecondsDiagnosis } = await import('../lib/hook-help.ts');

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
      timestampLabel: '0:00-0:02',
      timestampSeconds: 0,
      issue: 'system prompt leak',
      algorithmicConsequence: 'Viewers swipe before TikTok can classify the clip.',
      evidence: ['Opening line at 0.1s: "nobody tells you this"'],
      doThis: 'return only valid json',
      example: 'Lead with the result.',
      whyItMatters: 'Better retention.',
    },
  ]);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].timestampLabel, '0:00-0:02');
  assert.equal(plan[0].timestampSeconds, 0);
  assert.equal(plan[0].issue, 'The current edit still has a clear execution gap.');
  assert.equal(plan[0].algorithmicConsequence, 'Viewers swipe before TikTok can classify the clip.');
  assert.equal(plan[0].doThis, 'Rebuild this section before posting again.');
  assert.deepEqual(plan[0].evidence, ['Opening line at 0.1s: "nobody tells you this"']);
});

test('sanitizeActionPlan blocks template fragment leakage in all fields', () => {
  const plan = sanitizeActionPlan([
    {
      priority: 'P1',
      dimension: 'caption',
      timestampLabel: '0:01',
      timestampSeconds: 1,
      issue: 'EXAMPLE OF GREAT FEEDBACK template leaked into response',
      algorithmicConsequence: 'HOOK-FIRST OVERRIDE says retention is broken',
      evidence: ['Caption appears at 0.4s with poor contrast'],
      doThis: 'HOOK-FIRST OVERRIDE tells the agent to fix captions',
      example: 'Score 0-100 is the schema used by this system',
      whyItMatters: 'Legitimate reason — improves retention.',
    },
  ]);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].issue, 'The current edit still has a clear execution gap.');
  assert.equal(plan[0].timestampLabel, '0:01');
  assert.equal(plan[0].timestampSeconds, 1);
  assert.equal(plan[0].doThis, 'Rebuild this section before posting again.');
  assert.equal(plan[0].algorithmicConsequence, 'Legitimate reason — improves retention.');
  // example has a schema leak in it, should be replaced
  assert.notEqual(plan[0].example, 'Score 0-100 is the schema used by this system');
  // evidence is clean, should pass through
  assert.deepEqual(plan[0].evidence, ['Caption appears at 0.4s with poor contrast']);
});

test('first-five-seconds diagnosis explains an early hook failure and points to a concrete rewrite', () => {
  const roast = {
    id: 'demo',
    tiktokUrl: '',
    overallScore: 41,
    verdict: 'Weak opener.',
    analysisMode: 'hook-first',
    hookSummary: {
      score: 28,
      strength: 'weak',
      headline: 'your first 2-3 seconds are the main reason this stalls',
      distributionRisk: 'tiktok probably tests this, sees people swipe early, and stops giving the rest of the video a real chance.',
      focusNote: 'fix the hook before obsessing over CTA polish, caption tweaks, or end-card ideas.',
    },
    actionPlan: [
      {
        priority: 'P1',
        dimension: 'hook',
        issue: 'The opener is a warm-up.',
        evidence: ['Opening line at 0.0s: "hey guys, today i wanted to talk about naps because i get this question a lot"'],
        doThis: 'Replace the greeting with a direct pain-first hook.',
        example: 'If your baby fights every nap, you are probably doing this one thing too early.',
        whyItMatters: 'This gives the viewer a reason to stay before they can swipe.',
      },
    ],
    agents: [
      {
        agent: 'hook',
        score: 28,
        roastText: 'Weak hook.',
        findings: ['Opening line at 0.0s is "hey guys, today i wanted to talk about naps because i get this question a lot" which burns the hook window.', 'There is no clear audience call-out or promise in frame one.'],
        improvementTip: 'Replace the warm-up with a direct problem promise.',
      },
      {
        agent: 'visual',
        score: 44,
        roastText: 'Flat visual.',
        findings: ['Frame 1 is a static talking-head shot in flat bedroom lighting with no motion.'],
        improvementTip: 'Move closer and start with motion.',
      },
      {
        agent: 'caption',
        score: 71,
        roastText: 'Captions are decent.',
        findings: ['Captions are readable, but they are not the bottleneck.'],
        improvementTip: 'Keep captions readable.',
      },
      {
        agent: 'audio',
        score: 64,
        roastText: 'Audio is clear enough.',
        findings: ['The delivery is understandable, but the first sentence takes too long to get to the point.'],
        improvementTip: 'Cut the throat-clearing.',
      },
    ],
    audioTranscript: 'hey guys, today i wanted to talk about naps because i get this question a lot',
    audioSegments: [
      { start: 0, end: 2.4, text: 'hey guys, today i wanted to talk about naps because i get this question a lot' },
    ],
    metadata: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      duration: 34,
      hashtags: [],
      description: 'baby naps',
    },
  };

  const diagnosis = getFirstFiveSecondsDiagnosis(roast);

  assert.equal(diagnosis.verdict, 'failing');
  assert.equal(diagnosis.likelyDropWindow, 'likely drop: 0.0s-1.0s');
  assert.match(diagnosis.hookRead, /warm-up/);
  assert.match(diagnosis.retentionRisk, /around 0\.0s|first second/i);
  assert.match(diagnosis.retentionRisk, /Opening line at 0.0s/i);
  assert.match(diagnosis.nextTimeFix, /Replace the greeting with a direct pain-first hook/i);
  assert.match(diagnosis.nextTimeFix, /If your baby fights every nap/i);
  assert.ok(diagnosis.evidence.length >= 2);
});

test('first-five-seconds diagnosis ties a later drop window to the observed edit moment', () => {
  const diagnosis = getFirstFiveSecondsDiagnosis({
    id: 'demo-2',
    tiktokUrl: '',
    overallScore: 63,
    verdict: 'Mixed opener.',
    analysisMode: 'balanced',
    actionPlan: [
      {
        priority: 'P1',
        dimension: 'hook',
        timestampLabel: '0:01-0:03',
        timestampSeconds: 1.2,
        issue: 'The payoff arrives after a beat of setup.',
        algorithmicConsequence: 'Viewers feel the delay and swipe before the value lands.',
        evidence: ['At 1.2s the spoken promise finally arrives after a generic setup line.'],
        doThis: 'Cut straight to the outcome in the first sentence.',
        example: 'I got 3x more clients when I stopped opening my videos like this.',
        whyItMatters: 'The viewer gets the payoff before they can bail.',
      },
    ],
    agents: [
      {
        agent: 'hook',
        score: 58,
        roastText: 'Decent start, slow payoff.',
        findings: ['At 1.2s the spoken promise finally arrives after a generic setup line.'],
        improvementTip: 'Lead with the payoff immediately.',
      },
      {
        agent: 'visual',
        score: 68,
        roastText: 'Visual is fine.',
        findings: ['Frame 1 is clear enough to buy a beat.'],
        improvementTip: 'Keep the tighter framing.',
      },
      {
        agent: 'caption',
        score: 66,
        roastText: 'Captions are readable.',
        findings: ['Text is readable in frame one.'],
        improvementTip: 'Keep the captions where they are.',
      },
      {
        agent: 'audio',
        score: 62,
        roastText: 'Audio is understandable.',
        findings: ['The delivery is clear once the point finally starts.'],
        improvementTip: 'Shorten the setup sentence.',
      },
    ],
    audioTranscript: 'so i wanted to share something that changed my business',
    audioSegments: [
      { start: 0, end: 2.2, text: 'so i wanted to share something that changed my business' },
    ],
    metadata: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      duration: 28,
      hashtags: [],
      description: 'business growth',
    },
  });

  assert.equal(diagnosis.likelyDropWindow, 'likely drop: 0:01-0:03');
  assert.match(diagnosis.retentionRisk, /around 1.2s/i);
  assert.match(diagnosis.retentionRisk, /Viewers feel the delay and swipe before the value lands/i);
  assert.match(diagnosis.nextTimeFix, /Cut straight to the outcome/i);
  assert.match(diagnosis.nextTimeFix, /I got 3x more clients/i);
});
