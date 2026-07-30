#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
VENV_DIR="$PACKAGE_DIR/.grsi-venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Error: Python 3.10 or newer is required." >&2
  exit 1
fi

"$PYTHON_BIN" "$PACKAGE_DIR/scripts/check_package.py"

if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "Creating the isolated reproduction environment in .grsi-venv ..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

echo "Installing the pinned browser-automation dependency ..."
"$VENV_DIR/bin/python" -m pip install \
  --disable-pip-version-check \
  --quiet \
  -r "$PACKAGE_DIR/requirements-reproduce.txt"

echo "Installing the pinned Chromium runtime (cached after the first run) ..."
"$VENV_DIR/bin/python" -m playwright install chromium

echo "SwimComposer reproduction environment is ready."
