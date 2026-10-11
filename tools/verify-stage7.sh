#!/usr/bin/env bash
# Kompatibilitas: gunakan verifier Tahap 8 terbaru agar pemeriksaan lama tidak memakai versi usang.
set -euo pipefail
exec bash "$(dirname "$0")/verify-stage8.sh" "$@"
