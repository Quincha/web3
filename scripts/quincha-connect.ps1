# ─────────────────────────────────────────────────────────────
# Quincha Systems - Conector remoto (OpenSSH + clave SSH)
# Uso:
#   ./scripts/quincha-connect.ps1                -> ping
#   ./scripts/quincha-connect.ps1 -Action status
#   ./scripts/quincha-connect.ps1 -Action sync-check
#   ./scripts/quincha-connect.ps1 -Action deploy
#   ./scripts/quincha-connect.ps1 -Action run -RemoteCmd "whoami"
#
# Requisitos:
#   1) Túnel Cloudflare activo en localhost:2222
#        cloudflared access tcp --hostname ssh.quincha.cl --url localhost:2222
#   2) Clave SSH: %USERPROFILE%\.ssh\id_ed25519_quincha (autorizada en el server)
#   3) Credenciales opcionales en scripts/quincha-creds.env (fallback password)
# ─────────────────────────────────────────────────────────────
param(
  [Parameter(Position = 0)]
  [string]$Action = "ping",

  [Parameter(Position = 1)]
  [string]$RemoteCmd = ""
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Join-Path $scriptRoot '..'
$remoteRoot = '/home/serverpi/quincha-systems'

# ── Cargar credenciales (opcionales; clave SSH es el auth principal)
$credsFile = Join-Path $scriptRoot 'quincha-creds.env'
if (Test-Path $credsFile) {
  foreach ($line in Get-Content $credsFile) {
    if ($line -notmatch '^\s*(#|$)' -and $line.Contains('=')) {
      $k, $v = $line.Split('=', 2)
      [Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim().Trim('"'))
    }
  }
}

$port = if ($env:QUINCHA_PORT) { $env:QUINCHA_PORT } else { '2222' }
$user = if ($env:QUINCHA_USER) { $env:QUINCHA_USER } else { 'serverpi' }
# Forzar IPv4: cloudflared solo escucha en 127.0.0.1 (no ::1)
$target = '127.0.0.1'
$keyPath = Join-Path $env:USERPROFILE '.ssh\id_ed25519_quincha'

if (-not (Test-Path $keyPath)) {
  Write-Host "Falta la clave SSH: $keyPath" -ForegroundColor Red
  Write-Host 'Genera con: ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519_quincha" -N ""' -ForegroundColor Yellow
  exit 1
}

$sshBase = @('-4', '-i', $keyPath, '-p', $port, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', "$user@$target")
$scpBase = @('-4', '-i', $keyPath, '-P', $port, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10')

function Invoke-QuinchaSsh([string]$remoteCmd) {
  & ssh @sshBase $remoteCmd
}

function Invoke-QuinchaScp([string[]]$localPaths, [string]$remoteDest) {
  & scp @scpBase @localPaths "${user}@${target}:${remoteDest}"
}

function Assert-QuinchaOk([string]$label) {
  if ($LASTEXITCODE -ne 0) {
    Write-Host "FALLO en '$label'. Abortando (remoto intacto)." -ForegroundColor Red
    exit 1
  }
}

function Get-LocalMd5([string]$path) {
  (Get-FileHash -Path $path -Algorithm MD5).Hash.ToLower()
}

# ── Acciones ─────────────────────────────────────────────────
switch ($Action.ToLower()) {
  'ping' {
    Write-Host "Conectando a $user@$target`:$port ..." -ForegroundColor Cyan
    Invoke-QuinchaSsh 'echo QUINCHA_REMOTA_OK; hostname; whoami; pwd'
    Assert-QuinchaOk 'ping'
  }
  'status' {
    Write-Host '[servicio]' -ForegroundColor Cyan
    Invoke-QuinchaSsh 'systemctl is-active quincha-systems'
    Write-Host '[assets en dist]' -ForegroundColor Cyan
    Invoke-QuinchaSsh "ls $remoteRoot/dist/assets | wc -l"
    Write-Host '[node remoto]' -ForegroundColor Cyan
    Invoke-QuinchaSsh '/home/serverpi/.local/node24/bin/node --version 2>/dev/null || node --version'
  }
  'run' {
    if (-not $RemoteCmd) {
      Write-Host 'Falta el comando: ./scripts/quincha-connect.ps1 run "ls -la"' -ForegroundColor Yellow
      exit 1
    }
    Invoke-QuinchaSsh $RemoteCmd
  }
  'sync-check' {
    Write-Host '=== Comparación local vs remoto ===' -ForegroundColor Cyan

    # 1) server/src
    Write-Host "`n[server/src]" -ForegroundColor Cyan
    $localFiles = Get-ChildItem (Join-Path $repoRoot 'server\src\*') -File
    $remoteMd5Out = Invoke-QuinchaSsh "cd $remoteRoot && md5sum server/src/* 2>/dev/null"
    $remoteMap = @{}
    $remoteMd5Out -split "`n" | ForEach-Object {
      if ($_ -match '^([a-f0-9]+)\s+(\S+)$') {
        $remoteMap[[System.IO.Path]::GetFileName($Matches[2])] = $Matches[1]
      }
    }
    $allNames = @($localFiles | ForEach-Object { $_.Name }) + @($remoteMap.Keys) | Sort-Object -Unique
    $sIgual = 0; $sDist = 0; $sSoloL = 0; $sSoloR = 0
    foreach ($n in $allNames) {
      $lf = $localFiles | Where-Object { $_.Name -eq $n } | Select-Object -First 1
      $lh = if ($lf) { Get-LocalMd5 $lf.FullName } else { $null }
      $rh = $remoteMap[$n]
      if ($lh -and $rh) {
        if ($lh -eq $rh) { $sIgual++; Write-Host "  IGUAL      $n" -ForegroundColor Green }
        else { $sDist++; Write-Host "  DISTINTO   $n" -ForegroundColor Yellow }
      } elseif ($lh) { $sSoloL++; Write-Host "  SOLO-LOCAL $n" -ForegroundColor Magenta }
      else { $sSoloR++; Write-Host "  SOLO-REMOTO $n" -ForegroundColor DarkYellow }
    }
    Write-Host "  => iguales=$sIgual distintos=$sDist solo-local=$sSoloL solo-remoto=$sSoloR"

    # 2) dist (index.html + assets + estáticos)
    Write-Host "`n[dist]" -ForegroundColor Cyan
    $localDist = @{}
    Get-ChildItem (Join-Path $repoRoot 'dist\*') -File -ErrorAction SilentlyContinue | ForEach-Object { $localDist[$_.Name] = Get-LocalMd5 $_.FullName }
    Get-ChildItem (Join-Path $repoRoot 'dist\assets\*') -File -ErrorAction SilentlyContinue | ForEach-Object { $localDist["assets/$($_.Name)"] = Get-LocalMd5 $_.FullName }
    $remoteDistOut = Invoke-QuinchaSsh "cd $remoteRoot && find dist -type f -exec md5sum {} \; 2>/dev/null"
    $remoteDist = @{}
    $remoteDistOut -split "`n" | ForEach-Object {
      if ($_ -match '^([a-f0-9]+)\s+(dist/.+)$') {
        $rel = $Matches[2] -replace '^dist/', ''
        $remoteDist[$rel] = $Matches[1]
      }
    }
    $allDist = @($localDist.Keys) + @($remoteDist.Keys) | Sort-Object -Unique
    $dIgual = 0; $dDist = 0; $dSoloL = 0; $dSoloR = 0
    foreach ($n in $allDist) {
      $lh = $localDist[$n]; $rh = $remoteDist[$n]
      if ($lh -and $rh) {
        if ($lh -eq $rh) { $dIgual++ }
        else { $dDist++; Write-Host "  DISTINTO   $n" -ForegroundColor Yellow }
      } elseif ($lh) { $dSoloL++; Write-Host "  SOLO-LOCAL $n" -ForegroundColor Magenta }
      else { $dSoloR++; Write-Host "  SOLO-REMOTO $n" -ForegroundColor DarkYellow }
    }
    Write-Host "  => iguales=$dIgual distintos=$dDist solo-local=$dSoloL solo-remoto=$dSoloR"
    if ($dIgual -gt 0 -and $dDist -eq 0 -and $dSoloL -eq 0 -and $dSoloR -eq 0) {
      Write-Host "  dist/ sincronizado." -ForegroundColor Green
    } else {
      Write-Host "  dist/ difiere (normal si no has hecho deploy tras cambiar src/)." -ForegroundColor Yellow
    }
  }
  'deploy' {
    Write-Host '1) Build local' -ForegroundColor Cyan
    Push-Location $repoRoot
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host 'Build falló. Aborto.' -ForegroundColor Red; Pop-Location; exit 1 }
    Pop-Location

    Write-Host '2) Backup remoto de dist/' -ForegroundColor Cyan
    Invoke-QuinchaSsh "cd $remoteRoot && rm -rf dist_backup && cp -r dist dist_backup"
    Assert-QuinchaOk 'backup remoto'

    Write-Host '3) Limpiar assets viejos' -ForegroundColor Cyan
    Invoke-QuinchaSsh "cd $remoteRoot && rm -rf dist/assets/*"
    Assert-QuinchaOk 'limpiar assets'

    Write-Host '4) Subir dist/ por scp' -ForegroundColor Cyan
    Invoke-QuinchaScp @('dist\index.html') "$remoteRoot/dist/index.html"
    Assert-QuinchaOk 'subir index.html'
    Invoke-QuinchaScp @('dist\assets\*') "$remoteRoot/dist/assets/"
    Assert-QuinchaOk 'subir assets'
    foreach ($f in @('f232.png','favicon.svg','hero_aurora.png','hero_aurora_wide.png','icons.svg','imprimir.html')) {
      if (Test-Path (Join-Path $repoRoot "dist\$f")) {
        Invoke-QuinchaScp @("dist\$f") "$remoteRoot/dist/$f"
        Assert-QuinchaOk "subir $f"
      }
    }

    Write-Host '4b) Subir backend server/src/*.js' -ForegroundColor Cyan
    foreach ($f in @('index.js','gcal.js','db.js','add_audit.js')) {
      Invoke-QuinchaScp @("server\src\$f") "$remoteRoot/server/src/$f"
      Assert-QuinchaOk "subir $f"
    }

    Write-Host '5) Reiniciando servicio' -ForegroundColor Cyan
    Invoke-QuinchaSsh 'sudo -n /bin/systemctl restart quincha-systems && /bin/systemctl is-active quincha-systems'
    Assert-QuinchaOk 'reiniciar servicio'

    Write-Host 'Deploy completado. Verificar: ./scripts/quincha-connect.ps1 sync-check' -ForegroundColor Green
    Write-Host 'Revisar https://quincha.cl' -ForegroundColor Green
  }
  default {
    Write-Host "Acción desconocida: $Action" -ForegroundColor Yellow
    Write-Host 'Uso: ./scripts/quincha-connect.ps1 [ping|status|sync-check|deploy|run] [RemoteCmd]'
  }
}
