// Opens a built copy of the app in headless Edge and reports what the five
// template lines do on the page. Prints JSON on stdout.
//
//   node runtime/probe.mjs dist/development/browser
//
// Playwright gives the browser a temporary profile and removes it in close(),
// which runs in the finally block below on success, failure and Ctrl+C.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const dir = resolve(process.argv[2] ?? '');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon' };

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const file = join(dir, path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/`;

let browser;
const stop = async () => {
  await browser?.close().catch(() => {});
  server.close();
};
process.once('SIGINT', () => stop().then(() => process.exit(130)));

try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(url);
  await page.waitForSelector('app-profile-form-fixed app-save-button button.save', { timeout: 15000 });
  await page.waitForTimeout(300);

  // `host` is app-profile-form (as written) or app-profile-form-fixed.
  const read = (host) =>
    page.evaluate((host) => {
      const root = document.querySelector(host);
      const box = (sel) => {
        const el = root.querySelector(sel);
        return { width: el.getBoundingClientRect().width, style: el.getAttribute('style') };
      };
      const up = root.querySelector('app-uploader');
      return {
        uploaderChildren: up.childElementCount,
        uploaderText: up.textContent.trim(),
        hostWidth: root.getBoundingClientRect().width,
        literalBar: box('.bar.literal'),
        fieldBar: box('.bar.field'),
        counts: root.querySelector('.counts').textContent.trim(),
      };
    }, host);

  const result = { url, errors };
  for (const host of ['app-profile-form', 'app-profile-form-fixed']) {
    const before = await read(host);
    await page.click(`${host} button.save`);
    await page.click(`${host} button.draft`);
    await page.click(`${host} button.reset`);
    await page.waitForTimeout(300);
    result[host] = { before, after: await read(host) };
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await stop();
}
