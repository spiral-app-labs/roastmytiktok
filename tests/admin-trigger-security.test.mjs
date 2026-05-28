import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ADMIN_SCRAPE_TRENDS_SECRET_HEADER,
  ADMIN_SCRAPE_TRENDS_RATE_LIMIT,
  consumeAdminTriggerRateLimit,
  getAdminTriggerClientIp,
  getAdminTriggerRateLimitKey,
  resetAdminTriggerRateLimitStore,
  resolveAdminScrapeTriggerOperator,
} = await import('../lib/admin-trigger-security.ts');

test.beforeEach(() => {
  resetAdminTriggerRateLimitStore();
  delete process.env.ADMIN_SCRAPE_TRENDS_SECRET;
});

test.after(() => {
  delete process.env.ADMIN_SCRAPE_TRENDS_SECRET;
});

test('public callers are rejected unless they present a trusted operator path', () => {
  const headers = new Headers();

  assert.equal(resolveAdminScrapeTriggerOperator({ headers }), null);

  process.env.ADMIN_SCRAPE_TRENDS_SECRET = 'top-secret';
  headers.set(ADMIN_SCRAPE_TRENDS_SECRET_HEADER, 'top-secret');

  assert.deepEqual(resolveAdminScrapeTriggerOperator({ headers }), {
    type: 'secret',
    id: 'shared-secret',
  });
});

test('authenticated admin email is accepted when no shared secret is supplied', () => {
  const operator = resolveAdminScrapeTriggerOperator({
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

  const adminKey = getAdminTriggerRateLimitKey(adminHeaders, {
    type: 'admin',
    id: 'ethan@spiralapplabs.com',
  });
  const secretKey = getAdminTriggerRateLimitKey(secretHeaders, {
    type: 'secret',
    id: 'shared-secret',
  });

  for (let index = 0; index < ADMIN_SCRAPE_TRENDS_RATE_LIMIT.maxRequests; index += 1) {
    const result = consumeAdminTriggerRateLimit(adminKey, 1_000);
    assert.equal(result.limited, false);
  }

  const limited = consumeAdminTriggerRateLimit(adminKey, 1_000);
  assert.equal(limited.limited, true);
  assert.equal(limited.remaining, 0);

  const separateOperator = consumeAdminTriggerRateLimit(secretKey, 1_000);
  assert.equal(separateOperator.limited, false);
});

test('client ip normalization prefers forwarded headers and strips ports', () => {
  const headers = new Headers({
    'x-vercel-forwarded-for': '198.51.100.12:443, 198.51.100.13',
  });

  assert.equal(getAdminTriggerClientIp(headers), '198.51.100.12');
});
