import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const scriptPath = path.resolve(process.cwd(), 'scripts/check-secret-files.mjs');

function runGit(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function write(cwd, relativePath, contents = '') {
  const filePath = path.join(cwd, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

function createRepo() {
  const cwd = mkdtempSync(path.join(tmpdir(), 'secret-check-'));
  runGit(cwd, ['init']);
  runGit(cwd, ['config', 'user.name', 'Test User']);
  runGit(cwd, ['config', 'user.email', 'test@example.com']);
  write(cwd, 'README.md', 'test repo\n');
  runGit(cwd, ['add', 'README.md']);
  runGit(cwd, ['commit', '-m', 'init']);
  return cwd;
}

function runScript(cwd) {
  return spawnSync('node', [scriptPath], {
    cwd,
    encoding: 'utf8',
  });
}

test('passes when forbidden files and known historical secret identifiers are absent', () => {
  const cwd = createRepo();

  try {
    const result = runScript(cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Verified:/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when a forbidden local env file exists on disk', () => {
  const cwd = createRepo();

  try {
    write(cwd, '.env.local', 'SUPABASE_SERVICE_ROLE_KEY=live-secret\n');
    const result = runScript(cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /still exist under the repo root/);
    assert.match(result.stderr, /\.env\.local/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('fails when a forbidden local env file remains in reachable git history', () => {
  const cwd = createRepo();

  try {
    write(cwd, '.env.local', 'SUPABASE_SERVICE_ROLE_KEY=old-secret\n');
    runGit(cwd, ['add', '.env.local']);
    runGit(cwd, ['commit', '-m', 'add leaked env']);
    rmSync(path.join(cwd, '.env.local'));
    runGit(cwd, ['rm', '.env.local']);
    runGit(cwd, ['commit', '-m', 'remove leaked env']);

    const result = runScript(cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /reachable git history/);
    assert.match(result.stderr, /\.env\.local/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
