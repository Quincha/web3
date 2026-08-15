#!/usr/bin/env bash
# Dependencias de sistema para compilar la app de escritorio Tauri en Ubuntu/Debian.
# Ejecutar: sudo bash scripts/setup-desktop-deps.sh
set -euo pipefail

echo "==> Instalando dependencias de Tauri 2 (Linux/WebKitGTK)…"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential \
  pkg-config \
  curl \
  wget \
  file \
  libssl-dev \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libxdo-dev \
  patchelf

echo "==> Dependencias instaladas. Verificación:"
pkg-config --exists webkit2gtk-4.1 && echo "webkit2gtk-4.1 OK"
pkg-config --exists gtk+-3.0 && echo "gtk3 OK"
command -v gcc && gcc --version | head -1
echo "==> Listo. Ahora: npm run desktop:dev"
