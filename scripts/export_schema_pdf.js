import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('Iniciando exportación de diagramas a PDF...');
  
  const erDiagram = `
erDiagram
    users {
        INTEGER id PK "AUTOINCREMENT"
        TEXT username "NOT NULL UNIQUE"
        TEXT password_hash "NOT NULL"
        TEXT role "NOT NULL DEFAULT 'user'"
        TEXT name "NOT NULL DEFAULT ''"
    }
    sessions {
        TEXT token PK
        INTEGER user_id FK "NOT NULL ON DELETE CASCADE"
    }
    configs {
        INTEGER user_id PK, FK "ON DELETE CASCADE"
        TEXT data "NOT NULL DEFAULT '{}'"
    }
    store {
        INTEGER user_id PK, FK "NOT NULL ON DELETE CASCADE"
        TEXT key PK "NOT NULL"
        TEXT data "NOT NULL"
    }
    gcal_tokens {
        INTEGER user_id PK, FK "ON DELETE CASCADE"
        TEXT access_token "NOT NULL"
    }
    gcal_watch {
        INTEGER user_id PK, FK "ON DELETE CASCADE"
        TEXT channel_id "NOT NULL"
    }
    designs {
        TEXT id PK
        INTEGER user_id FK "NOT NULL ON DELETE CASCADE"
        TEXT format "NOT NULL"
        TEXT colors "NOT NULL"
    }

    users ||--o{ sessions : "tiene"
    users ||--o| configs : "posee configuración"
    users ||--o{ store : "guarda items en store"
    users ||--o| gcal_tokens : "vincula token"
    users ||--o| gcal_watch : "mantiene suscripción"
    users ||--o{ designs : "crea diseños"
  `;

  const mvcDiagram = `
flowchart TD
    subgraph View ["Vista (View) - Frontend React"]
        UI[Componentes UI\\n(Widgets, Módulos)]
        Layout[DashboardLayout\\nApp.tsx]
        Styles[CSS y Tema]
    end

    subgraph Controller ["Controlador (Controller) - Lógica y API"]
        Contexts[React Contexts\\n(Gestión de Estado)]
        Sync[DataSyncService\\nSyncQueueService]
        Express[Servidor Express\\nRutas de API]
    end

    subgraph Model ["Modelo (Model) - Datos y Persistencia"]
        LocalCache[(LocalStorage Cache)]
        SQLite[(Base de Datos SQLite\\nquincha.db)]
    end

    UI -->|Eventos de usuario| Contexts
    Layout -->|Renderiza| UI
    
    Contexts -->|Actualiza UI| UI
    Contexts -->|Lee/Escribe estado| LocalCache
    Contexts -->|Despacha mutaciones| Sync
    
    Sync -->|Peticiones HTTP| Express
    Express -->|Consultas SQL| SQLite
    SQLite -->|Resultados| Express
    Express -->|Respuestas JSON| Sync
    Sync -->|Resuelve cola| Contexts
  `;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Arquitectura y Esquema - Quincha Systems</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: sans-serif;
    }
    .page {
      width: 21.59cm;
      height: 27.94cm;
      padding: 2cm;
      box-sizing: border-box;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 { text-align: center; color: #111821; border-bottom: 3px solid #16F0B5; padding-bottom: 10px; width: 100%; }
    p.desc { color: #64748B; font-size: 14px; text-align: center; margin-bottom: 30px; }
    .mermaid {
      display: flex;
      justify-content: center;
      width: 100%;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</head>
<body>
  
  <!-- Página 1: Base de Datos -->
  <div class="page">
    <h1>Diagrama Entidad-Relación (Base de Datos)</h1>
    <p class="desc">Esquema visual de las tablas SQLite y sus relaciones relacionales.</p>
    <div class="mermaid">
      ${erDiagram}
    </div>
  </div>

  <!-- Página 2: Modelo Vista Controlador -->
  <div class="page">
    <h1>Arquitectura Modelo-Vista-Controlador (MVC)</h1>
    <p class="desc">Mapeo del patrón arquitectónico en el sistema distribuido (React + Express).</p>
    <div class="mermaid">
      ${mvcDiagram}
    </div>
  </div>

</body>
</html>
  `;

  const tempHtmlPath = path.join(process.cwd(), 'temp_schema_mvc.html');
  fs.writeFileSync(tempHtmlPath, htmlContent);

  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: 'new'
    });
    
    const page = await browser.newPage();
    await page.goto(`file:///${tempHtmlPath.replace(/\\\\/g, '/')}`, { waitUntil: 'networkidle0' });
    
    // Give mermaid time to finish SVG rendering
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pdfPath = path.join(process.cwd(), 'Arquitectura_y_BaseDeDatos.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    
    console.log(`¡Documentos generados con éxito en: ${pdfPath}!`);
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    fs.unlinkSync(tempHtmlPath);
  }
}

run();
