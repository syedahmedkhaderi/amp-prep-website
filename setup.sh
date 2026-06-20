#!/bin/bash
# AMP Prep setup script: install deps, init database, generate questions, seed, run.
# Usage: bash setup.sh [skip-gen]
#   skip-gen: skip question generation (use existing questions.json)

set -e
cd "$(dirname "$0")"
echo "=== AMP Prep Setup ==="

# 1. Install dependencies
echo ""
echo "[1/6] Installing dependencies..."
npm install

# 2. Initialize database
echo ""
echo "[2/6] Initializing database..."
npx tsx -e "import { initDB } from './lib/db/sqlite'; initDB(); console.log('Database initialized.');"

# 3. Parse PDF (skip if topics.json exists)
echo ""
echo "[3/6] Parsing PDF..."
if [ ! -f data/generated/topics.json ]; then
  echo "Place the AMP study guide PDF in data/source/ before running."
  echo "Looking for PDF..."
  if ls data/source/*.pdf 1>/dev/null 2>&1; then
    npx tsx scripts/parse-pdf.ts
  else
    echo "No PDF found in data/source/. Using default topics."
    npx tsx scripts/parse-pdf.ts || true
  fi
else
  echo "topics.json already exists, skipping parse."
fi

# 4. Generate questions (skip if flag provided or questions.json exists)
echo ""
echo "[4/6] Generating questions..."
if [ "$1" == "skip-gen" ]; then
  echo "Skipping generation (skip-gen flag)."
elif [ -f data/generated/questions.json ]; then
  echo "questions.json already exists. Run 'npm run generate' to add more."
else
  echo "Starting generation. This uses the Gemini API and may take time."
  echo "Make sure your Gemini keys are in scripts/.env"
  npm run generate
fi

# 5. Seed database
echo ""
echo "[5/6] Seeding database..."
npx tsx scripts/seed.ts

# 6. Assemble papers
echo ""
echo "[6/6] Assembling papers..."
npx tsx scripts/assemble-papers.ts

# Done
echo ""
echo "=== Setup complete ==="
echo ""
echo "To start the dev server:  npm run dev"
echo "To run tests:             npm test"
echo "To build for production:  npm run build"
echo ""
echo "App will be available at http://localhost:3000"
