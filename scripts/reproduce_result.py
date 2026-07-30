#!/usr/bin/env python3
"""Automatically reproduce and capture a representative SwimComposer result."""

from __future__ import annotations

import hashlib
import json
import struct
import sys
import threading
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


PACKAGE_DIR = Path(__file__).resolve().parents[1]
APP_DIR = PACKAGE_DIR / "swimcomposer_sourcecode"
OUTPUT_DIR = PACKAGE_DIR / "output" / "playwright"
SCREENSHOT_PATH = OUTPUT_DIR / "representative_result.png"
REPORT_PATH = OUTPUT_DIR / "reproduction_report.json"
TARGET_TIME_SECONDS = 12.0
EXPECTED_COMPETITION = "Paris 2024 Men's 50m Freestyle Final"


class QuietHandler(SimpleHTTPRequestHandler):
    """Serve the bundled app without cluttering the reviewer output."""

    def log_message(self, format: str, *args: object) -> None:
        return


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError(f"{path} is not a valid PNG file")
    return struct.unpack(">II", header[16:24])


def write_report(report: dict[str, Any]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def reproduce() -> dict[str, Any]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    handler = partial(QuietHandler, directory=str(APP_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    url = f"http://127.0.0.1:{server.server_port}/"

    console_errors: list[str] = []
    page_errors: list[str] = []
    failed_requests: list[str] = []

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-webgl",
                    "--ignore-gpu-blocklist",
                    "--use-angle=swiftshader",
                ],
            )
            page = browser.new_page(
                viewport={"width": 1600, "height": 1000},
                device_scale_factor=1,
            )
            page.on(
                "console",
                lambda message: (
                    console_errors.append(message.text)
                    if message.type == "error"
                    else None
                ),
            )
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on(
                "requestfailed",
                lambda request: failed_requests.append(
                    f"{request.method} {request.url}: {request.failure}"
                ),
            )

            page.goto(url, wait_until="networkidle", timeout=30_000)
            page.wait_for_function(
                """() => {
                    const select = document.querySelector('#competition-select');
                    const timeLabel = document.querySelector('#video-time-label');
                    return select && select.options.length > 0 &&
                        timeLabel && !timeLabel.textContent.endsWith('/ 00:00') &&
                        document.querySelectorAll('#canvas-container canvas').length > 0;
                }""",
                timeout=30_000,
            )

            competition = page.locator("#competition-select").input_value()
            competition_label = page.locator(
                "#competition-select option:checked"
            ).inner_text()
            if competition_label.strip() != EXPECTED_COMPETITION:
                raise RuntimeError(
                    "Unexpected competition preset: "
                    f"{competition_label!r}; expected {EXPECTED_COMPETITION!r}"
                )

            # Follow the actual playback path into the recorded Tracking
            # segment. This verifies video playback, timeline advancement, and
            # application of the authored view-mode preset.
            page.locator("#btn-play").click()
            page.wait_for_function(
                """targetLabel => {
                    const label = document.querySelector('#video-time-label');
                    return label && label.textContent.trim().startsWith(targetLabel);
                }""",
                arg="00:12",
                timeout=25_000,
            )
            page.locator("#btn-play").click()
            page.wait_for_function(
                """() => document.querySelector('#btn-play')?.textContent.trim() === 'Play'""",
                timeout=5_000,
            )
            page.wait_for_timeout(1_000)

            page.locator("#app").screenshot(
                path=str(SCREENSHOT_PATH),
                animations="disabled",
            )

            title = page.title()
            timeline = page.locator("#video-time-label").inner_text()
            canvas_count = page.locator("#canvas-container canvas").count()
            view_mode = page.locator(".view-tab.is-active").inner_text()
            browser.close()

        if title != "SwimComposer":
            raise RuntimeError(f"Unexpected page title: {title!r}")
        if canvas_count < 1:
            raise RuntimeError("No rendered SwimComposer canvas was found")
        if console_errors or page_errors or failed_requests:
            raise RuntimeError(
                "The browser reported errors; inspect reproduction_report.json"
            )

        width, height = png_dimensions(SCREENSHOT_PATH)
        digest = hashlib.sha256(SCREENSHOT_PATH.read_bytes()).hexdigest()
        return {
            "status": "passed",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "application": {
                "title": title,
                "competition_id": competition,
                "competition_label": competition_label.strip(),
                "active_view_mode": view_mode.strip(),
                "timeline": timeline.strip(),
                "target_time_seconds": TARGET_TIME_SECONDS,
                "canvas_count": canvas_count,
            },
            "representative_result": {
                "path": str(SCREENSHOT_PATH.relative_to(PACKAGE_DIR)),
                "width": width,
                "height": height,
                "sha256": digest,
            },
            "browser_checks": {
                "console_errors": console_errors,
                "page_errors": page_errors,
                "failed_requests": failed_requests,
            },
        }
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=5)


def main() -> int:
    report: dict[str, Any] = {
        "status": "failed",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    try:
        report = reproduce()
    except (PlaywrightTimeoutError, PlaywrightError, RuntimeError, OSError) as exc:
        report["error"] = f"{type(exc).__name__}: {exc}"
        write_report(report)
        print(f"Reproduction failed: {exc}", file=sys.stderr)
        print(f"Diagnostic report: {REPORT_PATH}", file=sys.stderr)
        return 1

    write_report(report)
    print("SwimComposer representative result reproduced successfully.")
    print(f"Screenshot: {SCREENSHOT_PATH}")
    print(f"Report:     {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
