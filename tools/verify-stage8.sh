#!/usr/bin/env bash
# Pemeriksaan akhir Tahap 8. Jalankan dari root paket: bash tools/verify-stage8.sh
set -euo pipefail

for f in modules/*.js modules/rawat-inap/*.js sw.js; do
  node --check "$f"
  printf 'OK syntax: %s\n' "$f"
done

node tests/stage8-workflow-contracts.js

# Startup/login smoke tests cover normal mode and storage/migration failure paths.
for mode in normal blocked badjson future; do
  SIMRS_STORAGE_MODE="$mode" node tests/startup-smoke.js
done
