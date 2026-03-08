#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# WSLg on Windows 11: run legacy Electron dev app in Docker and forward GUI.
sudo docker run --rm --platform=linux/amd64 --name electron-ttf-gui \
  -e DISPLAY="${DISPLAY:-}" \
  -e WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
  -e XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
  -e PULSE_SERVER="${PULSE_SERVER:-}" \
  -e SKIP_DEVTOOLS_EXTENSIONS="${SKIP_DEVTOOLS_EXTENSIONS:-1}" \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v /mnt/wslg:/mnt/wslg \
  -v "$ROOT_DIR":/work \
  -w /work \
  ubuntu:20.04 \
  bash -lc 'set -euo pipefail; \
    apt-get update >/dev/null; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      curl ca-certificates python2 make g++ unzip \
      libgtk2.0-0 libgtk-3-0 libnotify4 libgconf-2-4 libnss3 libxss1 libxtst6 libasound2 \
      libatk-bridge2.0-0 libdrm2 libgbm1 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
      libxfixes3 libx11-xcb1 libxshmfence1 libpangocairo-1.0-0 libpango-1.0-0 libcups2 libatspi2.0-0 >/dev/null; \
    cd /tmp; \
    export PROFILE=/dev/null; \
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash >/dev/null; \
    . /root/.nvm/nvm.sh; \
    nvm install 12.22.12 >/dev/null; \
    nvm use 12.22.12 >/dev/null; \
    cd /work; \
    npm config set python /usr/bin/python2 >/dev/null; \
    npm install --ignore-scripts >/dev/null; \
    npm run dev'