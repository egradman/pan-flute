#!/usr/bin/env python3
"""Minimal HTTP renderer service for pan flute STL generation.

Endpoints:
    GET  /health  -> {"status": "ok"}
    POST /render  -> STL binary (application/octet-stream)

Auth: X-Render-Secret header must match RENDER_SECRET env var.
Concurrency: one render at a time; returns 503 if busy.
Timeout: 120 s per render subprocess.
"""

import json
import os
import subprocess
import tempfile
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RENDER_SECRET = os.environ.get("RENDER_SECRET", "")
WORK_DIR = "/app"
PORT = int(os.environ.get("PORT", "8080"))

# Simple lock — only one render at a time.
_render_lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    # Suppress per-request log lines in production; keep errors.
    def log_request(self, code="-", size="-"):
        pass

    # ── GET /health ────────────────────────────────────────────────
    def do_GET(self):
        if self.path == "/health":
            self._json_response(HTTPStatus.OK, {"status": "ok"})
        else:
            self._json_response(HTTPStatus.NOT_FOUND, {"error": "not found"})

    # ── POST /render ───────────────────────────────────────────────
    def do_POST(self):
        if self.path != "/render":
            self._json_response(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return

        # Auth check
        if RENDER_SECRET:
            provided = self.headers.get("X-Render-Secret", "")
            if provided != RENDER_SECRET:
                self._json_response(HTTPStatus.UNAUTHORIZED, {"error": "invalid secret"})
                return

        # Read body
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
        except Exception:
            self._json_response(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON body"})
            return

        notes = body.get("notes")
        nameplate = body.get("nameplate", "")

        if not notes or not isinstance(notes, list):
            self._json_response(HTTPStatus.BAD_REQUEST, {"error": "notes must be a non-empty array"})
            return

        # Concurrency gate
        if not _render_lock.acquire(blocking=False):
            self._json_response(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "render in progress, try again later"})
            return

        try:
            stl_bytes = self._do_render(notes, nameplate)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(len(stl_bytes)))
            self.end_headers()
            self.wfile.write(stl_bytes)
        except subprocess.TimeoutExpired:
            self._json_response(HTTPStatus.GATEWAY_TIMEOUT, {"error": "render timed out (120s)"})
        except Exception as exc:
            self._json_response(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})
        finally:
            _render_lock.release()

    # ── Render pipeline ────────────────────────────────────────────
    def _do_render(self, notes, nameplate):
        """Run generate_flute.py then openscad; return STL bytes."""
        # Sanitise nameplate — printable ASCII, no quotes / backslashes.
        safe_nameplate = "".join(
            c for c in nameplate if 32 <= ord(c) < 127 and c not in ('"', "\\")
        )

        with tempfile.TemporaryDirectory() as tmp:
            # Write notes JSON
            notes_json = os.path.join(tmp, "notes.json")
            with open(notes_json, "w") as f:
                json.dump(notes, f)

            # Symlink box-base.stl so the generated .scad can import it
            os.symlink(
                os.path.join(WORK_DIR, "box-base.stl"),
                os.path.join(tmp, "box-base.stl"),
            )

            # Step 1: generate flute.scad (complete, standalone)
            subprocess.run(
                [
                    "python3", os.path.join(WORK_DIR, "generate_flute.py"),
                    notes_json, safe_nameplate,
                ],
                cwd=tmp,
                check=True,
                timeout=10,
                capture_output=True,
            )

            # Step 2: render STL
            output_stl = os.path.join(tmp, "output.stl")
            subprocess.run(
                [
                    "xvfb-run", "--auto-servernum",
                    "openscad",
                    "-o", output_stl,
                    "flute.scad",
                ],
                cwd=tmp,
                check=True,
                timeout=120,
                capture_output=True,
            )

            with open(output_stl, "rb") as f:
                return f.read()

    # ── Helpers ────────────────────────────────────────────────────
    def _json_response(self, status, obj):
        payload = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"renderer listening on :{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
