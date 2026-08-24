#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

SKIP_CHECKS="${SKIP_CHECKS:-0}"
RUN_PIPELINE="${RUN_PIPELINE:-0}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js 20 or newer, then run this script again."
  exit 1
fi

echo "AMP Prep setup"
echo "1. Installing dependencies"
npm install

if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example. Fill provider keys when you need payments or Supabase."
fi

echo "2. Initializing the local database"
npx tsx -e "import { initDB } from './lib/db/sqlite'; initDB(); console.log('Database initialized.');"

if [ "$RUN_PIPELINE" = "1" ]; then
  echo "3. Running the question pipeline"
  npm run parse-pdf
  npm run generate
  npm run verify
  npm run seed
  npm run assemble
else
  echo "3. Using the existing question bank"
  if [ -f data/generated/questions.json ]; then
    npm run seed
    npm run assemble
  else
    echo "No generated question file found. Set RUN_PIPELINE=1 after adding script keys."
  fi
fi

if [ "$SKIP_CHECKS" != "1" ]; then
  echo "4. Running verification"
  npm run typecheck
  npm test
else
  echo "4. Skipping verification because SKIP_CHECKS=1"
fi

echo
echo "Setup complete. Start the app with ./start.sh"
