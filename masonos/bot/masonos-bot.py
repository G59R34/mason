#!/usr/bin/env python3
"""MasonOS bot bridge.

The panel widget (com.mason.masonos.bot) cannot talk to Supabase directly without
shipping the project credentials inside QML, so this tiny loopback service does it
instead. It speaks the same payload as mason-web's askMasonBot(): a list of
{role, content} messages, answered by the `smooth-service` edge function.

Config: ~/.config/masonos/bot.json
    { "projectUrl": "https://xxxx.supabase.co", "anonKey": "...",
      "function": "smooth-service" }

Run: python3 masonos-bot.py   (masonosctl starts and stops this for you)
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("MASONOS_BOT_PORT", "8765"))
HOST = "127.0.0.1"
CONFIG_PATH = Path(
    os.environ.get("MASONOS_BOT_CONFIG", Path.home() / ".config" / "masonos" / "bot.json")
)
MAX_MESSAGES = 24
MAX_CONTENT = 1500
TIMEOUT = 60

OFFLINE_HINT = (
    "Mason Bot is not live on Supabase yet. Deploy the mason-bot function "
    "and it will answer."
)

# masonosctl owns the version comparison (it reads MASONOS_VERSION from the
# published install.sh); the panel asks this bridge, and this bridge asks it.
CTL_FALLBACK = Path.home() / ".local" / "bin" / "masonosctl"
UPDATE_LOG = Path(os.environ.get("XDG_CACHE_HOME") or (Path.home() / ".cache")) / "masonos" / "update.log"


class BotError(Exception):
    pass


def load_config() -> dict:
    try:
        raw = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as err:
        raise BotError(f"bot.json is unreadable: {err}") from err
    if not isinstance(raw, dict):
        raise BotError("bot.json is not an object.")
    return raw


def clean_messages(payload: object) -> list[dict[str, str]]:
    if not isinstance(payload, list):
        raise BotError("Say something first.")
    cleaned: list[dict[str, str]] = []
    for item in payload[-MAX_MESSAGES:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            continue
        text = content.strip()[:MAX_CONTENT]
        if text:
            cleaned.append({"role": role, "content": text})
    if not cleaned:
        raise BotError("Say something first.")
    if cleaned[-1]["role"] != "user":
        raise BotError("The last message has to come from you.")
    return cleaned


def call_bot(messages: list[dict[str, str]]) -> str:
    config = load_config()
    base = str(config.get("projectUrl") or "").rstrip("/")
    key = str(config.get("anonKey") or "")
    function = str(config.get("function") or "smooth-service")
    if not base or not key:
        raise BotError(
            "Mason Bot has no Supabase credentials yet. Re-run masonos/install.sh "
            "or write them to ~/.config/masonos/bot.json."
        )

    url = f"{base}/functions/v1/{function}"
    body = json.dumps({"messages": messages}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            raw = response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")
        try:
            message = json.loads(detail).get("error")
        except Exception:
            message = detail.strip()[:300]
        raise BotError(message or f"Mason Bot returned {err.code}.") from err
    except urllib.error.URLError as err:
        reason = str(err.reason)
        if "Name or service not known" in reason or "Temporary failure" in reason:
            raise BotError("No internet, so Mason Bot is offline too.") from err
        raise BotError(OFFLINE_HINT) from err
    except TimeoutError as err:
        raise BotError("Mason Bot took too long. He does that.") from err

    try:
        data = json.loads(raw)
    except ValueError as err:
        raise BotError("Mason Bot sent something that was not JSON.") from err

    reply = (data.get("reply") or "").strip() if isinstance(data, dict) else ""
    if not reply:
        error = data.get("error") if isinstance(data, dict) else None
        raise BotError(str(error).strip() or "Mason Bot said nothing. On brand, still useless.")
    return reply


def masonosctl() -> str:
    """The installed masonosctl, which knows what version this is."""
    found = shutil.which("masonosctl") or str(CTL_FALLBACK)
    if not os.path.isfile(found) or not os.access(found, os.X_OK):
        raise BotError("masonosctl is not installed, so there is nothing to update with.")
    return found


def update_status() -> dict:
    """`masonosctl check-update --json` — cached there for six hours."""
    try:
        proc = subprocess.run(
            [masonosctl(), "check-update", "--json"],
            capture_output=True, text=True, timeout=45, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as err:
        raise BotError(f"could not check for updates: {err}") from err

    lines = (proc.stdout or "").strip().splitlines()
    if not lines:
        detail = (proc.stderr or "masonosctl check-update said nothing.").strip()
        raise BotError(detail[:300])
    try:
        payload = json.loads(lines[-1])
    except ValueError as err:
        raise BotError("masonosctl check-update sent something that was not JSON.") from err
    if not isinstance(payload, dict):
        raise BotError("masonosctl check-update sent something unexpected.")
    return payload


def start_update() -> dict:
    """Run `masonosctl update` detached — it re-applies the shell, so it cannot
    be a child of the panel it is replacing."""
    ctl = masonosctl()
    UPDATE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with UPDATE_LOG.open("ab") as log:
        subprocess.Popen(
            [ctl, "update"],
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=log,
            start_new_session=True,
            close_fds=True,
        )
    return {"started": True, "log": str(UPDATE_LOG)}


class Handler(BaseHTTPRequestHandler):
    server_version = "MasonOSBot/1.0"

    def _reply(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - http.server API
        path = self.path.split("?")[0]
        if path == "/update":
            # Always 200: the card in the panel shows `error` instead of dying.
            try:
                self._reply(200, update_status())
            except BotError as err:
                self._reply(200, {"current": "", "latest": "", "outdated": False,
                                  "error": str(err)})
            return
        if path != "/health":
            self._reply(404, {"error": "Not found."})
            return
        try:
            config = load_config()
        except BotError as err:
            self._reply(200, {"ok": True, "configured": False, "detail": str(err)})
            return
        configured = bool(config.get("projectUrl") and config.get("anonKey"))
        self._reply(200, {"ok": True, "configured": configured, "port": PORT})

    def do_POST(self) -> None:  # noqa: N802 - http.server API
        path = self.path.split("?")[0]
        if path == "/update":
            try:
                self._reply(200, start_update())
            except BotError as err:
                self._reply(503, {"error": str(err)})
            except Exception as err:  # keep the panel alive whatever happens
                print(f"masonos-bot: could not start the update: {err!r}", file=sys.stderr, flush=True)
                self._reply(500, {"error": "The update did not start. Try `masonosctl update`."})
            return
        if path != "/ask":
            self._reply(404, {"error": "Not found."})
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 256 * 1024:
            self._reply(400, {"error": "Bad request."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8", "replace"))
            messages = clean_messages(payload.get("messages") if isinstance(payload, dict) else None)
            self._reply(200, {"reply": call_bot(messages)})
        except BotError as err:
            self._reply(502, {"error": str(err)})
        except ValueError:
            self._reply(400, {"error": "Bad request."})
        except Exception as err:  # keep the panel alive whatever happens
            print(f"masonos-bot: unexpected error: {err!r}", file=sys.stderr, flush=True)
            self._reply(500, {"error": "Mason Bot fell over. Try again."})

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"masonos-bot: {fmt % args}", file=sys.stderr, flush=True)


def main() -> int:
    try:
        config = load_config()
    except BotError as err:
        print(f"masonos-bot: {err}", file=sys.stderr)
        config = {}
    if not config.get("projectUrl"):
        print(
            f"masonos-bot: no credentials in {CONFIG_PATH} — replies will explain that.",
            file=sys.stderr,
        )
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"masonos-bot: listening on http://{HOST}:{PORT}", file=sys.stderr, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
