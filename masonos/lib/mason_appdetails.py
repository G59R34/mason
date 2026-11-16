"""App pages for Mason's Software.

Everything a details view can show about one package, gathered from the best
source that has it:

* **Flathub's API** (``/api/v2/appstream/<app-id>``) — real screenshots at several
  sizes, the full HTML description, developer, categories, licence, release notes.
  Cached under ``~/.cache/masonos/appstream`` so pages open instantly and still
  work offline.
* **AppStream on this machine** (``appstreamcli``) — resolves a *native* package
  to its component id (``gimp`` → ``org.gimp.GIMP``), so dnf/apt/pacman cards get
  the same screenshots; also supplies a plain-text description when Flathub has
  nothing for that app.
* **The package manager itself** — the last resort long description from
  ``dnf5 repoquery --queryformat``.

No Qt here on purpose: the module is testable from the shell.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

CACHE_DIR = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache") / "masonos" / "appstream"
API = "https://flathub.org/api/v2/appstream/{app_id}"
CACHE_TTL = 24 * 60 * 60


@dataclass
class Shot:
    caption: str = ""
    full: str = ""
    thumb: str = ""


@dataclass
class Details:
    app_id: str = ""
    name: str = ""
    summary: str = ""
    description: str = ""          # HTML when it came from Flathub, plain text otherwise
    html: bool = False
    developer: str = ""
    categories: list[str] = field(default_factory=list)
    homepage: str = ""
    license: str = ""
    icon_url: str = ""
    screenshots: list[Shot] = field(default_factory=list)
    version: str = ""
    released: str = ""
    notes: str = ""
    verified: bool = False
    download_size: str = ""
    installed_size: str = ""
    source: str = ""               # flathub | appstream | package

    @property
    def has_content(self) -> bool:
        return bool(self.description or self.screenshots)


# ── small helpers ────────────────────────────────────────────────────────────

def _run(cmd: list[str], timeout: float = 25) -> str:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return proc.stdout or ""


def _cache_path(app_id: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", app_id)
    return CACHE_DIR / f"{safe}.json"


def _read_cache(app_id: str) -> dict | None:
    path = _cache_path(app_id)
    try:
        if time.time() - path.stat().st_mtime > CACHE_TTL:
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _write_cache(app_id: str, payload: dict) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _cache_path(app_id).write_text(json.dumps(payload), encoding="utf-8")
    except OSError:
        pass


def _strip_tags(html: str) -> str:
    text = re.sub(r"</p>|</li>|<br\s*/?>", "\n", html)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ── Flathub ──────────────────────────────────────────────────────────────────

def flathub_payload(app_id: str, timeout: float = 8.0) -> dict | None:
    """The raw Flathub AppStream JSON, cached for a day."""
    cached = _read_cache(app_id)
    if cached is not None:
        return cached
    request = urllib.request.Request(
        API.format(app_id=app_id),
        headers={"User-Agent": "MasonOS-Software/1.0", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8", "replace"))
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return None
    if isinstance(payload, dict):
        _write_cache(app_id, payload)
        return payload
    return None


def _pick_size(sizes: list[dict], *, largest: bool) -> str:
    widths: list[tuple[int, str]] = []
    for size in sizes or []:
        try:
            width = int(str(size.get("width", "0")).strip())
        except ValueError:
            width = 0
        src = size.get("src") or ""
        if src:
            widths.append((width, src))
    if not widths:
        return ""
    widths.sort()
    if largest:
        for width, src in reversed(widths):
            if width <= 1600:
                return src
        return widths[-1][1]
    for width, src in widths:
        if width >= 500:
            return src
    return widths[0][1]


def parse_flathub(payload: dict, app_id: str = "") -> Details:
    details = Details(app_id=app_id or payload.get("id", ""), source="flathub")
    details.name = payload.get("name") or ""
    details.summary = payload.get("summary") or ""
    details.description = payload.get("description") or ""
    details.html = bool(details.description)
    details.developer = payload.get("developer_name") or ""
    details.categories = [c for c in (payload.get("categories") or []) if c]
    details.license = payload.get("project_license") or ""
    urls = payload.get("urls") or {}
    details.homepage = urls.get("homepage") or urls.get("vcs_browser") or ""
    details.icon_url = payload.get("icon") or ""
    if not details.icon_url:
        icons = payload.get("icons") or []
        if icons:
            details.icon_url = icons[0].get("url", "")
    details.verified = bool((payload.get("metadata") or {}).get("flathub::verification::verified"))

    for shot in payload.get("screenshots") or []:
        sizes = shot.get("sizes") or []
        full = _pick_size(sizes, largest=True)
        if not full:
            continue
        details.screenshots.append(Shot(caption=shot.get("caption") or "",
                                        full=full,
                                        thumb=_pick_size(sizes, largest=False) or full))

    releases = payload.get("releases") or []
    if releases:
        newest = releases[0]
        details.version = newest.get("version") or ""
        details.notes = newest.get("description") or ""
        stamp = newest.get("timestamp")
        if stamp:
            try:
                details.released = time.strftime("%d %B %Y", time.localtime(int(stamp)))
            except (ValueError, OSError):
                pass
    return details


# ── AppStream on this machine ────────────────────────────────────────────────

def appstream_component(query: str, *, details: bool = False) -> dict[str, str]:
    """Parse ``appstreamcli get`` for the first component matching *query*.

    Returns keys lowercased (``identifier``, ``name``, ``description``, …) with
    continuation lines folded in.
    """
    if not query or not shutil.which("appstreamcli"):
        return {}
    cmd = ["appstreamcli", "get", query] + (["--details"] if details else [])
    text = _run(cmd, timeout=20)
    if not text.strip() or "Unable to find component" in text:
        return {}
    fields: dict[str, str] = {}
    current: str | None = None
    for raw in text.splitlines():
        if raw.strip() == "---":
            break                                   # only the first component
        if raw and not raw[0].isspace():
            if ":" not in raw:
                continue
            key, _, value = raw.partition(":")
            current = key.strip().lower()
            fields[current] = value.strip()
            continue
        if current is None or not raw.strip():
            continue
        value = raw.strip()
        if value.startswith("- "):
            fields[current] = (fields[current] + "\n" if fields[current] else "") + value
        else:
            fields[current] = f"{fields[current]}\n{value}".strip() if fields[current] else value
    return fields


def _clean(value: str) -> str:
    lines = [line.strip() for line in (value or "").splitlines()]
    text = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def details_from_appstream(info: dict[str, str]) -> Details:
    details = Details(source="appstream")
    details.app_id = (info.get("identifier") or "").split(" ")[0]
    details.name = info.get("name") or ""
    details.summary = info.get("summary") or ""
    details.developer = info.get("developer") or ""
    details.homepage = info.get("homepage") or ""
    details.license = info.get("license") or ""
    details.description = _clean(info.get("description") or "")
    categories = _clean(info.get("categories") or "")
    details.categories = [line.lstrip("- ").strip() for line in categories.splitlines() if line.strip()]
    shot = _clean(info.get("default screenshot url") or "")
    if shot.startswith("http"):
        details.screenshots.append(Shot(full=shot, thumb=shot))
    return details


# ── resolving a package to a catalogue id ────────────────────────────────────

def _strip_desktop(app_id: str) -> str:
    return app_id[:-8] if app_id.endswith(".desktop") else app_id


def _looks_like_app_id(value: str) -> bool:
    return bool(re.match(r"^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+){2,}$", value or ""))


def guess_from_flatpak_search(name: str) -> str | None:
    """Map a distro package name to a Flathub app id using flatpak's own search."""
    if not shutil.which("flatpak"):
        return None
    out = _run(["flatpak", "search", "--columns=application,name", name], timeout=30)
    needle = name.lower()
    best: tuple[int, str] | None = None
    for row in out.splitlines():
        parts = [part.strip() for part in row.split("\t")]
        if len(parts) < 2 or not parts[0]:
            continue
        app_id, label = parts[0], parts[1]
        low = app_id.lower()
        score = 0
        if low == needle:
            score = 100
        elif low.endswith("." + needle):
            score = 90
        elif label.lower() == needle:
            score = 80
        elif needle in low:
            score = 40
        elif needle in label.lower():
            score = 20
        # Skip manuals, plugins and translations of the real app.
        if re.search(r"\.(manual|docs?|plugin|extensions?|translations?|sdk|debug|sources?)$", low):
            score = 0
        if score and (best is None or score > best[0]):
            best = (score, app_id)
    return best[1] if best else None


def resolve_app_id(package) -> str | None:
    """Best catalogue id for a package: its own id, AppStream, then Flatpak search."""
    name = getattr(package, "name", "")
    if getattr(package, "kind", "") == "flatpak" and _looks_like_app_id(name):
        return name

    info = appstream_component(name)
    identifier = _strip_desktop((info.get("identifier") or "").strip())
    if _looks_like_app_id(identifier):
        return identifier

    found = _strip_desktop((appstream_component(name, details=False).get("identifier") or "").strip())
    if _looks_like_app_id(found):
        return found

    return guess_from_flatpak_search(name)


# ── package manager description (last resort) ───────────────────────────────

def package_description(package) -> str:
    backend = getattr(package, "backend", "")
    name = getattr(package, "name", "")
    if not name:
        return ""
    if backend in ("dnf5", "dnf"):
        tool = shutil.which("dnf5") or shutil.which("dnf")
        if tool:
            return _clean(_run([tool, "-q", "repoquery", "--queryformat", "%{description}", name]))
    if backend == "apt":
        out = _run(["apt-cache", "show", name])
        block = []
        for line in out.splitlines():
            if line.startswith("Description-en:") or line.startswith("Description:"):
                block.append(line.split(":", 1)[1].strip())
            elif line.startswith(" ") and block:
                block.append(line.strip())
            elif block:
                break
        return _clean("\n".join(block))
    if backend == "pacman":
        info = _run(["pacman", "-Si", name])
        found = re.search(r"^Description\s*:\s*(.+)$", info, re.M)
        return found.group(1).strip() if found else ""
    if backend == "zypper":
        return _clean(_run(["zypper", "-q", "--no-refresh", "info", name]))
    return ""


# ── flatpak sizes ───────────────────────────────────────────────────────────

def flatpak_sizes(app_id: str, scope: str = "--system") -> tuple[str, str]:
    out = _run(["flatpak", "remote-info", scope, "flathub", app_id], timeout=25)
    download = installed = ""
    for line in out.splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        if key == "download size":
            download = value.strip()
        elif key == "installed size":
            installed = value.strip()
    return download, installed


# ── the public entry point ──────────────────────────────────────────────────

def install_scoped(download: str, installed: str, package) -> bool:
    """Sizes come back from whichever installation has the ref."""
    del package
    return bool(download or installed)


def details_for(package) -> Details:
    """Everything known about *package*, richest source first."""
    app_id = resolve_app_id(package) or ""
    details = Details()
    if app_id:
        payload = flathub_payload(app_id)
        if payload:
            details = parse_flathub(payload, app_id)

    if not details.description:
        info = appstream_component(app_id or getattr(package, "name", ""), details=True)
        if not info and app_id:
            info = appstream_component(_strip_desktop(app_id), details=True)
        if info:
            local = details_from_appstream(info)
            details.description = details.description or local.description
            details.html = bool(details.description) and details.source == "flathub"
            details.name = details.name or local.name
            details.summary = details.summary or local.summary
            details.developer = details.developer or local.developer
            details.homepage = details.homepage or local.homepage
            details.license = details.license or local.license
            details.categories = details.categories or local.categories
            details.screenshots = details.screenshots or local.screenshots
            details.source = details.source or local.source

    if not details.description:
        details.description = package_description(package)
        details.html = False
        details.source = details.source or "package"

    if not details.name:
        details.name = getattr(package, "label", "") or getattr(package, "name", "")
    if not details.summary:
        details.summary = getattr(package, "summary", "")

    if getattr(package, "kind", "") == "flatpak":
        target = app_id or getattr(package, "name", "")
        download, installed = flatpak_sizes(target, "--system")
        if not install_scoped(download, installed, package):
            download, installed = flatpak_sizes(target, "--user")
        details.download_size = details.download_size or download
        details.installed_size = details.installed_size or installed
    return details


if __name__ == "__main__":  # tiny CLI for testing the layer without the GUI
    import sys

    from mason_software_backend import Package  # noqa: E402  (same folder)

    query = sys.argv[1] if len(sys.argv) > 1 else "org.gimp.GIMP"
    kind = "flatpak" if "." in query and query[0].isalpha() else "native"
    pkg = Package(name=query, backend="flatpak" if kind == "flatpak" else "dnf5", kind=kind)
    result = details_for(pkg)
    print(f"id       : {result.app_id}")
    print(f"name     : {result.name}")
    print(f"summary  : {result.summary}")
    print(f"developer: {result.developer}")
    print(f"source   : {result.source} (html={result.html})")
    print(f"homepage : {result.homepage}")
    print(f"license  : {result.license}")
    print(f"cats     : {', '.join(result.categories)}")
    print(f"version  : {result.version} ({result.released})")
    print(f"sizes    : {result.download_size} / {result.installed_size}")
    print(f"shots    : {len(result.screenshots)}")
    for shot in result.screenshots[:3]:
        print("   -", shot.thumb)
    print(f"desc     : {result.description[:220].replace(chr(10), ' ')}…")
