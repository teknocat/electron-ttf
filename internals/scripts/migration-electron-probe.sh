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
  COMBOS=("$@")
else
  # Format: <node-version>:<electron-version>
  COMBOS=(
    "10.24.1:2.0.16"
    "12.22.12:9.4.4"
    "16.20.2:15.5.7"
    "18.20.4:28.3.3"
  )
fi

LOG_DIR="$ROOT_DIR/.artifacts/migration"
mkdir -p "$LOG_DIR"
CACHE_DIR="$LOG_DIR/cache"
mkdir -p "$CACHE_DIR/npm"

ensure_base_image

for combo in "${COMBOS[@]}"; do
  NODE_VERSION="${combo%%:*}"
  ELECTRON_VERSION="${combo##*:}"
  LOG_FILE="$LOG_DIR/node-${NODE_VERSION}-electron-${ELECTRON_VERSION}.log"

  echo "=== Probe Node ${NODE_VERSION} + Electron ${ELECTRON_VERSION} ==="
  echo "log: ${LOG_FILE}"

  if "${DOCKER_CMD[@]}" run --rm --platform=linux/amd64 \
      -v "$ROOT_DIR":/work \
      -v "$CACHE_DIR/npm":/root/.npm \
      -w /work \
      "$BASE_IMAGE" bash -lc "set -eo pipefail; \
      . /root/.nvm/nvm.sh --no-use; \
      export npm_config_cache=/root/.npm; \
      nvm install ${NODE_VERSION} >/dev/null; \
      nvm use ${NODE_VERSION} >/dev/null; \
      if [ ${NODE_VERSION%%.*} -ge 22 ]; then \
        cd /tmp; \
        npm install -g npm@9 >/dev/null; \
        hash -r; \
      fi; \
      chmod 755 /root /root/.nvm /root/.nvm/versions /root/.nvm/versions/node /root/.nvm/versions/node/v${NODE_VERSION} /root/.nvm/versions/node/v${NODE_VERSION}/bin || true; \
      cd /work; \
      npm install --ignore-scripts >/dev/null; \
      npm uninstall --no-save node-sass >/dev/null 2>&1 || true; \
      npm install --no-save --ignore-scripts --force sass@1.32.13 sass-loader@10.4.1 >/dev/null; \
      # Re-apply requested Electron version because npm install above can resolve back to package.json range.
      npm install --no-save --ignore-scripts electron@${ELECTRON_VERSION} >/dev/null; \
      node ./node_modules/electron/install.js >/dev/null; \
      if [ ${NODE_VERSION%%.*} -ge 18 ]; then export NODE_OPTIONS=--openssl-legacy-provider; else unset NODE_OPTIONS || true; fi; \
      node -e \"console.log('node=', process.version); console.log('electron=', require('./node_modules/electron/package.json').version);\"; \
      NODE_ENV=production node --trace-warnings -r babel-register ./node_modules/webpack/bin/webpack --config webpack.config.main.prod.js --colors >/tmp/build-main.log 2>&1; \
      set +e; \
      xvfb-run -a bash -lc 'set -euo pipefail; \
        NODE_ENV=development node --trace-warnings -r ./internals/scripts/node24-http-parser-shim.js -r babel-register ./node_modules/webpack-dev-server/bin/webpack-dev-server --config webpack.config.renderer.dev.js > /tmp/renderer.log 2>&1 & \
        renderer_pid=\$!; \
        sleep 12; \
        NODE_OPTIONS= HOT=1 NODE_ENV=development MIGRATION_PROBE=1 SKIP_DEVTOOLS_EXTENSIONS=1 ELECTRON_DISABLE_SANDBOX=1 ./node_modules/.bin/electron ./app > /tmp/main.log 2>&1 & \
        main_pid=\$!; \
        sleep 25; \
        alive=0; \
        kill -0 \$renderer_pid >/dev/null 2>&1 && alive=\$((alive + 1)); \
        kill -0 \$main_pid >/dev/null 2>&1 && alive=\$((alive + 1)); \
        echo \"alive=\$alive\" > /tmp/smoke.meta; \
        kill \$main_pid \$renderer_pid >/dev/null 2>&1 || true; \
        sleep 2; \
        kill -9 \$main_pid \$renderer_pid >/dev/null 2>&1 || true; \
        pkill -f '/work/node_modules/electron/dist/electron' >/dev/null 2>&1 || true; \
        pkill -f 'webpack-dev-server/bin/webpack-dev-server' >/dev/null 2>&1 || true; \
        wait \$main_pid >/dev/null 2>&1 || true; \
        wait \$renderer_pid >/dev/null 2>&1 || true'; \
      smoke_exit=\$?; \
      set -e; \
      echo '--- build-main (tail) ---'; tail -n 40 /tmp/build-main.log; \
      echo '--- renderer (tail) ---'; tail -n 80 /tmp/renderer.log; \
      echo '--- main (tail) ---'; tail -n 80 /tmp/main.log; \
      cat /tmp/smoke.meta; \
      if [ \$smoke_exit -ne 0 ] && [ \$smoke_exit -ne 143 ]; then echo \"dev smoke exited with code \$smoke_exit\"; exit 1; fi; \
      if ! grep -q '^alive=2$' /tmp/smoke.meta; then echo 'renderer or main process exited early'; exit 1; fi; \
      if ! grep -q 'PROBE_INITIAL_SCREEN_OK' /tmp/main.log; then echo 'initial dual-pane home screen not confirmed'; exit 1; fi; \
      if grep -Eq 'npm ERR!|Cannot find module|ERR_OSSL_EVP_UNSUPPORTED|Module build failed|error while loading shared libraries|Running as root without --no-sandbox' /tmp/renderer.log /tmp/main.log; then \
        echo 'fatal pattern detected in dev smoke log'; \
        exit 1; \
      fi" 2>&1 | tee "$LOG_FILE"; then
    echo "PASS: Node ${NODE_VERSION} + Electron ${ELECTRON_VERSION}"
  else
    echo "FAIL: Node ${NODE_VERSION} + Electron ${ELECTRON_VERSION}"
  fi
done

echo "Done. Inspect logs in ${LOG_DIR}"