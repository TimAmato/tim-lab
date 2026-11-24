#!/usr/bin/env node
// iPhone-size browser check for every built app in dist/.
// Serves dist/ at /tim-lab/ (same layout as GitHub Pages), opens each app in
// headless Chromium at iPhone 15 size, and fails if:
//   - the page throws an uncaught JavaScript error
//   - the console logs an error (missing favicon is ignored)
//   - the page scrolls sideways (content wider than the phone screen)
//   - the page is blank (no visible text)
// Saves a screenshot per app to smoke-screenshots/<app>.png.
//
// Run after `npm run build`:  npm run smoke
// First time on a new machine: npx playwright install chromium
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const DIST = join(ROOT, 'dist');
const SHOTS = join(ROOT, 'smoke-screenshots');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm install && npx playwright install chromium');
  process.exit(1);
}

if (!existsSync(DIST)) {
  console.error('dist/ missing: run npm run build first');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/tim-lab/')) { res.writeHead(404).end(); return; }
  let file = normalize(join(DIST, decodeURIComponent(url.pathname.slice('/tim-lab/'.length))));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/tim-lab`;

const only = process.argv[2];
const apps = readdirSync(DIST)
  .filter((n) => n !== 'shared' && existsSync(join(DIST, n, 'index.html')))
  .filter((n) => !only || n === only)
  .sort();

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const failures = [];

for (const name of apps.concat(only ? [] : [''])) {
  const label = name || '(landing page)';
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`JS error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon/i.test(m.location()?.url ?? '') && !/favicon/i.test(m.text())) {
      problems.push(`console error: ${m.text()}`);
    }
  });

  try {
    await page.goto(`${base}/${name ? name + '/' : ''}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: 393,
      text: document.body.innerText.trim().length,
    }));
    if (m.scrollWidth > m.width + 1) problems.push(`scrolls sideways: page is ${m.scrollWidth}px wide on a ${m.width}px screen`);
    if (m.text === 0) problems.push('page is blank (no visible text)');
    await page.screenshot({ path: join(SHOTS, `${name || 'index'}.png`), fullPage: true });
  } catch (e) {
    problems.push(`failed to load: ${e.message.split('\n')[0]}`);
  }
  await context.close();

  if (problems.length) {
    failures.push(label);
    console.log(`✖ ${label}\n${problems.map((p) => `    - ${p}`).join('\n')}`);
  } else {
    console.log(`✔ ${label}`);
  }
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\nSmoke check failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`\nAll ${apps.length} app(s) pass the iPhone check. Screenshots in smoke-screenshots/`);
