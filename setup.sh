#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: Python 3.8 or newer is required." >&2
  exit 1
fi

python3 "$PACKAGE_DIR/scripts/check_package.py"
