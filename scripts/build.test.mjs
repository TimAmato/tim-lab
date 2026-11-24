// Checks the built output: every app has an index.html, shared/ is copied,
// the landing page links every app, and tests/migrations are not deployed.
// Runs after `npm run build` (CI order is build, then test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const DIST = join(ROOT, 'dist');
const apps = readdirSync(join(ROOT, 'apps')).filter(
  (n) => !n.startsWith('.') && statSync(join(ROOT, 'apps', n)).isDirectory(),
);

test('dist exists (run npm run build first)', () => {
  assert.ok(existsSync(DIST), 'dist/ missing: run npm run build before npm test');
});

test('every app built with an index.html', () => {
  for (const name of apps) {
    assert.ok(existsSync(join(DIST, name, 'index.html')), `dist/${name}/index.html missing`);
  }
});

test('shared client and config are deployed', () => {
  assert.ok(existsSync(join(DIST, 'shared', 'supabase.js')));
  assert.ok(existsSync(join(DIST, 'shared', 'config.js')));
});

test('landing page links every app', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  for (const name of apps) assert.match(html, new RegExp(`href="\\./${name}/"`));
});

test('tests and migrations are not deployed', () => {
  const walk = (dir) =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? [p, ...walk(p)] : [p];
    });
  for (const p of walk(DIST)) {
    assert.doesNotMatch(p, /\.(test|spec)\.[cm]?[jt]sx?$/, `test file deployed: ${p}`);
    assert.doesNotMatch(p, /[\\/]supabase[\\/]migrations/, `migration deployed: ${p}`);
  }
});
