#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

"$PACKAGE_DIR/setup.sh"
exec python3 "$PACKAGE_DIR/scripts/serve_swimcomposer.py"
