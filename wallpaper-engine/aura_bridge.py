"""Loopback bridge between the wallpaper and ASUS Aura SDK v3.1 COM."""

from __future__ import annotations

import json
import signal
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

import pythoncom
import win32com.client


HOST = "127.0.0.1"
PORT = 27340
MIN_FRAME_INTERVAL_SECONDS = 0.08
MAX_BODY_BYTES = 256
ALLOWED_ORIGINS = {"null", "http://127.0.0.1:8766", "http://localhost:8766"}


def clamp(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def aura_color(bass: float, energy: float) -> int:
    pulse = min(1.0, bass * 1.8 + energy * 0.5)
    brightness = min(1.0, 0.18 + energy * 1.35 + bass * 0.45)
    red = round((58 + 197 * pulse) * brightness)
    green = round((230 - 144 * pulse) * brightness)
    blue = round((255 - 32 * pulse) * brightness)
    # Aura SDK v3.1 uses 0x00GGBBRR.
    return (green << 16) | (blue << 8) | red


class AuraController:
    def __init__(self) -> None:
        self.sdk: Any | None = None
        self.devices: Any | None = None
        self.last_sent_at = 0.0
        self.last_error = ""

    @property
    def device_count(self) -> int:
        if self.devices is None:
            return 0
        try:
            return int(self.devices.Count)
        except Exception:
            return 0

    def ensure_ready(self) -> None:
        if self.sdk is not None and self.devices is not None:
            return

        self.sdk = win32com.client.Dispatch("aura.sdk.1")
        self.sdk.SwitchMode()
        self.devices = self.sdk.Enumerate(0)
        if self.device_count == 0:
            self.release()
            raise RuntimeError("Aura SDK did not enumerate any compatible devices")

    def send_frame(self, bass: float, energy: float) -> bool:
        now = time.monotonic()
        if now - self.last_sent_at < MIN_FRAME_INTERVAL_SECONDS:
            return False

        self.ensure_ready()
        color = aura_color(bass, energy)
        for device in self.devices:
            lights = device.Lights
            for index in range(int(lights.Count)):
                lights(index).Color = color
            device.Apply()
        self.last_sent_at = now
        self.last_error = ""
        return True

    def release(self) -> None:
        if self.sdk is not None:
            try:
                self.sdk.ReleaseControl(0)
            except Exception:
                pass
        self.sdk = None
        self.devices = None
        self.last_sent_at = 0.0


controller = AuraController()


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "MikuAuraBridge/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or origin in ALLOWED_ORIGINS

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if not self.origin_allowed():
            self.send_json(403, {"error": "origin_not_allowed"})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_json(404, {"error": "not_found"})
            return
        self.send_json(200, {"ready": True, "devices": controller.device_count})

    def do_POST(self) -> None:
        if not self.origin_allowed():
            self.send_json(403, {"error": "origin_not_allowed"})
            return
        if self.path == "/release":
            controller.release()
            self.send_json(200, {"released": True})
            return
        if self.path != "/frame":
            self.send_json(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                raise ValueError("invalid body length")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            sent = controller.send_frame(clamp(payload.get("bass")), clamp(payload.get("energy")))
            self.send_json(200, {"sent": sent, "devices": controller.device_count})
        except Exception as error:
            controller.last_error = str(error)
            controller.release()
            self.send_json(503, {"error": "aura_unavailable"})


def main() -> None:
    pythoncom.CoInitialize()
    server = HTTPServer((HOST, PORT), BridgeHandler)

    def stop(*_: Any) -> None:
        server.shutdown()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    print(f"Miku Aura bridge listening on http://{HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    finally:
        controller.release()
        server.server_close()
        pythoncom.CoUninitialize()


if __name__ == "__main__":
    main()
