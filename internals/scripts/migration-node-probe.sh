#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSIONS=("${@:-12.22.12 14.21.3 16.20.2 18.20.4}")
LOG_DIR="$ROOT_DIR/.artifacts/migration"
mkdir -p "$LOG_DIR"

for v in ${VERSIONS[@]}; do
  LOG_FILE="$LOG_DIR/node-${v}.log"
  echo "=== Probe Node ${v} ==="
  echo "log: ${LOG_FILE}"

  if sudo docker run --rm --platform=linux/amd64 -v "$ROOT_DIR":/work -w /work ubuntu:20.04 bash -lc "set -euo pipefail; \
      apt-get update >/dev/null; \
      DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates python3 make g++ >/dev/null; \
      cd /tmp; export PROFILE=/dev/null; \
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash >/dev/null; \
      . /root/.nvm/nvm.sh; \
      nvm install ${v} >/dev/null; \
      nvm use ${v} >/dev/null; \
      cd /work; \
      npm install --ignore-scripts; \
      node -v; npm -v; \
      npm run -s build-main" >"$LOG_FILE" 2>&1; then
    echo "PASS: Node ${v}"
  else
    echo "FAIL: Node ${v}"
  fi

done

echo "Done. Inspect logs in ${LOG_DIR}"