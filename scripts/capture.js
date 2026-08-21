import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const VIEWS = [
  'login',
  'dashboard', 'pomodoro', 'bujo', 'health', 'tareas', 
  'habitos', 'calendario', 'documentos', 'finanzas', 
  'shopping', 'proyectos', 'actividad', 'clientes', 
  'estadisticas', 'mensajes', 'ajustes', 'band', 'disenos'
];

async function run() {
  console.log('Iniciando servidor vite...');
  const server = exec('npm run dev');
  
  // Esperar a que el servidor arranque
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  console.log('Iniciando Puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  const screenshotsDir = path.join(process.cwd(), 'capturas');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const images = [];

  try {
    console.log('Navegando a localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    for (const view of VIEWS) {
      console.log(`Capturando vista: ${view}`);
      
      if (view !== 'login') {
        await page.evaluate((v) => {
          window.dispatchEvent(new Event('quincha-auth'));
          window.dispatchEvent(new CustomEvent('change-view', { detail: v }));
        }, view);
      }
      
      // Esperar animaciones
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fileName = `${view}.png`;
      const filePath = path.join(screenshotsDir, fileName);
      await page.screenshot({ path: filePath, fullPage: true });
      images.push(fileName);
    }
    
    // Generar HTML para imprimir
    console.log('Generando documento HTML...');
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Capturas del Sistema Quincha</title>
  <style>
    body {
      font-family: sans-serif;
      margin: 0;
      padding: 0;
      background: #f0f0f0;
    }
    .page {
      width: 21cm;
      min-height: 29.7cm;
      padding: 1cm;
      margin: 1cm auto;
      background: white;
      box-shadow: 0 0 5px rgba(0,0,0,0.1);
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 1cm;
      box-sizing: border-box;
      page-break-after: always;
    }
    @media print {
      body, .page {
        margin: 0;
        box-shadow: none;
        background: transparent;
      }
      .page {
        padding: 0.5cm;
      }
    }
    .screenshot-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid #ddd;
      padding: 5px;
      height: 100%;
      box-sizing: border-box;
    }
    .screenshot-container h3 {
      margin: 0 0 5px 0;
      font-size: 14px;
      text-transform: capitalize;
    }
    .screenshot-container img {
      max-width: 100%;
      max-height: 12.5cm;
      object-fit: contain;
      border: 1px solid #eee;
    }
  </style>
</head>
<body>
  ${chunkArray(images, 4).map(chunk => `
    <div class="page">
      ${chunk.map(img => `
        <div class="screenshot-container">
          <h3>${img.replace('.png', '')}</h3>
          <img src="capturas/${img}" alt="${img}">
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>
    `;
    
    fs.writeFileSync(path.join(process.cwd(), 'imprimir_capturas.html'), htmlContent);
    console.log('¡Proceso completado con éxito!');
    
  } catch (error) {
    console.error('Error durante la captura:', error);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

run();
