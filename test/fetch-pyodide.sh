#!/usr/bin/env bash
# تنزيل ملفات Pyodide اللازمة لاختبار المحرك محليًّا (test/main-engine.mjs).
# الاختبار يستعمل نفس نسخة CDN التي يستعملها الموقع. لا يُحفظ في git.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/.cdncache"
V="${PYODIDE_VERSION:-v314.0.7}"
mkdir -p "$DIR"
for f in pyodide.mjs pyodide.asm.mjs pyodide.asm.wasm python_stdlib.zip pyodide-lock.json; do
  [ -s "$DIR/$f" ] || curl -sS -m 300 -o "$DIR/$f" "https://cdn.jsdelivr.net/pyodide/$V/full/$f"
  printf '%-20s %s KB\n' "$f" "$(( $(stat -c%s "$DIR/$f") / 1024 ))"
done