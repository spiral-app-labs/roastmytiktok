import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const forbiddenLocalFiles = ['.env.local', '.vercel/.env.development.local'];
const forbiddenHistoricalNeedles = ['BRAVE_SEARCH_API_KEY', 'VERCEL_OIDC_TOKEN'];

function runGit(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function isTracked(filePath) {
  try {
    runGit(['ls-files', '--error-unmatch', '--', filePath]);
    return true;
  } catch {
    return false;
  }
}

function existsOnDisk(filePath) {
  return existsSync(filePath);
}

function pathExistsInHistory(filePath) {
  try {
    return runGit(['log', '--all', '--format=%H', '--', filePath]).length > 0;
  } catch {
    return false;
  }
}

function needleExistsInHistory(needle) {
  try {
    return runGit(['log', '-S', needle, '--all', '--format=%H', '--', '.']).length > 0;
  } catch {
    return false;
  }
}

const violations = [];

const presentForbiddenFiles = forbiddenLocalFiles.filter(existsOnDisk);
if (presentForbiddenFiles.length > 0) {
  violations.push({
    title: 'Secret-bearing local env files still exist under the repo root:',
    values: presentForbiddenFiles,
  });
}

const trackedForbiddenFiles = forbiddenLocalFiles.filter(isTracked);
if (trackedForbiddenFiles.length > 0) {
  violations.push({
    title: 'Secret-bearing local env files are tracked by git:',
    values: trackedForbiddenFiles,
  });
}

const historicalForbiddenFiles = forbiddenLocalFiles.filter(pathExistsInHistory);
if (historicalForbiddenFiles.length > 0) {
  violations.push({
    title: 'Secret-bearing local env files remain in reachable git history:',
    values: historicalForbiddenFiles,
  });
}

const historicalNeedles = forbiddenHistoricalNeedles.filter(needleExistsInHistory);
if (historicalNeedles.length > 0) {
  violations.push({
    title: 'Historical secret identifiers remain in reachable git history:',
    values: historicalNeedles,
  });
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation.title);
    for (const value of violation.values) {
      console.error(`- ${value}`);
    }
  }
  console.error(
    'Remove repo-local secret files, rotate the exposed credentials in the approved secret stores, and purge or explicitly sign off on any reachable history exposure.'
  );
  process.exit(1);
}

console.log(
  'Verified: no secret-bearing local env files or known historical secret exposures remain reachable from this repo state.'
);
