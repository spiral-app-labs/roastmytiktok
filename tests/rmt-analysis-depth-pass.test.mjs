import test from 'node:test';
import assert from 'node:assert/strict';

const { buildPriorityDiagnosis, buildEvidenceLedger, buildFallbackActionPlan } = await import('../lib/action-plan.ts');

test('buildPriorityDiagnosis makes hook the source-of-truth bottleneck in hook-first mode', () => {
  const diagnosis = buildPriorityDiagnosis({
    agentResults: {
      hook: {
        score: 38,
        roastText: 'The intro is a soft warm-up.',
        findings: ['The first spoken line is generic and does not promise a payoff.'],
        improvementTip: 'Open with a direct pain-point claim.',
      },
      visual: {
        score: 49,
        roastText: 'Frame one is static.',
        findings: ['Frame one is static and does not add urgency on mute.'],
        improvementTip: 'Start tighter and with movement.',
      },
      caption: {
        score: 74,
        roastText: 'Captions are readable.',
        findings: ['Captions are readable once the video gets going.'],
        improvementTip: 'Keep the opening text shorter.',
      },
      audio: {
        score: 58,
        roastText: 'Audio is understandable.',
        findings: ['The delivery takes too long to land the main point.'],
        improvementTip: 'Cut the throat-clearing phrase.',
      },
    },
    transcriptSegments: [
      { start: 0, end: 1.6, text: 'hey guys, today i wanted to talk about naps because i get this question a lot' },
    ],
    analysisMode: 'hook-first',
  });

  assert.equal(diagnosis.primaryDimension, 'hook');
  assert.match(diagnosis.evidence[0], /Opening line at 0.0s/);
  assert.ok(diagnosis.support.some((item) => item.includes('visual support')));
  assert.match(diagnosis.deprioritizeNote, /late CTA|polish work/i);
});

test('buildFallbackActionPlan uses priority diagnosis to make P1 evidence-backed and explicitly prioritized', () => {
  const plan = buildFallbackActionPlan({
    agentResults: {
      hook: {
        score: 38,
        roastText: 'The intro is a soft warm-up.',
        findings: ['The first spoken line is generic and does not promise a payoff.'],
        improvementTip: 'if your baby fights every nap, you are probably doing this one thing too early.',
      },
      visual: {
        score: 49,
        roastText: 'Frame one is static.',
        findings: ['Frame one is static and does not add urgency on mute.'],
        improvementTip: 'Start tighter and with movement.',
      },
      caption: {
        score: 74,
        roastText: 'Captions are readable.',
        findings: ['Captions are readable once the video gets going.'],
        improvementTip: 'Keep the opening text shorter.',
      },
      audio: {
        score: 58,
        roastText: 'Audio is understandable.',
        findings: ['The delivery takes too long to land the main point.'],
        improvementTip: 'Cut the throat-clearing phrase.',
      },
    },
    transcriptSegments: [
      { start: 0, end: 1.6, text: 'hey guys, today i wanted to talk about naps because i get this question a lot' },
    ],
    priorityDimensions: ['hook', 'visual', 'audio'],
    analysisMode: 'hook-first',
  });

  assert.equal(plan[0].dimension, 'hook');
  assert.equal(plan[0].priority, 'P1');
  assert.ok(plan[0].evidence.some((item) => item.includes('Opening line at 0.0s')));
  assert.ok(plan[0].evidence.some((item) => /support/i.test(item)));
  assert.match(plan[0].whyItMatters, /Do not spend your first fix/);
  assert.match(plan[0].doThis, /replace "hey guys/i);
});

test('buildEvidenceLedger now includes a priority diagnosis section with why-now guidance', () => {
  const ledger = buildEvidenceLedger({
    agentResults: {
      hook: {
        score: 38,
        roastText: 'The intro is a soft warm-up.',
        findings: ['The first spoken line is generic and does not promise a payoff.'],
        improvementTip: 'Open with a direct pain-point claim.',
      },
      visual: {
        score: 49,
        roastText: 'Frame one is static.',
        findings: ['Frame one is static and does not add urgency on mute.'],
        improvementTip: 'Start tighter and with movement.',
      },
      caption: {
        score: 74,
        roastText: 'Captions are readable.',
        findings: ['Captions are readable once the video gets going.'],
        improvementTip: 'Keep the opening text shorter.',
      },
      audio: {
        score: 58,
        roastText: 'Audio is understandable.',
        findings: ['The delivery takes too long to land the main point.'],
        improvementTip: 'Cut the throat-clearing phrase.',
      },
    },
    transcriptSegments: [
      { start: 0, end: 1.6, text: 'hey guys, today i wanted to talk about naps because i get this question a lot' },
    ],
    nicheLabel: 'parenting',
    analysisMode: 'hook-first',
  });

  assert.match(ledger, /Priority diagnosis:/);
  assert.match(ledger, /Because:/i);
  assert.match(ledger, /What to deprioritize for now:/i);
  assert.match(ledger, /Opening line at 0.0s/);
});
