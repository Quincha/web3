import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = path.join(ROOT, 'captura de pantalla');
const BASE = (process.env.CAPTURA_BASE || 'http://localhost:5173').replace(/[?&]dash=v2/, '').replace(/\?$/, '');
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

/** ViewState de la app (sin router: se navega con change-view). */
const VIEWS = [
  'dashboard',
  'pomodoro',
  'bujo',
  'health',
  'tareas',
  'habitos',
  'calendario',
  'documentos',
  'finanzas',
  'shopping',
  'proyectos',
  'actividad',
  'clientes',
  'estadisticas',
  'mensajes',
  'ajustes',
  'band',
  'registro',
  'grabaciones',
];

/** Selector que confirma que el módulo de la vista ya montó (específico del módulo). */
const VIEW_SELECTORS = {
  dashboard: '.dashboard-content-area',
  pomodoro: '.pomodoro-module-container',
  bujo: '.bujo-module-container',
  health: '.health-module-container',
  tareas: '.kanban-board, .kanban-wrapper',
  habitos: '.habits-module-container',
  calendario: '.calendar-module-container',
  documentos: '.documents-module-container',
  finanzas: '.finance-module-container',
  shopping: '.bujo-module-container[style*="max-width"]',
  proyectos: '.module-container.fade-in',
  actividad: '.module-container.fade-in',
  clientes: '.module-container.fade-in',
  estadisticas: '.module-container.fade-in',
  mensajes: '.module-container.fade-in',
  ajustes: '.module-container.fade-in',
  band: '.module-container.fade-in',
  registro: '.registro-module-container',
  grabaciones: '.module-container.fade-in',
};

const FINANCE_TABS = ['Dashboard', 'Flujo de Caja', 'Deudas', 'Cuentas', 'Presupuestos', 'Comprobantes'];
const HEALTH_TABS = ['Ficha General', 'Medicamentos', 'Citas & Agenda', 'Historial Clínico'];
const PORTAL_TABS = ['Solicitar Proyecto', 'Seguimiento', 'Portafolio & Casos'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

async function waitForHealthy(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const h = await fetch(`${API}/api/health`);
      if (h.ok) return;
    } catch {
      /* retry */
    }
    await sleep(500);
  }
  throw new Error('API no responde en :3000');
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

async function forceDark(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try {
      const cfg = JSON.parse(localStorage.getItem('quincha_user_config_v2') || '{}');
      cfg.theme = 'dark';
      localStorage.setItem('quincha_user_config_v2', JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  });
}

async function gotoView(page, view, waitMs = 2200) {
  // Volver limpio al dashboard y luego navegar (evita estados raros de tabs)
  await page.evaluate((v) => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.dispatchEvent(new CustomEvent('change-view', { detail: v }));
    window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: v }));
  }, view);

  const selector = VIEW_SELECTORS[view];
  let found = false;
  if (selector) {
    try {
      await page.waitForSelector(selector, { timeout: 6000, visible: true });
      found = true;
    } catch {
      console.log(`  ! selector no encontrado para ${view}: ${selector}`);
    }
  }
  // Confirmar que no seguimos en el hero del dashboard (salvo que sea dashboard)
  if (view !== 'dashboard') {
    const stillDash = await page.evaluate(() => {
      const sc = document.querySelector('.dashboard-body-scroller');
      const t = (sc?.innerText || '').slice(0, 180);
      return t.includes('Bienvenido de nuevo');
    });
    if (stillDash) {
      await sleep(1500);
      const still = await page.evaluate(() => {
        const sc = document.querySelector('.dashboard-body-scroller');
        return (sc?.innerText || '').includes('Bienvenido de nuevo');
      });
      if (still) console.log(`  ! ${view} aún en dashboard tras wait`);
    }
  }
  await sleep(found ? waitMs : waitMs + 800);
  await forceDark(page);
}

async function shot(page, dir, name, { fullPage = true } = {}) {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`  ✓ ${path.relative(ROOT, file)}`);
}

async function clickByText(page, selector, text) {
  const ok = await page.evaluate(
    (sel, t) => {
      const nodes = [...document.querySelectorAll(sel)];
      const el = nodes.find((n) => (n.textContent || '').trim().toLowerCase() === t.toLowerCase());
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    selector,
    text,
  );
  return ok;
}

async function captureViewport(browser, session, vp) {
  const dir = path.join(OUT_ROOT, vp.id);
  ensureDir(dir);
  console.log(`\n=== ${vp.id} (${vp.width}×${vp.height}) ===`);

  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(vp);
  page.setDefaultTimeout(25000);
  page.on('pageerror', (err) => console.log(`  PAGE ERROR: ${err.message}`));

  // ── 01 Login (sin sesión) ──
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  // Forzar config dark ANTES de que monte el form
  await page.evaluate(() => {
    localStorage.setItem(
      'quincha_user_config_v2',
      JSON.stringify({
        theme: 'dark',
        sidebarCollapsed: false,
        userRole: 'super-admin',
        userName: 'Daniel',
        widgets: [
          { id: 'stats', visible: true, order: 0, size: 'large' },
          { id: 'proactive-insights', visible: true, order: 1, size: 'medium' },
          { id: 'pomodoro', visible: true, order: 2, size: 'medium' },
          { id: 'health-meds', visible: true, order: 3, size: 'small' },
          { id: 'health-summary', visible: true, order: 4, size: 'medium' },
          { id: 'bujo', visible: true, order: 5, size: 'small' },
          { id: 'activity', visible: true, order: 6, size: 'small' },
          { id: 'productivity', visible: true, order: 7, size: 'medium' },
          { id: 'tasks', visible: true, order: 8, size: 'small' },
          { id: 'habits', visible: true, order: 9, size: 'small' },
          { id: 'projects', visible: true, order: 10, size: 'large' },
        ],
      }),
    );
    localStorage.removeItem('q_token');
    localStorage.removeItem('q_profile');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.reload({ waitUntil: 'networkidle2' });
  // Form aparece con delay GSAP ~2.25s
  await sleep(3200);
  await forceDark(page);
  await shot(page, dir, '01-login', { fullPage: vp.id === '1080p' });

  // ── Auth real + reload al dashboard ──
  await injectAuth(page, session);
  await page.reload({ waitUntil: 'networkidle2' });
  // SessionRestore → reconcile → dashboard (+ skeleton 1200)
  await sleep(3500);
  await forceDark(page);

  let n = 2;
  const pad = (i) => String(i).padStart(2, '0');

  for (const view of VIEWS) {
    await gotoView(page, view);
    const name = `${pad(n++)}-${view}`;
    await shot(page, dir, name);

    if (view === 'finanzas') {
      for (const tab of FINANCE_TABS) {
        const clicked = await clickByText(page, '.finance-nav-pills .finance-pill', tab);
        if (!clicked) {
          console.log(`  ! tab finanzas no encontrada: ${tab}`);
          continue;
        }
        await sleep(1200);
        await forceDark(page);
        const slug = tab.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
        await shot(page, dir, `${pad(n++)}-finanzas-${slug}`);
      }
      // volver a la vista principal de finanzas para no dejar estado raro
      await clickByText(page, '.finance-nav-pills .finance-pill', 'Dashboard');
      await sleep(400);
    }

    if (view === 'health') {
      for (const tab of HEALTH_TABS) {
        const clicked = await clickByText(page, '.health-tab-btn', tab);
        if (!clicked) {
          console.log(`  ! tab health no encontrada: ${tab}`);
          continue;
        }
        await sleep(1000);
        await forceDark(page);
        const slug = tab.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/&/g, 'y');
        await shot(page, dir, `${pad(n++)}-health-${slug}`);
      }
    }
  }

  // ── Command Palette ──
  await gotoView(page, 'dashboard', 1500);
  await page.evaluate(() => window.dispatchEvent(new Event('open-command-palette')));
  await sleep(600);
  await forceDark(page);
  await shot(page, dir, `${pad(n++)}-command-palette`, { fullPage: false });
  await page.keyboard.press('Escape');
  await sleep(300);

  await context.close();
  return n;
}

async function capturePortal(browser, vp) {
  const dir = path.join(OUT_ROOT, vp.id);
  ensureDir(dir);
  console.log(`  portal (${vp.id})…`);

  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(vp);
  page.setDefaultTimeout(20000);

  await page.goto(`${BASE}/?mode=client`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await sleep(800);

  let n = 100;
  await shot(page, dir, `${n++}-portal-solicitar`);

  for (const tab of PORTAL_TABS.slice(1)) {
    const clicked = await clickByText(page, '.client-tab-btn', tab);
    if (!clicked) {
      // fallback: click por índice
      const idx = PORTAL_TABS.indexOf(tab);
      await page.evaluate((i) => {
        const btns = [...document.querySelectorAll('.client-tab-btn')];
        btns[i]?.click();
      }, idx);
    }
    await sleep(700);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const slug = tab.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    await shot(page, dir, `${n++}-portal-${slug}`);
  }

  await context.close();
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    throw new Error(`Chrome no encontrado en: ${CHROME} (set CHROME_PATH)`);
  }

  console.log('Esperando API…');
  await waitForHealthy();

  console.log('Login API (una vez)…');
  const session = await loginOnce();
  console.log(`  ok → ${session.user.username}/${session.user.role}`);

  ensureDir(OUT_ROOT);
  for (const vp of VIEWPORTS) ensureDir(path.join(OUT_ROOT, vp.id));

  console.log('Lanzando Chrome…');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });

  try {
    for (const vp of VIEWPORTS) {
      await captureViewport(browser, session, vp);
      await capturePortal(browser, vp);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nListo → ${OUT_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
