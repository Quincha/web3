# Depósito / conexión a producción — Quincha Systems

Cómo conectar y desplegar a https://quincha.cl desde este equipo (Windows).

## Acceso

| Dato        | Valor                                              |
|-------------|----------------------------------------------------|
| Dominio     | https://quincha.cl / ssh.quincha.cl                 |
| Puerta SSH  | 127.0.0.1:2222 (vía túnel Cloudflare, forzar IPv4)  |
| Usuario     | serverpi                                            |
| Auth        | Clave SSH `~/.ssh/id_ed25519_quincha` (OpenSSH)     |
| Proyecto    | `/home/serverpi/quincha-systems`                    |
| Servicio    | `quincha-systems` (systemd, NOPASSWD para systemctl)|
| Node remoto | `/home/serverpi/.local/node24/bin/node` (v24)       |
| Error común | 404 sin build → falta `dist/` en el server          |

Credenciales: `scripts/quincha-creds.env` (gitignoreado). Plantilla: `scripts/quincha-creds.env.example`.

**Importante:** usar `127.0.0.1` (no `localhost`): OpenSSH resuelve `localhost` a `::1` y cloudflared solo escucha en IPv4.

## 1) Abrir túnel Cloudflare (lo hace el usuario)

```
cloudflared access tcp --hostname ssh.quincha.cl --url localhost:2222
```

Confirmar: `Get-NetTCPConnection -LocalPort 2222 -State Listen`.

## 2) Conectar / verificar

```
./scripts/quincha-connect.ps1                  # ping
./scripts/quincha-connect.ps1 status           # servicio + assets + node
./scripts/quincha-connect.ps1 run "whoami"     # comando remoto
./scripts/quincha-connect.ps1 sync-check       # comparar local vs remoto (md5)
```

## 3) Flujo de trabajo local → producción

1. **Dev local:**
   - Front: `npm run dev` (Vite, proxy `/api` → `localhost:3000`)
   - Backend: `npm run dev:server` (Express, puerto 3000)
2. **Verificar:** `npx tsc -b` y `npx oxlint src/...` (o `npm run lint`)
3. **Comparar (opcional):** `./scripts/quincha-connect.ps1 sync-check`
4. **Desplegar:**
   ```
   ./scripts/quincha-connect.ps1 deploy
   ```

Qué hace `deploy`:
1. `npm run build` local (`tsc -b && vite build`).
2. Backup remoto: `cp -r dist dist_backup`.
3. Limpia `dist/assets/*` y sube el nuevo `dist/` con `scp`.
4. Sube backend: `index.js`, `gcal.js`, `db.js`, `add_audit.js`, `auth.js`, `recordings.js`, `recordingsAi.js`.
5. `sudo -n systemctl restart quincha-systems` (NOPASSWD).

## Verificación post-deploy

- `./scripts/quincha-connect.ps1 sync-check` → `dist/` debe quedar sincronizado.
- Abrir https://quincha.cl y comprobar el hash del JS en el HTML.

## Notas

- El server **sí** tiene un repo git parcial (solo `dist/` y `server/`); no tiene `src/` frontend. El código fuente vive en este equipo.
- `server/data/` (DB, sesiones) **no se toca** en deploy.
- Backend local y remoto deben ser idénticos salvo CRLF; `sync-check` usa md5 (CRLF local puede marcar “distinto” aunque el contenido sea el mismo).
- Archivos `.bak_*` en el remoto son basura de mantenimiento; se ignoran.
- **Grabaciones Colaborativas (IA):** para transcripción, resumen y cuestionario automáticos, definir `GEMINI_API_KEY` (y opcional `GEMINI_MODEL`, por defecto `gemini-2.5-flash`) en el entorno del servicio `quincha-systems` (systemd `Environment=` / `EnvironmentFile=`). Sin la clave el módulo sigue funcionando con transcripción manual.
