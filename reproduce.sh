#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

"$PACKAGE_DIR/setup.sh"
exec "$PACKAGE_DIR/.grsi-venv/bin/python" \
  "$PACKAGE_DIR/scripts/reproduce_result.py"
