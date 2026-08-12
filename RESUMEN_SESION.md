# Resumen de sesión — web3 (Quincha Systems)

Última actualización: 12-08-2026. Para retomar desde otro equipo, leer este archivo + `DEPLOY.md`.

## Estado actual (resumen ejecutivo)

- App React 19 + TS + Vite en `D:\Programacion\web3`; backend Node en `server/`. Producción: https://quincha.cl (Raspberry Pi remota).
- **La DB local NO es producción.** Los datos reales viven solo en el server remoto (`/home/serverpi/quincha-systems/server/data/quincha.db`). Para tocar datos: SSH vía `scripts/quincha-connect.ps1`.
- Verificación estándar: `npx tsc -b` y `npx oxlint src/...`. Deploy: `powershell -ExecutionPolicy Bypass -File scripts\quincha-connect.ps1 deploy`.

## Módulo Diseños / Bordados (código nuevo, DESPLEGADO)

Feature completa: catálogo de bordados con vista previa fotorrealista estilo Wilcom TrueView.

### Backend (`server/src/design.js` + endpoints en `index.js`)
- `design.js` sin dependencias: parsea JEF / DST / PES (fiel a pyembroidery), renderiza PNG, genera ZIP, multipart mínimo. Los 15 tests de `server/test/design-smoke.test.js` pasan (fixtures reales de pyembroidery con coordenadas exactas).
- Endpoints (todos requieren login):
  - `POST /api/design/preview` → `dataUrl` PNG. Query: `size`, `mode` (`bordado` | `puntos`). **La UI pide `size=640&mode=bordado`.**
  - `POST /api/design/save` · `GET /api/designs` · `GET /api/design/:id` · `DELETE /api/design/:id` · `GET /api/design/:id/download`.
  - Archivos persistidos en `DATA_DIR/designs/<userId>/<id>.<ext>`; metadatos (id, nombre, formato, stitches, colores) en tabla `designs` de `db.js`.
- Preview borrado (sombra/bordes) **por defecto**: la imagen guardada es el PNG renderizado (con o sin bordes según `mode`). No se guarda el .JEF original como preview.

### Render TrueView (última iteración — IMPORTANTE para no romper el 524)
- Estilo: hilos finos e individuales (radio ≈ `1.8 * escala`, cap 0.7–2.2 px), iluminación difusa suave, sombra/borde apenas oscurecidos (0.72–0.85× base, alpha 45–60), fondo de tela twill con ruido determinista.
- **Crítico**: el render DEBE ser de una sola pasada por puntada (`drawThread` + `capsuleCoverage`, antialiasing analítico). El supersampling 2× que probé antes provocó **Error 524 de Cloudflare** (timeout del origin ~100s) porque `size=640` con diseños densos tardaba minutos. Fix desplegado: ~300ms para 100k puntadas a 640px.
- `mode='puntos'` sigue siendo el esquema gris fino 1px sin cambios.

### Frontend (`src/components/dashboard/DesignsModule.tsx` + `ApiClient.ts`)
- Galería con thumbnails (`GALLERY_SIZE=240`, mode `bordado`), vista ampliada (`designGet id, size, mode`), descarga (`designDownload`), borrado (`designDelete`) y guardado del diseño actual (`saveCurrent` → `designSave`).
- Tipo `SavedDesign` en `ApiClient.ts`. Icono usado: `Palette` (lucide; `Stitch` no existe).

## Finanzas — deuda Jose Covili (producción, desplegado)

- Deuda cargada directo a la DB de producción (Por Cobrar, 1.300.000; pagado 107.000; saldo 1.193.000; vence 2026-08-11; prioridad Alta) con 3 abonos: 7.000 + 50.000 + 50.000 (fecha 2026-08-11). Se conservó la deuda existente "Mamá" (Por Pagar 12.500).
- Backup en store: `backup:finance:pre_josecovili`.
- Feature nueva: historial de abonos en el tipo `Deuda` (`payments?: Abono[]`), helper `addPago` en `FinanceContext`, y modal de abono + lista de pagos en `DebtsBalanceView` (se eliminó el `window.prompt`).

## Historial de la sesión (referencia)

- Auditoría "semanas empiezan en lunes": OK en CalendarWidget, HabitsWidget, ProductivityWidget, CalendarModule, BujoModule, BandHistory/Context, HabitsModule.
- Fix en `StatisticsModule.tsx`: la tarjeta "Enfoque de la semana (Pomodoro)" usaba ventana móvil de 7 días; ahora se ancla al lunes y el total usa `weekWorkMinutes` (solo la semana calendario).
- Carga masiva de tareas previa (11-08): 18 tareas + 6 proyectos, todas con `dueDate=2026-08-11` para migrarlas día a día. Backups `backup:tasks:pre_batch` y `backup:tasks:pre_duedate`.

## Pendientes / dudas

- El usuario estaba validando el render TrueView en el catálogo (quincha.cl). Revisar que los thumbnails y la vista ampliada se vean bien tras el fix del 524.
- El front no parsea la codificación de carga masiva (eso se hizo con scripts manuales). No está implementado como feature de la app.
- Sin commits: el repo tiene muchos archivos modificados/sin seguimiento desde la sesión (ver `git status`). El usuario suele no pedir commits; si se pide, commitear en chunks coherentes (diseños, finanzas, fixes).

## Cómo conectar a producción (recordatorio)

1. Túnel: `cloudflared access tcp --hostname ssh.quincha.cl --url localhost:2222` (debe estar abierto).
2. `powershell -ExecutionPolicy Bypass -File scripts\quincha-connect.ps1 ping` (test) · `status` · `deploy` · `run "comando"`.
3. Node remoto correcto: `/home/serverpi/.local/node24/bin/node` (el `node` del PATH es v20 sin `node:sqlite`).
4. Credenciales en `scripts/quincha-creds.env` (no subir al repo; existe `.example`).
