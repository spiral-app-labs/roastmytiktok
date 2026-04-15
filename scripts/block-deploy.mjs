import { spawnSync } from 'node:child_process';

const requiredBuildEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const featureChecks = [
  {
    name: 'server-side Supabase writes/storage access',
    requiredEnv: ['SUPABASE_SERVICE_ROLE_KEY'],
  },
  {
    name: 'AI roast analysis and script generation',
    requiredEnv: ['ANTHROPIC_API_KEY', 'GOOGLE_GEMINI_API_KEY'],
  },
  {
    name: 'speech transcription fallback chain',
    requiredEnvAny: ['ASSEMBLYAI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  {
    name: 'cron endpoint authentication',
    requiredEnv: ['CRON_SECRET'],
  },
  {
    name: 'password bypass routes',
    requiredEnv: ['BYPASS_PASSWORD'],
  },
  {
    name: 'Stripe billing portal',
    requiredEnv: ['STRIPE_SECRET_KEY'],
  },
];

const runtimeDependencies = [
  {
    command: 'ffmpeg',
    args: ['-version'],
    feature: 'video/audio analysis in the shipped web app',
  },
  {
    command: 'ffprobe',
    args: ['-version'],
    feature: 'video/audio analysis in the shipped web app',
  },
  {
    command: 'yt-dlp',
    args: ['--version'],
    feature: 'local scripts/analyze_tiktok.py helper only',
  },
];

function isPresent(name) {
  return typeof process.env[name] === 'string' && process.env[name].trim().length > 0;
}

function commandAvailable(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    shell: false,
  });

  return !result.error && result.status === 0;
}

const missingRequiredBuildEnv = requiredBuildEnv.filter((name) => !isPresent(name));

if (missingRequiredBuildEnv.length > 0) {
  console.error(
    `[build-check] Missing build-critical env vars: ${missingRequiredBuildEnv.join(', ')}`
  );
  console.error(
    '[build-check] Copy .env.example into your deployment secret store before running a production build.'
  );
  process.exit(1);
}

console.log('[build-check] Production build path is enabled.');

for (const feature of featureChecks) {
  const missingAll = (feature.requiredEnv ?? []).filter((name) => !isPresent(name));
  const missingAnyGroup =
    feature.requiredEnvAny && !feature.requiredEnvAny.some((name) => isPresent(name))
      ? [feature.requiredEnvAny.join(' or ')]
      : [];

  if (missingAll.length > 0 || missingAnyGroup.length > 0) {
    console.warn(
      `[build-check] ${feature.name} is not fully configured: ${[...missingAll, ...missingAnyGroup].join(', ')}`
    );
  }
}

for (const dependency of runtimeDependencies) {
  if (!commandAvailable(dependency.command, dependency.args)) {
    console.warn(
      `[build-check] Missing runtime binary "${dependency.command}" for ${dependency.feature}.`
    );
  }
}
