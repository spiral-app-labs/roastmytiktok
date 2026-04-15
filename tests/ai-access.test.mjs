import test from 'node:test';
import assert from 'node:assert/strict';

const {
  getAiEndpointRateLimit,
} = await import('../lib/ai-access.ts');

test('free plan AI endpoint limits stay tighter than paid plan limits', () => {
  const generateFree = getAiEndpointRateLimit('generate_script', 'free');
  const generatePaid = getAiEndpointRateLimit('generate_script', 'paid');
  const nicheFree = getAiEndpointRateLimit('niche_analyze', 'free');
  const nichePaid = getAiEndpointRateLimit('niche_analyze', 'paid');

  assert.equal(generateFree.windowSeconds, 24 * 60 * 60);
  assert.equal(nicheFree.windowSeconds, 24 * 60 * 60);
  assert.ok(generateFree.maxRequests < generatePaid.maxRequests);
  assert.ok(nicheFree.maxRequests < nichePaid.maxRequests);
});

test('niche analysis remains the strictest AI-cost endpoint on the free plan', () => {
  const generateFree = getAiEndpointRateLimit('generate_script', 'free');
  const improveFree = getAiEndpointRateLimit('improve_script', 'free');
  const nicheFree = getAiEndpointRateLimit('niche_analyze', 'free');

  assert.equal(generateFree.maxRequests, improveFree.maxRequests);
  assert.ok(nicheFree.maxRequests < generateFree.maxRequests);
});
