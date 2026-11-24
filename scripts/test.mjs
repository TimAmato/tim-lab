#!/usr/bin/env node
// Runs every app's tests.
// - App with package.json that has a "test" script (e.g. Vite + Vitest):
//   installs deps if needed and runs `npm test` in that folder.
// - Any other app: runs Node's built-in test runner on its *.test.js files.
// Also runs tests in scripts/ and shared/. Exits non-zero if anything fails.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const isTestFile = (name) => /\.(test|spec)\.[cm]?js$/.test(name);

function findTests(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...findTests(p));
    else if (isTestFile(name)) out.push(p);
  }
  return out;
}

const failures = [];
function run(label, cmd, cwd) {
  console.log(`\n▶ ${label}\n  $ ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch {
    failures.push(label);
  }
}
const quote = (files) => files.map((f) => JSON.stringify(relative(ROOT, f))).join(' ');

const appsDir = join(ROOT, 'apps');
const apps = existsSync(appsDir)
  ? readdirSync(appsDir).filter((n) => !n.startsWith('.') && statSync(join(appsDir, n)).isDirectory()).sort()
  : [];

for (const name of apps) {
  const dir = join(appsDir, name);
  const pkgFile = join(dir, 'package.json');
  const pkg = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, 'utf8')) : null;
  if (pkg?.scripts?.test) {
    if (!existsSync(join(dir, 'node_modules'))) {
      execSync(existsSync(join(dir, 'package-lock.json')) ? 'npm ci' : 'npm install', { cwd: dir, stdio: 'inherit' });
    }
    run(`apps/${name} (npm test)`, 'npm test', dir);
  } else {
    const files = findTests(dir);
    if (files.length === 0) {
      console.log(`\n⚠ apps/${name}: no tests found`);
      continue;
    }
    run(`apps/${name} (node --test)`, `node --test ${quote(files)}`, ROOT);
  }
}

const repoTests = [...findTests(join(ROOT, 'scripts')), ...findTests(join(ROOT, 'shared'))];
if (repoTests.length) run('scripts + shared', `node --test ${quote(repoTests)}`, ROOT);

if (failures.length) {
  console.error(`\n✖ Tests failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\n✔ All tests passed');
