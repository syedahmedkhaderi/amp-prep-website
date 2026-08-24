#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

if [ ! -d node_modules ] || [ ! -f .env.local ]; then
  echo "Setup has not been run yet. Run ./setup.sh first."
  exit 1
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use by another process:"
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN
  echo
  echo "Stop that process, or run with a different port: PORT=3001 ./start.sh"
  exit 1
fi

echo "Starting AMP Prep on http://localhost:${PORT}"
npm run dev -- --hostname "$HOST" --port "$PORT"
