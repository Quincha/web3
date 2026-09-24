import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const API = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(`${API}/api/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: '1230035651a' }),
});
const session = await res.json();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('PAGE ERR:', msg.text());
});
page.on('pageerror', (err) => console.log('PAGE EXCEPTION:', err.message));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
await page.evaluate((s) => {
  localStorage.setItem('q_token', s.token);
  localStorage.setItem('q_profile', JSON.stringify(s.user));
  localStorage.setItem('quincha_user_config_v2', JSON.stringify({
    theme: 'dark', userRole: s.user.role, userName: s.user.name || s.user.username, sidebarCollapsed: false,
  }));
  document.documentElement.setAttribute('data-theme', 'dark');
}, session);
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
await sleep(3500);

for (const view of ['dashboard', 'pomodoro', 'tareas', 'finanzas', 'ajustes']) {
  const info = await page.evaluate((v) => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: v }));
    window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: v }));
    return { fired: v };
  }, view);
  await sleep(2000);
  const state = await page.evaluate(() => {
    const sc = document.querySelector('.dashboard-body-scroller');
    const text = (sc?.innerText || document.body.innerText || '').slice(0, 200).replace(/\s+/g, ' ');
    return {
      hasPomodoroMod: !!document.querySelector('.pomodoro-module-container'),
      hasFinanceMod: !!document.querySelector('.finance-module-container'),
      hasAjustes: !!document.querySelector('[class*="ajustes"]'),
      hasTasksish: !!document.querySelector('.module-container, .finance-module-container, .pomodoro-module-container'),
      snippet: text,
    };
  });
  console.log(view, JSON.stringify(state, null, 2));
}

await browser.close();
