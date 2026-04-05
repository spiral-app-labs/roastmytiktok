const blockedSignals = [
  ['VERCEL', process.env.VERCEL],
  ['NOW_BUILDER', process.env.NOW_BUILDER],
  ['GITHUB_ACTIONS', process.env.GITHUB_ACTIONS],
  ['CI', process.env.CI],
];

const override = process.env.ALLOW_NONLOCAL_BUILD === '1';
const activeSignals = blockedSignals.filter(([, value]) => value && value !== '0' && value.toLowerCase?.() !== 'false');

if (override) {
  console.warn('[block-deploy] ALLOW_NONLOCAL_BUILD=1 set, skipping localhost-only build guard.');
  process.exit(0);
}

if (activeSignals.length > 0) {
  const summary = activeSignals.map(([key, value]) => `${key}=${value}`).join(', ');
  console.error('\n[block-deploy] roastmytiktok is locked to localhost-only right now.');
  console.error(`[block-deploy] refusing non-local build because detected: ${summary}`);
  console.error('[block-deploy] if Ethan intentionally wants to reopen deploys later, first verify Vercel auto-deploys are disabled and then rerun with ALLOW_NONLOCAL_BUILD=1.\n');
  process.exit(1);
}

console.log('[block-deploy] local build/dev context detected, continuing.');
