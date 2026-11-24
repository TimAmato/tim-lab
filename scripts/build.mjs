#!/usr/bin/env node
// Builds every app in apps/ into dist/<app-name>/, copies shared/ to
// dist/shared/, and writes dist/index.html (a landing page linking every app).
//
// - App with package.json that has a "build" script: install deps, run it,
//   copy its output folder (dist/ by default, or "timLab.outDir" in its
//   package.json). Vite apps must set base: '/tim-lab/<app-name>/'.
// - Any other app: copy the folder as-is, skipping node_modules, tests,
//   and supabase/ (SQL migrations are not served).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const APPS = join(ROOT, 'apps');
const DIST = join(ROOT, 'dist');
const BASE = '/tim-lab';

const SKIP_DIRS = new Set(['node_modules', 'supabase', 'dist', '.vite', 'coverage']);
const isTestFile = (name) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);

function listApps() {
  if (!existsSync(APPS)) return [];
  return readdirSync(APPS)
    .filter((name) => !name.startsWith('.') && statSync(join(APPS, name)).isDirectory())
    .sort();
}

function readPkg(dir) {
  const file = join(dir, 'package.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

function run(cmd, cwd) {
  console.log(`  $ ${cmd}  (in ${relative(ROOT, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function buildApp(name) {
  const src = join(APPS, name);
  const out = join(DIST, name);
  const pkg = readPkg(src);

  if (pkg?.scripts?.build) {
    console.log(`• ${name}: npm build`);
    run(existsSync(join(src, 'package-lock.json')) ? 'npm ci' : 'npm install', src);
    run('npm run build', src);
    const builtDir = join(src, pkg.timLab?.outDir ?? 'dist');
    if (!existsSync(join(builtDir, 'index.html'))) {
      throw new Error(`${name}: build produced no index.html in ${relative(ROOT, builtDir)}`);
    }
    const html = readFileSync(join(builtDir, 'index.html'), 'utf8');
    if (/(src|href)="\/(?!tim-lab\/)[^"]*\.(js|css)"/.test(html)) {
      throw new Error(`${name}: assets use root paths. Set base: '${BASE}/${name}/' in vite.config.`);
    }
    cpSync(builtDir, out, { recursive: true });
  } else {
    console.log(`• ${name}: static copy`);
    if (!existsSync(join(src, 'index.html'))) {
      throw new Error(`${name}: static app has no index.html`);
    }
    cpSync(src, out, {
      recursive: true,
      filter: (path) => {
        const n = basename(path);
        if (path === src) return true;
        if (statSync(path).isDirectory()) return !SKIP_DIRS.has(n);
        return !isTestFile(n) && n !== 'package.json' && n !== 'package-lock.json';
      },
    });
  }
}

function appTitle(name) {
  const file = join(DIST, name, 'index.html');
  const m = existsSync(file) && readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/i);
  return (m && m[1].trim()) || name;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function landingPage(apps) {
  const items = apps
    .map((name) => `      <li><a href="./${name}/"><span>${esc(appTitle(name))}</span><small>/${name}/</small></a></li>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>tim-lab</title>
  <style>
    :root { color-scheme: light dark; font-family: -apple-system, system-ui, sans-serif; }
    body { margin: 0; padding: calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 24px); }
    main { max-width: 560px; margin: 0 auto; }
    h1 { margin: 0 0 4px; font-size: 2rem; }
    p { margin: 0 0 24px; opacity: .6; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    a { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 16px; border-radius: 14px;
        background: color-mix(in srgb, CanvasText 6%, Canvas); color: inherit; text-decoration: none; font-size: 1.1rem;
        -webkit-tap-highlight-color: transparent; }
    a:active { background: color-mix(in srgb, CanvasText 12%, Canvas); }
    small { opacity: .5; font-size: .85rem; }
  </style>
</head>
<body>
  <main>
    <h1>tim-lab</h1>
    <p>${apps.length} app${apps.length === 1 ? '' : 's'}</p>
    <ul>
${items}
    </ul>
  </main>
</body>
</html>
`;
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const apps = listApps();
for (const name of apps) {
  if (name === 'shared') throw new Error('apps/shared is reserved (it would collide with dist/shared).');
  buildApp(name);
}

cpSync(join(ROOT, 'shared'), join(DIST, 'shared'), { recursive: true, filter: (p) => !isTestFile(basename(p)) });
writeFileSync(join(DIST, 'index.html'), landingPage(apps));
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`\nBuilt ${apps.length} app(s) into dist/: ${apps.join(', ')}`);
