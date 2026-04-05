import test from 'node:test';
import assert from 'node:assert/strict';

const { buildCreatorDeltaContext, buildCreatorDeltaPromptSection } = await import('../lib/creator-delta-analysis.ts');

const videos = [
  { id: '1', title: 'winner 1', description: 'direct address tutorial', view_count: 50000, like_count: 4000, comment_count: 220, duration: 28, timestamp: 1712000000 },
  { id: '2', title: 'winner 2', description: 'problem solution walkthrough', view_count: 28000, like_count: 2100, comment_count: 110, duration: 31, timestamp: 1712100000 },
  { id: '3', title: 'mid 1', description: 'solid explainer', view_count: 12000, like_count: 900, comment_count: 44, duration: 35, timestamp: 1712200000 },
  { id: '4', title: 'mid 2', description: 'okay post', view_count: 8000, like_count: 600, comment_count: 30, duration: 40, timestamp: 1712300000 },
  { id: '5', title: 'loser 1', description: 'slow intro vlog', view_count: 600, like_count: 35, comment_count: 2, duration: 52, timestamp: 1712400000 },
  { id: '6', title: 'loser 2', description: 'generic update', view_count: 900, like_count: 48, comment_count: 3, duration: 47, timestamp: 1712500000 },
];

test('buildCreatorDeltaContext isolates winner and loser clusters without overlap', () => {
  const context = buildCreatorDeltaContext(videos);

  assert.ok(context);
  assert.equal(context.sampleSize, 2);
  assert.deepEqual(context.winners.map((video) => video.id), ['1', '2']);
  assert.deepEqual(context.losers.map((video) => video.id), ['5', '6']);
  assert.equal(context.exampleWinner.id, '1');
  assert.equal(context.exampleLoser.id, '5');
  assert.equal(context.winnerAvgViews, 39000);
  assert.equal(context.loserAvgViews, 750);
});

test('buildCreatorDeltaPromptSection includes the example comparison and grouped history', () => {
  const prompt = buildCreatorDeltaPromptSection(videos);

  assert.match(prompt, /TOP WINNER EXAMPLE: .*50,000 views/);
  assert.match(prompt, /TOP LOSER EXAMPLE: .*600 views/);
  assert.match(prompt, /WINNER CLUSTER:/);
  assert.match(prompt, /LOSER CLUSTER:/);
  assert.match(prompt, /Winner\/loser multiple: 52\.0x/);
});
