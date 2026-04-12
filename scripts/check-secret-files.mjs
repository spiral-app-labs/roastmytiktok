import { execFileSync } from 'node:child_process';

const forbiddenTrackedFiles = ['.env.local', '.vercel/.env.development.local'];

function isTracked(path) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', path], {
      cwd: process.cwd(),
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

const trackedForbiddenFiles = forbiddenTrackedFiles.filter(isTracked);

if (trackedForbiddenFiles.length > 0) {
  console.error('Secret-bearing local env files are tracked by git:');
  for (const file of trackedForbiddenFiles) {
    console.error(`- ${file}`);
  }
  console.error('Remove them from version control and rotate any credentials they contained.');
  process.exit(1);
}

console.log('Verified: secret-bearing local env files are not tracked by git.');
