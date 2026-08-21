import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

function run() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'quincha.db');
    const db = new DatabaseSync(dbPath);

    // Get all tables
    const tablesQuery = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = tablesQuery.all();

    let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Base de Datos - Quincha Systems</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #f4f4f9; padding: 20px; color: #333; }
        h1 { color: #111821; border-bottom: 2px solid #16F0B5; padding-bottom: 10px; }
        h2 { color: #3A4F6B; margin-top: 40px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 14px; }
        th { background-color: #111821; color: #fff; position: sticky; top: 0; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .empty { color: #888; font-style: italic; }
      </style>
    </head>
    <body>
      <h1>Visualizador de Base de Datos - Quincha Systems</h1>
      <p>Ruta: <code>${dbPath}</code></p>
    `;

    for (const { name: tableName } of tables) {
      html += `<h2>Tabla: <code>${tableName}</code></h2>`;
      
      const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
      
      if (rows.length === 0) {
        html += `<p class="empty">La tabla está vacía.</p>`;
        continue;
      }
      
      const columns = Object.keys(rows[0]);
      
      html += `<table><thead><tr>`;
      for (const col of columns) {
        html += `<th>${col}</th>`;
      }
      html += `</tr></thead><tbody>`;
      
      for (const row of rows) {
        html += `<tr>`;
        for (const col of columns) {
          let val = row[col];
          if (val === null) val = '<i>null</i>';
          else if (typeof val === 'object') val = JSON.stringify(val);
          html += `<td>${val}</td>`;
        }
        html += `</tr>`;
      }
      
      html += `</tbody></table>`;
    }

    html += `
    </body>
    </html>
    `;

    const outPath = path.join(process.cwd(), '..', 'Base_de_Datos.html');
    fs.writeFileSync(outPath, html);
    console.log(`¡Base de datos exportada con éxito en ${outPath}!`);
    
    db.close();
  } catch (err) {
    console.error("Error al volcar la base de datos:", err);
  }
}

run();
