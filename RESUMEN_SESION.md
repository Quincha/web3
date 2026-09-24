# Resumen de sesión — web3 (Quincha Systems)

Última actualización: 12-08-2026. Para retomar desde otro equipo, leer este archivo + `DEPLOY.md`.

## Estado actual (resumen ejecutivo)

- App React 19 + TS + Vite en el repo local; backend Node en `server/`. Producción: https://quincha.cl (Raspberry Pi remota).
- **La DB local NO es producción.** Los datos reales viven solo en el server remoto (`/home/serverpi/quincha-systems/server/data/quincha.db`). Para tocar datos: SSH vía `scripts/quincha-connect.ps1`.
- Verificación estándar: `npx tsc -b` y `npx oxlint src/...`. Deploy: `./scripts/quincha-connect.ps1 deploy` (OpenSSH + clave).
- **Módulo Diseños/Bordados eliminado** del código (frontend, API y backend). No desplegar versiones que lo incluyan.

## Finanzas — deuda Jose Covili (producción, desplegado)

- Deuda cargada directo a la DB de producción (Por Cobrar, 1.300.000; pagado 107.000; saldo 1.193.000; vence 2026-08-11; prioridad Alta) con 3 abonos: 7.000 + 50.000 + 50.000 (fecha 2026-08-11). Se conservó la deuda existente "Mamá" (Por Pagar 12.500).
- Backup en store: `backup:finance:pre_josecovili`.
- Feature nueva: historial de abonos en el tipo `Deuda` (`payments?: Abono[]`), helper `addPago` en `FinanceContext`, y modal de abono + lista de pagos en `DebtsBalanceView` (se eliminó el `window.prompt`).

## Historial de la sesión (referencia)

- Auditoría "semanas empiezan en lunes": OK en CalendarWidget, HabitsWidget, ProductivityWidget, CalendarModule, BujoModule, BandHistory/Context, HabitsModule.
- Fix en `StatisticsModule.tsx`: la tarjeta "Enfoque de la semana (Pomodoro)" usaba ventana móvil de 7 días; ahora se ancla al lunes y el total usa `weekWorkMinutes` (solo la semana calendario).
- Carga masiva de tareas previa (11-08): 18 tareas + 6 proyectos, todas con `dueDate=2026-08-11` para migrarlas día a día. Backups `backup:tasks:pre_batch` y `backup:tasks:pre_duedate`.

## Pendientes / dudas

- El front no parsea la codificación de carga masiva (eso se hizo con scripts manuales). No está implementado como feature de la app.
- Sin commits pendientes de este cambio: esperar confirmación del usuario para commitear y hacer `deploy` (no commitear hasta que lo pida).

## Cómo conectar a producción (recordatorio)

1. Túnel: `cloudflared access tcp --hostname ssh.quincha.cl --url localhost:2222` (debe estar abierto).
2. Auth: clave SSH `~/.ssh/id_ed25519_quincha` (OpenSSH, forzar `127.0.0.1` — no `localhost`/IPv6).
3. Comandos: `./scripts/quincha-connect.ps1 ping|status|sync-check|deploy|run "..."`.
4. Node remoto correcto: `/home/serverpi/.local/node24/bin/node` (el `node` del PATH es v20 sin `node:sqlite`).
5. Credenciales en `scripts/quincha-creds.env` (gitignored; plantilla `.example`).
6. Flujo: dev local (`npm run dev` + `npm run dev:server`) → `sync-check` → `deploy`.
7. Ver `DEPLOY.md` para el detalle completo.
