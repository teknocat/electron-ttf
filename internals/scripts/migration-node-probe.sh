#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BASE_IMAGE="electron-ttf-migration-base:ubuntu20.04-v2"

if docker info >/dev/null 2>&1; then
  DOCKER_CMD=(docker)
else
  DOCKER_CMD=(sudo docker)
fi

ensure_base_image() {
  if "${DOCKER_CMD[@]}" image inspect "$BASE_IMAGE" >/dev/null 2>&1; then
    echo "[cache] using existing base image: $BASE_IMAGE"
    return
  fi

  echo "[build] creating base image: $BASE_IMAGE"
  "${DOCKER_CMD[@]}" build --platform=linux/amd64 -t "$BASE_IMAGE" -<<'EOF'
FROM ubuntu:20.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl ca-certificates python2 python3 make g++ unzip xvfb \
  libgtk2.0-0 libgtk-3-0 libnotify4 libgconf-2-4 libnss3 libxss1 libxtst6 libasound2 \
  libatk-bridge2.0-0 libdrm2 libgbm1 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
  libxfixes3 libx11-xcb1 libxshmfence1 libpangocairo-1.0-0 libpango-1.0-0 libcups2 libatspi2.0-0 \
  && rm -rf /var/lib/apt/lists/*
ENV NVM_DIR=/root/.nvm
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
EOF
}

if [ "$#" -gt 0 ]; then
  VERSIONS=("$@")
else
  VERSIONS=("12.22.12" "14.21.3" "16.20.2" "18.20.4")
fi
LOG_DIR="$ROOT_DIR/.artifacts/migration"
mkdir -p "$LOG_DIR"
CACHE_DIR="$LOG_DIR/cache"
mkdir -p "$CACHE_DIR/npm"

ensure_base_image

for v in "${VERSIONS[@]}"; do
  LOG_FILE="$LOG_DIR/node-${v}.log"
  echo "=== Probe Node ${v} ==="
  echo "log: ${LOG_FILE}"

    if "${DOCKER_CMD[@]}" run --rm --platform=linux/amd64 \
      -v "$ROOT_DIR":/work \
      -v "$CACHE_DIR/npm":/root/.npm \
      -w /work \
      "$BASE_IMAGE" bash -lc "set -eo pipefail; \
      . /root/.nvm/nvm.sh --no-use; \
      export npm_config_cache=/root/.npm; \
      nvm install ${v} >/dev/null; \
      nvm use ${v} >/dev/null; \
      cd /work; \
      npm install --ignore-scripts; \
      node -v; npm -v; \
      NODE_ENV=production node --trace-warnings -r babel-register ./node_modules/webpack/bin/webpack --config webpack.config.main.prod.js --colors" >"$LOG_FILE" 2>&1; then
    echo "PASS: Node ${v}"
  else
    echo "FAIL: Node ${v}"
  fi

done

echo "Done. Inspect logs in ${LOG_DIR}"