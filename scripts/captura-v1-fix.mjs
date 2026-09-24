import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const API = 'http://localhost:3000';
const OUT = path.resolve('captura de pantalla/1080p');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWS = [
  'dashboard', 'pomodoro', 'bujo', 'health', 'tareas', 'habitos',
  'calendario', 'documentos', 'finanzas', 'shopping', 'proyectos',
  'actividad', 'clientes', 'estadisticas', 'mensajes', 'ajustes',
  'band', 'registro',
];

const NAMES = {
  dashboard: '02-dashboard',
  pomodoro: '03-pomodoro',
  bujo: '04-bujo',
  health: '05-health',
  tareas: '10-tareas',
  habitos: '11-habitos',
  calendario: '12-calendario',
  documentos: '13-documentos',
  finanzas: '14-finanzas',
  shopping: '21-shopping',
  proyectos: '22-proyectos',
  actividad: '23-actividad',
  clientes: '24-clientes',
  estadisticas: '25-estadisticas',
  mensajes: '26-mensajes',
  ajustes: '27-ajustes',
  band: '28-band',
  registro: '29-registro',
};

const SELECTORS = {
  dashboard: '.dashboard-content-area',
  pomodoro: '.pomodoro-module-container',
  bujo: '.bujo-module-container',
  health: '.health-module-container',
  tareas: '.kanban-wrapper',
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
};

const session = await (await fetch(`${API}/api/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: '1230035651a' }),
})).json();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', e.message));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
await page.evaluate((s) => {
  localStorage.setItem('q_token', s.token);
  localStorage.setItem('q_profile', JSON.stringify(s.user));
  localStorage.setItem('quincha_user_config_v2', JSON.stringify({
    theme: 'dark', sidebarCollapsed: false, userRole: 'super-admin', userName: 'Daniel',
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
  }));
  document.documentElement.setAttribute('data-theme', 'dark');
}, session);
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
await sleep(3500);

console.log('URL inicial:', page.url());

for (const view of VIEWS) {
  await page.evaluate((v) => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.dispatchEvent(new CustomEvent('change-view', { detail: v }));
    window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: v }));
  }, view);

  const sel = SELECTORS[view];
  let ok = false;
  try {
    await page.waitForSelector(sel, { timeout: 5000, visible: true });
    ok = true;
  } catch { /* continue */ }

  await sleep(1800);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

  const probe = await page.evaluate((v) => {
    const sc = document.querySelector('.dashboard-body-scroller');
    const text = (sc?.innerText || '').slice(0, 120).replace(/\s+/g, ' ');
    const hasDashHero = text.includes('Bienvenido de nuevo') || text.includes('HOLA,');
    return { text, hasDashHero, url: location.href };
  }, view);

  const file = path.join(OUT, `${NAMES[view]}.png`);
  // full page of scroller content
  const h = await page.evaluate(() => {
    const sc = document.querySelector('.dashboard-body-scroller');
    if (!sc) return 1080;
    sc.style.height = 'auto';
    const h = sc.scrollHeight;
    return Math.min(Math.max(h + 20, 1080), 4000);
  });
  await page.setViewport({ width: 1920, height: h, deviceScaleFactor: 1 });
  await sleep(200);
  await page.screenshot({ path: file, fullPage: false });
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  console.log(`${view}: sel=${ok} dashHero=${probe.hasDashHero} → ${path.basename(file)}`);
  if (probe.hasDashHero && view !== 'dashboard') {
    console.log(`  WARN still dashboard: ${probe.text}`);
  }
}

await browser.close();
console.log('DONE');
