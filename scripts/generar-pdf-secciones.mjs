import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'captura de pantalla', '1080p');
const OUT_PDF = path.join(ROOT, 'captura de pantalla', 'Catalogo_Secciones_Quincha.pdf');
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/**
 * Catálogo de pantallas y secciones.
 * Cada pantalla tiene un código (p.ej. DASH) y secciones numeradas
 * para poder referirse por nombre al iterar el diseño.
 */
const SCREENS = [
  {
    id: 'LOGIN',
    code: 'LOGIN',
    name: 'Inicio de sesión',
    file: '01-login.png',
    sections: [
      ['LOGIN-01', 'Marca / Logo Q', 'Logo central + wordmark QUINCHA SYSTEMS'],
      ['LOGIN-02', 'Tagline', 'INGENIERÍA · SOFTWARE · AUTOMATIZACIÓN'],
      ['LOGIN-03', 'Campo usuario', 'Usuario o correo electrónico'],
      ['LOGIN-04', 'Campo contraseña', 'Contraseña + toggle visibilidad'],
      ['LOGIN-05', 'Botón entrar', 'INICIAR SESIÓN'],
    ],
  },
  {
    id: 'DASH',
    code: 'DASH',
    name: 'Dashboard (inicio)',
    file: '02-dashboard.png',
    sections: [
      ['DASH-00', 'Sidebar', 'Navegación lateral (marca, menú, usuario)'],
      ['DASH-01', 'Top bar / Búsqueda', 'Buscador global + estado de sincronización + avatar'],
      ['DASH-02', 'Hero saludo', 'Saludo, cita, ubicación, clima y reloj'],
      ['DASH-03', 'Métricas hero', 'Tarjetas: Tareas, Enfocado, Agenda, Hábitos'],
      ['DASH-04', 'Widget Pomodoro', 'Temporizador, sesión actual, consejo, stats'],
      ['DASH-05', 'Widget Tareas del día', 'Lista de tareas + botón +Nueva'],
      ['DASH-06', 'Widget Calendario', 'Strip semanal + eventos del día'],
      ['DASH-07', 'Widget Hábitos', 'Check semanal de hábitos'],
      ['DASH-08', 'Widget Actividad', 'Actividad reciente'],
      ['DASH-09', 'Banner Finanzas', 'Saldo, por cobrar/pagar, ingresos/gastos'],
      ['DASH-10', 'Footer de marca', 'Quincha Systems — Tecnología, disciplina y propósito'],
    ],
  },
  {
    id: 'POMO',
    code: 'POMO',
    name: 'Pomodoro',
    file: '03-pomodoro.png',
    sections: [
      ['POMO-01', 'Header módulo', 'Título + subtítulo + botón Nueva Sesión'],
      ['POMO-02', 'Formulario sesión', 'Tarea, proyecto, descripción, duración'],
      ['POMO-03', 'Temporizador / progreso', 'Círculo o barra de sesión activa'],
      ['POMO-04', 'Controles', 'Iniciar / Pausar / Reiniciar / Finalizar'],
      ['POMO-05', 'Historial de sesiones', 'Lista de sesiones completadas'],
    ],
  },
  {
    id: 'BUJO',
    code: 'BUJO',
    name: 'Bullet Journal (BuJo)',
    file: '04-bujo.png',
    sections: [
      ['BUJO-01', 'Header', 'Título + stats del día (tareas/notas/eventos)'],
      ['BUJO-02', 'Input rápido', 'Campo de entrada + pills de tipo + Enter'],
      ['BUJO-03', 'Timeline del día', 'Línea de tiempo de entradas'],
      ['BUJO-04', 'Calendario lateral', 'Mini calendario mensual'],
      ['BUJO-05', 'Resumen', 'Totales del período'],
      ['BUJO-06', 'Filtros', 'Hoy / Semana / Pendientes / Completadas'],
      ['BUJO-07', 'Footer stats', 'Productividad y métricas'],
    ],
  },
  {
    id: 'HEALTH',
    code: 'SALUD',
    name: 'Salud',
    file: '05-health.png',
    sections: [
      ['SALUD-00', 'Tabs de sección', 'Ficha General · Medicamentos · Citas · Historial'],
      ['SALUD-01', 'Ficha General', 'Perfil de salud / métricas'],
      ['SALUD-02', 'Medicamentos', 'Tabs→ Medicamentos'],
      ['SALUD-03', 'Citas & Agenda', 'Tabs→ Citas & Agenda'],
      ['SALUD-04', 'Historial Clínico', 'Tabs→ Historial Clínico'],
    ],
    tabs: [
      ['06-health-ficha-general.png', 'Ficha General'],
      ['07-health-medicamentos.png', 'Medicamentos'],
      ['08-health-citas-y-agenda.png', 'Citas & Agenda'],
      ['09-health-historial-clinico.png', 'Historial Clínico'],
    ],
  },
  {
    id: 'TASKS',
    code: 'TAREAS',
    name: 'Tareas (Kanban)',
    file: '10-tareas.png',
    sections: [
      ['TAREAS-01', 'Top bar Kanban', 'Buscador, Filtro, Ordenar, +Nueva Tarea'],
      ['TAREAS-02', 'Columna Por hacer', 'Tarjetas pendientes + quick add'],
      ['TAREAS-03', 'Columna En proceso', 'Tarjetas en curso + quick add'],
      ['TAREAS-04', 'Columna Terminada', 'Tarjetas completadas'],
      ['TAREAS-05', 'Tarjeta de tarea', 'Check, título, badges, meta, avatar'],
    ],
  },
  {
    id: 'HABITS',
    code: 'HABITOS',
    name: 'Hábitos',
    file: '11-habitos.png',
    sections: [
      ['HABITOS-01', 'Header', 'Título + subtítulo + acción'],
      ['HABITOS-02', 'Lista de hábitos', 'Cards de hábitos con check diario'],
      ['HABITOS-03', 'Estadísticas', 'Rachas / completion rate'],
    ],
  },
  {
    id: 'CAL',
    code: 'CAL',
    name: 'Calendario',
    file: '12-calendario.png',
    sections: [
      ['CAL-01', 'Header / navegación', 'Mes, prev/next, Hoy'],
      ['CAL-02', 'Vista mensual/semanal', 'Grid de días con eventos'],
      ['CAL-03', 'Panel de eventos', 'Detalle del día seleccionado'],
      ['CAL-04', 'Nuevo evento', 'Acción crear evento'],
    ],
  },
  {
    id: 'DOCS',
    code: 'DOCS',
    name: 'Documentos',
    file: '13-documentos.png',
    sections: [
      ['DOCS-01', 'Header', 'Título + Nuevo Documento'],
      ['DOCS-02', 'Filtros / búsqueda', 'Buscar y filtrar documentos'],
      ['DOCS-03', 'Grid / lista docs', 'Cards de documentos'],
      ['DOCS-04', 'Form alta', 'Formulario de creación'],
    ],
  },
  {
    id: 'FIN',
    code: 'FIN',
    name: 'Finanzas',
    file: '14-finanzas.png',
    sections: [
      ['FIN-01', 'Header Finance', 'Título Finance & Treasury + acción'],
      ['FIN-02', 'Nav pills', 'Dashboard · Flujo · Deudas · Cuentas · Presupuestos · Comprobantes'],
      ['FIN-03', 'Stat cards', 'Saldo, ingresos, gastos, resultado, cobrar, pagar'],
      ['FIN-04', 'Contenido por tab', 'Vista activa según pill'],
    ],
    tabs: [
      ['14-finanzas.png', 'Dashboard (principal)'],
      ['16-finanzas-flujo-de-caja.png', 'Flujo de Caja'],
      ['17-finanzas-deudas.png', 'Deudas'],
      ['18-finanzas-cuentas.png', 'Cuentas'],
      ['19-finanzas-presupuestos.png', 'Presupuestos'],
      ['20-finanzas-comprobantes.png', 'Comprobantes'],
    ],
  },
  {
    id: 'SHOP',
    code: 'COMPRAS',
    name: 'Lista de Compras',
    file: '21-shopping.png',
    sections: [
      ['COMPRAS-01', 'Header', 'Título + agregar'],
      ['COMPRAS-02', 'Lista / categorías', 'Items de compra'],
      ['COMPRAS-03', 'Progreso', 'Checklist completado'],
    ],
  },
  {
    id: 'PROJ',
    code: 'PROY',
    name: 'Proyectos',
    file: '22-proyectos.png',
    sections: [
      ['PROY-01', 'Header', 'Título + Nuevo Proyecto'],
      ['PROY-02', 'Grid proyectos', 'Cards con progreso'],
      ['PROY-03', 'Detalle / filtros', 'Estado y entregables'],
    ],
  },
  {
    id: 'ACT',
    code: 'ACT',
    name: 'Actividad',
    file: '23-actividad.png',
    sections: [
      ['ACT-01', 'Header', 'Título + filtros de tiempo'],
      ['ACT-02', 'Timeline', 'Eventos de actividad'],
      ['ACT-03', 'Resumen', 'Totales del período'],
    ],
  },
  {
    id: 'CLI',
    code: 'CLIENTES',
    name: 'Clientes',
    file: '24-clientes.png',
    sections: [
      ['CLIENTES-01', 'Header', 'Título + Nuevo Cliente'],
      ['CLIENTES-02', 'Lista / grid', 'Cards o tabla de clientes'],
      ['CLIENTES-03', 'Panel detalle', 'Info del cliente seleccionado'],
    ],
  },
  {
    id: 'STATS',
    code: 'STATS',
    name: 'Estadísticas',
    file: '25-estadisticas.png',
    sections: [
      ['STATS-01', 'Header', 'Título + rango de fechas'],
      ['STATS-02', 'KPI cards', 'Métricas clave'],
      ['STATS-03', 'Gráficos', 'Charts de productividad / tareas'],
      ['STATS-04', 'Tablas', 'Desgloses'],
    ],
  },
  {
    id: 'MSG',
    code: 'MSJ',
    name: 'Mensajes',
    file: '26-mensajes.png',
    sections: [
      ['MSJ-01', 'Lista conversaciones', 'Hilos / notificaciones'],
      ['MSJ-02', 'Detalle mensaje', 'Cuerpo del mensaje'],
      ['MSJ-03', 'Composer', 'Campo de respuesta'],
    ],
  },
  {
    id: 'SET',
    code: 'AJUSTES',
    name: 'Ajustes',
    file: '27-ajustes.png',
    sections: [
      ['AJUSTES-01', 'Header', 'Título + volver al Dashboard'],
      ['AJUSTES-02', 'Perfil', 'Nombre de usuario'],
      ['AJUSTES-03', 'Seguridad', 'Cambio de contraseña'],
      ['AJUSTES-04', 'Apariencia', 'Tema dark / light / mixed'],
      ['AJUSTES-05', 'Rol y permisos', 'Selección de rol (super-admin)'],
      ['AJUSTES-06', 'Widgets del Dashboard', 'Toggle visibilidad de widgets'],
      ['AJUSTES-07', 'Google Calendar', 'Conectar / desconectar GCal'],
    ],
  },
  {
    id: 'BAND',
    code: 'BAND',
    name: 'Mi Band (Actividad)',
    file: '28-band.png',
    sections: [
      ['BAND-01', 'Header', 'Título + estado del dispositivo'],
      ['BAND-02', 'Métricas', 'Pasos, sueño, frecuencia'],
      ['BAND-03', 'Historial', 'Series temporales'],
    ],
  },
  {
    id: 'REG',
    code: 'REG',
    name: 'Registro de auditorías',
    file: '29-registro.png',
    sections: [
      ['REG-01', 'Header', 'Título + filtros'],
      ['REG-02', 'Tabla de logs', 'Eventos de auditoría'],
      ['REG-03', 'Detalle', 'Payload / actor'],
    ],
  },
  {
    id: 'CP',
    code: 'CMD',
    name: 'Command Palette (⌘K)',
    file: '30-command-palette.png',
    sections: [
      ['CMD-01', 'Overlay', 'Modal de búsqueda centrado'],
      ['CMD-02', 'Input', 'Campo de query'],
      ['CMD-03', 'Resultados', 'Acciones y navegación'],
    ],
  },
  {
    id: 'PORTAL',
    code: 'PORTAL',
    name: 'Portal de cliente',
    file: '100-portal-solicitar.png',
    sections: [
      ['PORTAL-01', 'Header portal', 'Marca + tabs'],
      ['PORTAL-02', 'Solicitar Proyecto', 'Form de solicitud'],
      ['PORTAL-03', 'Seguimiento', 'Tabs→ Seguimiento'],
      ['PORTAL-04', 'Portafolio & Casos', 'Tabs→ Portafolio & Casos'],
    ],
    tabs: [
      ['100-portal-solicitar.png', 'Solicitar Proyecto'],
      ['101-portal-seguimiento.png', 'Seguimiento'],
      ['102-portal-portafolio-&-casos.png', 'Portafolio & Casos'],
    ],
  },
];

function b64(file) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p).toString('base64');
}

function imgTag(file, alt) {
  const data = b64(file);
  if (!data) return `<div class="missing">Imagen no disponible: ${file}</div>`;
  return `<img src="data:image/png;base64,${data}" alt="${alt}" />`;
}

function buildHtml() {
  const indexRows = SCREENS.map(
    (s) =>
      `<tr><td class="mono">${s.code}</td><td>${s.name}</td><td class="mono">${s.sections.length} secciones</td></tr>`,
  ).join('\n');

  const allSectionRows = SCREENS.flatMap((s) =>
    s.sections.map(
      ([code, name, desc]) =>
        `<tr><td class="mono code">${code}</td><td><strong>${name}</strong><br><span class="muted">${desc}</span></td><td class="mono">${s.name}</td></tr>`,
    ),
  ).join('\n');

  const pages = SCREENS.map((s) => {
    const secRows = s.sections
      .map(
        ([code, name, desc]) =>
          `<tr><td class="mono code">${code}</td><td><strong>${name}</strong></td><td class="muted">${desc}</td></tr>`,
      )
      .join('\n');

    const tabPages = (s.tabs || [])
      .map(([file, label]) => {
        if (!fs.existsSync(path.join(SHOTS, file))) return '';
        return `
        <div class="tab-block">
          <div class="tab-label">${label}</div>
          <div class="shot">${imgTag(file, label)}</div>
        </div>`;
      })
      .join('\n');

    return `
    <section class="page screen-page">
      <header class="screen-head">
        <div>
          <span class="badge">${s.code}</span>
          <h1>${s.name}</h1>
          <p class="file mono">${s.file}</p>
        </div>
        <div class="count">${s.sections.length} secciones</div>
      </header>
      <div class="shot main-shot">${imgTag(s.file, s.name)}</div>
      <h2>Secciones</h2>
      <table class="sections">
        <thead><tr><th>Código</th><th>Sección</th><th>Pantalla</th></tr></thead>
        <tbody>${secRows}</tbody>
      </table>
      ${tabPages ? `<h2>Vistas / tabs</h2>${tabPages}` : ''}
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Catálogo de secciones — Quincha Systems</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #0f172a;
    background: #fff;
    font-size: 12px;
    line-height: 1.45;
  }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  .muted { color: #64748b; font-size: 11px; }
  .code { color: #0d9488; font-weight: 700; white-space: nowrap; }

  .cover {
    min-height: 250mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 20mm;
    background: linear-gradient(145deg, #061018 0%, #0b1f1a 55%, #062820 100%);
    color: #e2e8f0;
    page-break-after: always;
  }
  .cover .brand { letter-spacing: 0.35em; color: #16f0b5; font-size: 12px; font-weight: 700; }
  .cover h1 { font-size: 36px; margin: 12px 0 8px; color: #fff; }
  .cover p { color: #94a3b8; max-width: 480px; font-size: 14px; }
  .cover .meta { margin-top: 40px; font-size: 12px; color: #64748b; }
  .cover .legend {
    margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 16px; max-width: 520px;
  }
  .cover .legend code { color: #3acdff; }

  .toc { page-break-after: always; padding-top: 8mm; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  h2 { font-size: 15px; margin: 18px 0 8px; color: #0f766e; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  tr { page-break-inside: avoid; }

  .page { page-break-after: always; padding-top: 4mm; }
  .page:last-child { page-break-after: auto; }
  .screen-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
  .screen-head h1 { margin: 4px 0 2px; font-size: 20px; }
  .badge {
    display: inline-block; background: #0f766e; color: #fff; font-size: 10px;
    font-weight: 700; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 999px;
  }
  .file { color: #94a3b8; font-size: 11px; margin: 0; }
  .count {
    background: #ecfdf5; color: #0f766e; border: 1px solid #99f6e4;
    border-radius: 10px; padding: 8px 12px; font-weight: 700; font-size: 12px;
  }
  .shot {
    border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;
    background: #0b1220; margin-bottom: 8px;
  }
  .shot img { display: block; width: 100%; height: auto; max-height: 118mm; object-fit: contain; object-position: top; background: #0b1220; }
  .main-shot img { max-height: 105mm; }
  .missing { padding: 24px; color: #94a3b8; text-align: center; }
  .tab-block { margin-bottom: 10px; }
  .tab-label {
    font-size: 11px; font-weight: 700; color: #0f766e; margin-bottom: 4px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .tab-block .shot img { max-height: 90mm; }
  .sections td:first-child { width: 88px; }
  .sections td:nth-child(2) { width: 38%; }
  .howto {
    background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px;
    padding: 12px 14px; margin: 12px 0 20px;
  }
  .howto strong { color: #0f766e; }
</style>
</head>
<body>
  <section class="cover">
    <div class="brand">QUINCHA SYSTEMS</div>
    <h1>Catálogo de secciones</h1>
    <p>Referencia de pantallas y secciones nombradas para iterar el diseño sector por sector.</p>
    <div class="legend">
      <div><code>CODIGO-NN</code> → sección exacta</div>
      <div><code>DASH-04</code> → Widget Pomodoro del Dashboard</div>
      <div><code>FIN-02</code> → Nav pills de Finanzas</div>
      <div><code>AJUSTES-06</code> → Widgets del Dashboard en Ajustes</div>
    </div>
    <div class="meta">
      Capturas 1080p · tema oscuro · datos de producción local<br />
      ${new Date().toLocaleDateString('es-CL', { dateStyle: 'long' })}
    </div>
  </section>

  <section class="toc">
    <h1>Índice de pantallas</h1>
    <div class="howto">
      <strong>Cómo usar este PDF:</strong> al pedir un cambio, indica el código de la sección
      (p.ej. <em>«modifica DASH-02 Hero y TAREAS-01 Top bar»</em>. Cada pantalla repite su mapa de secciones debajo de la captura.
    </div>
    <table>
      <thead><tr><th>Código</th><th>Pantalla</th><th>Secciones</th></tr></thead>
      <tbody>${indexRows}</tbody>
    </table>

    <h1>Todas las secciones</h1>
    <table>
      <thead><tr><th>Código</th><th>Sección</th><th>Pantalla</th></tr></thead>
      <tbody>${allSectionRows}</tbody>
    </table>
  </section>

  ${pages}
</body>
</html>`;
}

async function main() {
  const html = buildHtml();
  const tmp = path.join(ROOT, 'captura de pantalla', '.catalogo-secciones.html');
  fs.writeFileSync(tmp, html, 'utf8');
  console.log('HTML:', tmp, `(${(html.length / 1024).toFixed(0)} KB)`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--print-to-pdf-no-header'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(`file:///${tmp.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });
    await page.pdf({
      path: OUT_PDF,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%;font-size:8px;color:#94a3b8;padding:0 12mm;font-family:Segoe UI,sans-serif;">
        Quincha Systems · Catálogo de secciones
      </div>`,
      footerTemplate: `<div style="width:100%;font-size:8px;color:#94a3b8;padding:0 12mm;font-family:Segoe UI,sans-serif;display:flex;justify-content:space-between;">
        <span>Capturas 1080p</span><span>Página <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
    });
    console.log('PDF:', OUT_PDF, `(${(fs.statSync(OUT_PDF).size / 1024).toFixed(0)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
