#!/usr/bin/env python3
"""Validate the files needed for the reviewer-facing SwimComposer demo."""

from __future__ import annotations

import json
import sys
from pathlib import Path


PACKAGE_DIR = Path(__file__).resolve().parents[1]
APP_DIR = PACKAGE_DIR / "swimcomposer_sourcecode"

REQUIRED_FILES = (
    APP_DIR / "index.html",
    APP_DIR / "src" / "app" / "main.js",
    APP_DIR / "libs" / "pixi.min.js",
    APP_DIR / "libs" / "pixi-projection.umd.js",
    APP_DIR / "assets" / "competitions" / "index.json",
    APP_DIR
    / "assets"
    / "competitions"
    / "swimming_competition2"
    / "video.mp4",
    APP_DIR
    / "assets"
    / "competitions"
    / "swimming_competition2"
    / "overlay.json",
    APP_DIR
    / "assets"
    / "competitions"
    / "swimming_competition2"
    / "insight.json",
    APP_DIR / "assets" / "presets" / "swimming_competition2.json",
)

JSON_FILES = tuple(path for path in REQUIRED_FILES if path.suffix == ".json")


def main() -> int:
    if sys.version_info < (3, 8):
        print(
            f"Error: Python 3.8+ is required; found {sys.version.split()[0]}.",
            file=sys.stderr,
        )
        return 1

    missing = [path for path in REQUIRED_FILES if not path.is_file()]
    if missing:
        print("Error: the reproducibility package is incomplete:", file=sys.stderr)
        for path in missing:
            print(f"  - missing {path.relative_to(PACKAGE_DIR)}", file=sys.stderr)
        return 1

    invalid_json: list[tuple[Path, str]] = []
    for path in JSON_FILES:
        try:
            with path.open("r", encoding="utf-8") as handle:
                json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            invalid_json.append((path, str(exc)))

    if invalid_json:
        print("Error: one or more bundled JSON files are invalid:", file=sys.stderr)
        for path, message in invalid_json:
            print(
                f"  - {path.relative_to(PACKAGE_DIR)}: {message}",
                file=sys.stderr,
            )
        return 1

    print("SwimComposer reproducibility package check passed.")
    print("No third-party Python packages are required for the interactive demo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
