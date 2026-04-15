import test from 'node:test';
import assert from 'node:assert/strict';

const {
  SCRAPE_TRENDS_SECRET_HEADER,
  SCRAPE_TRENDS_RATE_LIMIT,
  consumeScrapeTriggerRateLimit,
  getScrapeTriggerClientIp,
  getScrapeTriggerRateLimitKey,
  resetScrapeTriggerRateLimitStore,
  resolveScrapeTriggerOperator,
} = await import('../lib/admin-scrape-trigger.ts');

test.beforeEach(() => {
  resetScrapeTriggerRateLimitStore();
  delete process.env.ADMIN_SCRAPE_TRENDS_SECRET;
});

test.after(() => {
  delete process.env.ADMIN_SCRAPE_TRENDS_SECRET;
});

test('public callers are rejected unless they present an explicit trusted operator path', () => {
  const headers = new Headers();

  assert.equal(resolveScrapeTriggerOperator({ headers }), null);

  process.env.ADMIN_SCRAPE_TRENDS_SECRET = 'top-secret';
  headers.set(SCRAPE_TRENDS_SECRET_HEADER, 'top-secret');

  assert.deepEqual(resolveScrapeTriggerOperator({ headers }), {
    type: 'secret',
    id: 'shared-secret',
  });
});

test('authenticated admin email is accepted when no shared secret is supplied', () => {
  const operator = resolveScrapeTriggerOperator({
    headers: new Headers(),
    adminUserEmail: 'Ethan@SpiralAppLabs.com',
  });

  assert.deepEqual(operator, {
    type: 'admin',
    id: 'ethan@spiralapplabs.com',
  });
});

test('scrape trigger rate limiting is isolated per trusted operator and client ip', () => {
  const adminHeaders = new Headers({
    'x-forwarded-for': '203.0.113.9',
  });
  const secretHeaders = new Headers({
    'x-forwarded-for': '203.0.113.9',
  });

  const adminKey = getScrapeTriggerRateLimitKey(adminHeaders, {
    type: 'admin',
    id: 'ethan@spiralapplabs.com',
  });
  const secretKey = getScrapeTriggerRateLimitKey(secretHeaders, {
    type: 'secret',
    id: 'shared-secret',
  });

  for (let index = 0; index < SCRAPE_TRENDS_RATE_LIMIT.maxRequests; index += 1) {
    const result = consumeScrapeTriggerRateLimit(adminKey, 1_000);
    assert.equal(result.limited, false);
  }

  const limited = consumeScrapeTriggerRateLimit(adminKey, 1_000);
  assert.equal(limited.limited, true);
  assert.equal(limited.remaining, 0);

  const separateOperator = consumeScrapeTriggerRateLimit(secretKey, 1_000);
  assert.equal(separateOperator.limited, false);
});

test('client ip normalization prefers forwarded headers and strips ports', () => {
  const headers = new Headers({
    'x-vercel-forwarded-for': '198.51.100.12:443, 198.51.100.13',
  });

  assert.equal(getScrapeTriggerClientIp(headers), '198.51.100.12');
});
