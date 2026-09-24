import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'captura de pantalla', 'dashboard2');
const BASE = process.env.CAPTURA_BASE || 'http://localhost:5173';
const API = process.env.CAPTURA_API || 'http://localhost:3000';
const USER = process.env.CAPTURA_USER || 'admin';
const PASS = process.env.CAPTURA_PASS || '1230035651a';
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
  { id: '1080p', width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { id: 'movil', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

async function waitForHealthy(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const h = await fetch(`${API}/api/health`);
      if (h.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error('API no responde en :3000');
}

async function loginOnce() {
  const res = await fetch(`${API}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!res.ok) throw new Error(`Login API falló: ${res.status} ${await res.text()}`);
  return res.json();
}

async function injectAuth(page, session) {
  await page.evaluate((s) => {
    localStorage.setItem('q_token', s.token);
    localStorage.setItem('q_profile', JSON.stringify(s.user));
    const cfgKey = 'quincha_user_config_v2';
    let cfg = {};
    try {
      cfg = JSON.parse(localStorage.getItem(cfgKey) || '{}');
    } catch {
      cfg = {};
    }
    cfg.theme = 'dark';
    cfg.userRole = s.user.role;
    cfg.userName = s.user.name || s.user.username;
    localStorage.setItem(cfgKey, JSON.stringify(cfg));
    document.documentElement.setAttribute('data-theme', 'dark');
  }, session);
}

// El layout usa .dashboard-body-scroller (overflow-y): fullPage no basta.
async function measureScroller(page) {
  return page.evaluate(() => {
    const sc =
      document.querySelector('.dashboard-body-scroller') ||
      document.querySelector('.dashboard-content-area') ||
      document.scrollingElement;
    if (!sc || sc === document.scrollingElement) {
      return { height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight), useScroller: false };
    }
    const prev = sc.style.height;
    sc.style.height = 'auto';
    const height = Math.ceil(sc.scrollHeight);
    sc.style.height = prev;
    return { height, useScroller: true };
  });
}

async function shootFull(page, file, baseVp) {
  const { height, useScroller } = await measureScroller(page);
  const targetH = Math.max(baseVp.height, height + 40);
  await page.setViewport({ ...baseVp, height: Math.min(targetH, 8000) });
  await sleep(300);
  if (useScroller) {
    await page.evaluate(() => {
      const sc = document.querySelector('.dashboard-body-scroller');
      if (sc) sc.scrollTop = 0;
    });
  }
  await page.screenshot({ path: file, fullPage: true });
  // restaurar
  await page.setViewport(baseVp);
}

async function main() {
  ensureDir(OUT);
  await waitForHealthy();
  const session = await loginOnce();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport(vp);
      // Login sin sesión (estilo brand)
      await page.goto(`${BASE}/?dash=v2&mode=login`, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(800);
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await shootFull(page, path.join(OUT, `dashboard2-login-${vp.id}.png`), vp);

      // Dashboard V2
      await page.goto(`${BASE}/?dash=v2`, { waitUntil: 'networkidle2', timeout: 60000 });
      await injectAuth(page, session);
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(2500); // skeleton 1200 + hero/clima
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await sleep(400);
      await shootFull(page, path.join(OUT, `dashboard2-${vp.id}.png`), vp);
      console.log(`OK ${vp.id}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png'));
  for (const f of files) {
    const st = fs.statSync(path.join(OUT, f));
    console.log(`${f}  ${(st.size / 1024).toFixed(0)} KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
