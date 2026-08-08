# Depósito / conexión a producción — Quincha Systems

Cómo conectar y desplegar a https://quincha.cl desde este equipo (Windows).

## Acceso

| Dato        | Valor                                              |
|-------------|----------------------------------------------------|
| Dominio     | https://quincha.cl / ssh.quincha.cl                 |
| Puerta SSH  | localhost:2222 (vía túnel Cloudflare)               |
| Usuario     | serverpi                                            |
| Proyecto    | `/home/serverpi/quincha-systems`                    |
| Servicio    | `quincha-systems` (systemd, `sudo systemctl restart quincha-systems`) |
| Puerto app  | 5173 (interno)                                      |
| Error común | 404 sin build → falta `dist/` en el server          |

Las credenciales reales están en `scripts/quincha-creds.env` (gitignoreado),
nunca commiteadas. Referencia de valores en `scripts/quincha-creds.env.example`.

## 1) Abrir túnel Cloudflare (lo hace el usuario)

El túnel lo levanta el dueño del equipo en su terminal:

    cloudflared access tcp --hostname ssh.quincha.cl --url localhost:2222

No lanzarlo yo desde opencode (puede bloquear la consola). Confirmar que
`Get-NetTCPConnection -LocalPort 2222 -State Listen` responde antes de conectar.

## 2) Conectarme / verificar

```
./scripts/quincha-connect.ps1         # ping
./scripts/quincha-connect.ps1 -Action status
./scripts/quincha-connect.ps1 -RemoteCmd "systemctl status quincha-systems --no-pager | head"
```

## 3) Desplegar (build + subida + reinicio)

```
./scripts/quincha-connect.ps1 -Action deploy
```

Qué hace el script:
1. `npm run build` local.
2. Backup remoto: `cp -r dist dist_backup`.
3. Limpia `dist/assets` viejos y sube el nuevo `dist/` con `pscp`.
4. `sudo systemctl restart quincha-systems`.

## Verificación post-deploy

- `curl https://quincha.cl` (PHP 200 + referencia al hash del JS nuevo).
- Comparar tamaño del bundle servido vs local:
  `(Get-Item dist\assets\index-*.js).Length` contra el remoto.

## Notas históricas

- El server NO es repo git: se despliega por SFTP/pscp.
- Dashboard y calendario usan contextos locales (localStorage); el deploy
  solo reemplaza el frontend en `dist/`, no toca `server/data` (cuentas/sesiones).