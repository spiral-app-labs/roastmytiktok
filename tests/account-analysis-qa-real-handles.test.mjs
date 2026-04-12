import test from 'node:test';
import assert from 'node:assert/strict';

const { detectNicheFallback } = await import('../lib/niche-detect.ts');
const { buildBenchmarkPromptSection } = await import('../lib/engagement-benchmarks.ts');

const REAL_HANDLE_SAMPLES = {
  alixearle: {
    caption: [
      'Can’t wait to see your guys post routine glowwwww clean healthy skin',
      'grwm for a night out and skincare reset',
      'dance off btwn the earle girls',
    ].join(' '),
    hashtags: ['grwm', 'skincare', 'glow'],
    expected: 'beauty',
  },
  'khaby.lame': {
    caption: [
      'Not a good morning #learnfromkhaby #comedy',
      'Let’s just use regular belt from now on #comedy',
      'I don’t think they gonna pick up #comedy #firefighter',
    ].join(' '),
    hashtags: ['learnfromkhaby', 'comedy', 'firefighter'],
    expected: 'comedy',
  },
  zachking: {
    caption: [
      'Adding two white lines can turn anything into 3D #trippy #cool #illusion',
      'CEO of Magic Munch Burgers here to eat lunch with you and try my new illusion burger',
      'Late again at least I have an iced coffee for the wait',
    ].join(' '),
    hashtags: ['trippy', 'cool', 'illusion', 'magic'],
    expectedNot: 'travel',
  },
};

test('keyword fallback keeps real-handle caption samples in sane niches without AI access', () => {
  const alix = detectNicheFallback({
    caption: REAL_HANDLE_SAMPLES.alixearle.caption,
    hashtags: REAL_HANDLE_SAMPLES.alixearle.hashtags,
  });
  assert.equal(alix.niche, REAL_HANDLE_SAMPLES.alixearle.expected);

  const khaby = detectNicheFallback({
    caption: REAL_HANDLE_SAMPLES['khaby.lame'].caption,
    hashtags: REAL_HANDLE_SAMPLES['khaby.lame'].hashtags,
  });
  assert.equal(khaby.niche, 'lifestyle');
  assert.equal(khaby.confidence, 'low');

  const zach = detectNicheFallback({
    caption: REAL_HANDLE_SAMPLES.zachking.caption,
    hashtags: REAL_HANDLE_SAMPLES.zachking.hashtags,
  });
  assert.notEqual(zach.niche, REAL_HANDLE_SAMPLES.zachking.expectedNot, 'trippy should not get misread as travel via "trip" substring');
});

test('benchmark prompt uses baseline median views and total interaction rate', () => {
  const prompt = buildBenchmarkPromptSection(undefined, [
    { view_count: 1000, like_count: 100, comment_count: 20, timestamp: 1_710_000_000 },
    { view_count: 2000, like_count: 120, comment_count: 30, timestamp: 1_710_086_400 },
    { view_count: 20000, like_count: 400, comment_count: 10, timestamp: 1_710_172_800 },
  ]);

  assert.match(prompt, /engagement rate: 3\.0% \(likes \+ comments per view\)/i);
  assert.match(prompt, /Median views \(true baseline per post\): 2,000/);
  assert.match(prompt, /Average views: 7,667 \(likely inflated by spikes\)/);
  assert.match(prompt, /You MUST treat median views as the creator's baseline and use average views only as outlier context\./);
});
