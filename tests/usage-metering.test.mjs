import test from 'node:test';
import assert from 'node:assert/strict';

const { buildUsageSnapshotFromRows, FREE_USAGE_CAP, resolveUsageSubjectFromIds } = await import('../lib/usage.ts');

test('usage subject prefers account, then session, then real IP fallback', () => {
  assert.deepEqual(
    resolveUsageSubjectFromIds({
      clientIp: '203.0.113.10',
      sessionId: 'rmt_session_12345',
      userId: '6a80c4e1-bf49-47d0-882f-b3c4183752d9',
    }),
    { type: 'account', id: '6a80c4e1-bf49-47d0-882f-b3c4183752d9' },
  );

  assert.deepEqual(
    resolveUsageSubjectFromIds({
      clientIp: '203.0.113.10',
      sessionId: 'rmt_session_12345',
    }),
    { type: 'session', id: 'rmt_session_12345' },
  );

  assert.deepEqual(
    resolveUsageSubjectFromIds({
      clientIp: '203.0.113.10',
      sessionId: 'bad',
    }),
    { type: 'ip', id: '203.0.113.10' },
  );
});

test('usage snapshot persists real roast counts and processed minutes from completed sessions', () => {
  const now = new Date('2026-04-05T03:00:00.000Z');
  const subject = { type: 'session', id: 'rmt_session_12345' };
  const usage = buildUsageSnapshotFromRows(subject, [
    { analysis_status: 'completed', completed_at: '2026-04-05T01:00:00.000Z', created_at: '2026-04-05T00:58:00.000Z', processed_seconds: 90 },
    { analysis_status: 'completed', completed_at: '2026-04-04T12:00:00.000Z', created_at: '2026-04-04T11:58:00.000Z', processed_seconds: 30 },
    { analysis_status: 'failed', created_at: '2026-04-04T15:00:00.000Z', processed_seconds: 999 },
    { analysis_status: 'pending', created_at: '2026-04-04T16:00:00.000Z', processed_seconds: 120 },
    { overall_score: 77, created_at: '2026-04-02T12:00:00.000Z', processed_seconds: 120 },
  ], 'free', now);

  assert.equal(usage.totals.roastsAllTime, 3);
  assert.equal(usage.totals.roastsInWindow, 2);
  assert.equal(usage.totals.minutesProcessedAllTime, 4);
  assert.equal(usage.totals.minutesProcessedInWindow, 2);
  assert.equal(usage.caps.roastLimit, FREE_USAGE_CAP.roastsPerWindow);
});

test('usage snapshot stays cap-ready for paid plans by removing the roast limit while keeping totals', () => {
  const now = new Date('2026-04-05T03:00:00.000Z');
  const subject = { type: 'session', id: 'rmt_session_12345' };
  const usage = buildUsageSnapshotFromRows(subject, [
    { analysis_status: 'completed', completed_at: '2026-04-05T02:00:00.000Z', processed_seconds: 75 },
  ], 'paid', now);

  assert.equal(usage.totals.roastsAllTime, 1);
  assert.equal(usage.totals.minutesProcessedAllTime, 1.3);
  assert.equal(usage.caps.roastLimit, null);
});
