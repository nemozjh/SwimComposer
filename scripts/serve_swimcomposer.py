#!/usr/bin/env python3
"""Serve the bundled SwimComposer demo and open it in a desktop browser."""

from __future__ import annotations

import functools
import http.server
import os
import threading
import webbrowser
from pathlib import Path


PACKAGE_DIR = Path(__file__).resolve().parents[1]
APP_DIR = PACKAGE_DIR / "swimcomposer_sourcecode"
HOST = "127.0.0.1"
DEFAULT_PORT = 8000


def should_open_browser() -> bool:
    value = os.environ.get("SWIMCOMPOSER_NO_BROWSER", "").strip().lower()
    return value not in {"1", "true", "yes"}


def open_browser(url: str) -> None:
    webbrowser.open(url, new=1)


def main() -> int:
    requested_port = int(os.environ.get("SWIMCOMPOSER_PORT", DEFAULT_PORT))
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(APP_DIR),
    )

    try:
        server = http.server.ThreadingHTTPServer((HOST, requested_port), handler)
    except OSError as exc:
        if requested_port != DEFAULT_PORT:
            raise
        print(f"Port {DEFAULT_PORT} is unavailable ({exc}); choosing a free port.")
        server = http.server.ThreadingHTTPServer((HOST, 0), handler)

    port = server.server_address[1]
    url = f"http://{HOST}:{port}/"

    print()
    print("SwimComposer is ready.")
    print(f"Open: {url}")
    print("Press Ctrl+C to stop the server.")
    print()

    if should_open_browser():
        timer = threading.Timer(0.5, open_browser, args=(url,))
        timer.daemon = True
        timer.start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping SwimComposer.")
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
