import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const VIEWS = [
  'login', 'dashboard', 'pomodoro', 'bujo', 'health', 
  'tareas', 'habitos', 'calendario', 'finanzas', 
  'actividad', 'estadisticas', 'mensajes', 'ajustes'
];

async function run() {
  console.log('Iniciando Puppeteer Core (Edge)...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new'
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  
  const screenshotsDir = path.join(process.cwd(), 'capturas_light');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const images = [];

  try {
    console.log('Navegando a localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    for (const view of VIEWS) {
      console.log(`Capturando vista: ${view}`);
      
      await page.evaluate((v) => {
        // Forzar tema claro
        document.documentElement.setAttribute('data-theme', 'light');
        
        if (v !== 'login') {
          window.dispatchEvent(new Event('quincha-auth'));
          window.dispatchEvent(new CustomEvent('change-view', { detail: v }));
        }
      }, view);
      
      // Esperar animaciones
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fileName = `${view}.png`;
      const filePath = path.join(screenshotsDir, fileName);
      await page.screenshot({ path: filePath });
      images.push(fileName);
    }
    
    console.log('Generando PDF...');
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: white;
    }
    .page {
      width: 21.59cm;
      height: 27.94cm;
      padding: 1cm;
      box-sizing: border-box;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 1cm;
      page-break-after: always;
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
      font-family: sans-serif;
    }
    .screenshot-container img {
      max-width: 100%;
      max-height: 11cm;
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
          <img src="file:///${path.join(screenshotsDir, img).replace(/\\/g, '/')}" alt="${img}">
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>
    `;
    
    // Save temp HTML
    const tempHtmlPath = path.join(process.cwd(), 'temp_print.html');
    fs.writeFileSync(tempHtmlPath, htmlContent);
    
    // Convert to PDF
    const printPage = await browser.newPage();
    await printPage.goto(`file:///${tempHtmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    
    const pdfPath = path.join(process.cwd(), 'Capturas_Sistema_Claro.pdf');
    await printPage.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    
    // Cleanup HTML
    fs.unlinkSync(tempHtmlPath);
    console.log(`¡PDF generado con éxito en: ${pdfPath}!`);
    
  } catch (error) {
    console.error('Error durante la captura:', error);
  } finally {
    await browser.close();
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
