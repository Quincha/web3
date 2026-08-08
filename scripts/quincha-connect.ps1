# ─────────────────────────────────────────────────────────────
# Quincha Systems - Conector remoto (script helper)
# Uso:
#   ./scripts/quincha-connect.ps1                -> prueba conexión (ping)
#   ./scripts/quincha-connect.ps1 -RemoteCmd "whoami"
#   ./scripts/quincha-connect.ps1 -Action status
#   ./scripts/quincha-connect.ps1 -Action deploy    # build + sube dist/ + reinicia
#
# Requisitos:
#   1) El túnel Cloudflare debe estar activo en localhost:2222
#      Lo abre el usuario con:
#        cloudflared access tcp --hostname ssh.quincha.cl --url localhost:2222
#   2) Credenciales en scripts/quincha-creds.env (ver quincha-creds.env.example)
# ─────────────────────────────────────────────────────────────
param(
  [Parameter(Position = 0)]
  [string]$Action = "ping",

  [Parameter(Position = 1)]
  [string]$RemoteCmd = ""
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Cargar credenciales ───────────────────────────────────────
$credsFile = Join-Path $scriptRoot 'quincha-creds.env'
if (-not (Test-Path $credsFile)) {
  Write-Host "Falta $credsFile. Copia quincha-creds.env.example -> quincha-creds.env y completa." -ForegroundColor Red
  exit 1
}
foreach ($line in Get-Content $credsFile) {
  if ($line -notmatch '^\s*(#|$)' -and $line.Contains('=')) {
    $k, $v = $line.Split('=', 2)
    [Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim().Trim('"'))
  }
}

$hostName = $env:QUINCHA_HOST
$port     = $env:QUINCHA_PORT
$user     = $env:QUINCHA_USER
$pass     = $env:QUINCHA_PASS
$hostkey  = $env:QUINCHA_HOSTKEY

if (-not ($hostName -and $pass)) {
  Write-Host "Faltan variables QUINCHA_* en $credsFile" -ForegroundColor Red
  exit 1
}

$plink = 'C:\Program Files\PuTTY\plink.exe'
$pscp  = 'C:\Program Files\PuTTY\pscp.exe'
if (-not (Test-Path $plink)) { Write-Host 'plink no encontrado. Instala PuTTY.' -ForegroundColor Red; exit 1 }

function Invoke-QuinchaSsh([string]$remoteCmd) {
  & $plink -P $port -batch -hostkey $hostkey "$user@$hostName" -pw $pass $remoteCmd
}

# ── Acciones ─────────────────────────────────────────────────
switch ($Action.ToLower()) {
  'ping' {
    Write-Host "Conectando a $user@$hostName`:$port ..." -ForegroundColor Cyan
    Invoke-QuinchaSsh 'echo QUINCHA_REMOTA_OK; hostname; whoami; echo "dir: $(pwd)"'
  }
  'status' {
    Write-Host '[servicio]' -ForegroundColor Cyan
    Invoke-QuinchaSsh 'systemctl is-active quincha-systems'
    Write-Host '[assets en dist]' -ForegroundColor Cyan
    Invoke-QuinchaSsh 'ls /home/serverpi/quincha-systems/dist/assets | wc -l'
  }
  'deploy' {
    $repoRoot = Join-Path $scriptRoot '..'
    Write-Host '1) Build local' -ForegroundColor Cyan
    Push-Location $repoRoot
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host 'Build falló. Aborto.' -ForegroundColor Red; Pop-Location; exit 1 }
    Pop-Location

    Write-Host '2) Backup remoto de dist/' -ForegroundColor Cyan
    Invoke-QuinchaSsh 'cd /home/serverpi/quincha-systems && rm -rf dist_backup && cp -r dist dist_backup'

    Write-Host '3) Limpiar assets viejos' -ForegroundColor Cyan
    Invoke-QuinchaSsh 'cd /home/serverpi/quincha-systems && rm -rf dist/assets/*'

    Write-Host '4) Subir archivos por pscp' -ForegroundColor Cyan
    & $pscp -P $port -batch -hostkey $hostkey -pw $pass 'dist\index.html' "${user}@${hostName}:/home/serverpi/quincha-systems/dist/index.html"
    & $pscp -P $port -batch -hostkey $hostkey -pw $pass 'dist\assets\*' "${user}@${hostName}:/home/serverpi/quincha-systems/dist/assets"
    foreach ($f in @('f232.png','favicon.svg','hero_aurora.png','hero_aurora_wide.png','icons.svg')) {
      & $pscp -P $port -batch -hostkey $hostkey -pw $pass "dist\$f" "${user}@${hostName}:/home/serverpi/quincha-systems/dist/$f"
    }

    Write-Host '5) Reiniciando servicio' -ForegroundColor Cyan
    Invoke-QuinchaSsh 'sudo systemctl restart quincha-systems && systemctl is-active quincha-systems'

    Write-Host 'Deploy completado. Revisar https://quincha.cl' -ForegroundColor Green
  }
  default {
    Write-Host "Acción desconocida: $Action" -ForegroundColor Yellow
    Write-Host 'Uso: ./scripts/quincha-connect.ps1 [ping|status|deploy] [RemoteCmd]'
  }
}