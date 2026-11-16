"""Package backends for Mason's Software.

One small, testable layer between the UI and whatever the distro actually ships:
dnf5/dnf (Fedora), apt (Debian/Ubuntu), pacman + yay/paru (Arch), zypper
(openSUSE), and Flatpak anywhere Flatpak is installed.

Each backend only builds commands and parses their output, so the UI can run
them through QProcess without blocking, and the same code can be exercised from
the shell with `python3 lib/mason_software_backend.py --search vlc`.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

MAX_RESULTS = 80


def have(binary: str) -> bool:
    return shutil.which(binary) is not None


def os_release() -> dict[str, str]:
    data: dict[str, str] = {}
    try:
        for line in Path("/etc/os-release").read_text(encoding="utf-8").splitlines():
            if "=" in line:
                key, _, value = line.partition("=")
                data[key.strip()] = value.strip().strip('"')
    except OSError:
        pass
    return data


def distro_label() -> str:
    release = os_release()
    return release.get("PRETTY_NAME") or release.get("NAME") or "Linux"


def distro_id() -> str:
    release = os_release()
    return (release.get("ID") or "").lower()


@dataclass
class Package:
    """One installable thing, normalised across backends."""

    name: str
    summary: str = ""
    version: str = ""
    source: str = ""          # repo / remote / "aur"
    backend: str = ""         # backend key
    installed: bool = False
    kind: str = "native"      # native | flatpak | aur
    remove_name: str = ""     # what to pass to the uninstall command
    display: str = ""         # human name, when the id is not one (flatpak app ids)

    @property
    def label(self) -> str:
        return self.display or self.name

    @property
    def key(self) -> str:
        return f"{self.backend}:{self.name}"

    @property
    def target(self) -> str:
        return self.remove_name or self.name

    def as_dict(self) -> dict:
        return {
            "name": self.name, "summary": self.summary, "version": self.version,
            "source": self.source, "backend": self.backend, "installed": self.installed,
            "kind": self.kind,
        }


# ── backends ─────────────────────────────────────────────────────────────────

class Backend:
    key = ""
    label = ""
    kind = "native"

    def available(self) -> bool:  # pragma: no cover - trivial
        return False

    # command builders -------------------------------------------------------
    def search_cmd(self, query: str) -> list[str] | None:
        return None

    def installed_cmd(self) -> list[str] | None:
        return None

    def updates_cmd(self) -> list[str] | None:
        return None

    def install_cmd(self, packages: list[Package]) -> list[str] | None:
        return None

    def remove_cmd(self, packages: list[Package]) -> list[str] | None:
        return None

    def upgrade_cmd(self) -> list[str] | None:
        return None

    def upgrade_cmds(self) -> list[list[str]]:
        """Every command an "update everything" needs from this backend."""
        cmd = self.upgrade_cmd()
        return [cmd] if cmd else []

    def update_cmd(self, packages: list[Package]) -> list[str] | None:
        return None

    # parsers ----------------------------------------------------------------
    def parse_search(self, text: str, query: str = "") -> list[Package]:
        return []

    def parse_installed(self, text: str) -> list[Package]:
        return []

    def parse_updates(self, text: str) -> list[Package]:
        return []

    # helpers ----------------------------------------------------------------
    @staticmethod
    def _rows(text: str) -> list[list[str]]:
        rows = []
        for line in text.splitlines():
            if not line.strip():
                continue
            rows.append([part.strip() for part in line.split("\t")])
        return rows

    def installed_names(self) -> set[str]:
        """Cached-ish helper used to flag search hits that are already installed."""
        cache = getattr(self, "_installed_cache", None)
        if cache is not None:
            return cache
        cmd = self.installed_cmd()
        names: set[str] = set()
        if cmd:
            try:
                out = subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout
            except (OSError, subprocess.TimeoutExpired):
                out = ""
            names = {pkg.name for pkg in self.parse_installed(out)}
        self._installed_cache = names
        return names


class Dnf5Backend(Backend):
    key = "dnf5"
    label = "DNF"
    QUERY = "%{name}\t%{summary}\t%{version}\t%{repoid}\n"

    def binary(self) -> str | None:
        for candidate in ("dnf5", "dnf"):
            if have(candidate):
                return candidate
        return None

    def available(self) -> bool:
        return self.binary() is not None

    def _repoquery(self, args: list[str], pattern: str | None = None) -> list[str]:
        binary = self.binary() or "dnf5"
        cmd = [binary, "-q", "repoquery", *args, "--queryformat", self.QUERY]
        if pattern:
            cmd.append(pattern)
        return cmd

    def search_cmd(self, query: str) -> list[str]:
        return self._repoquery(["--available"], f"*{query}*")

    def installed_cmd(self) -> list[str]:
        return self._repoquery(["--installed"])

    def updates_cmd(self) -> list[str]:
        return self._repoquery(["--upgrades"])

    def tool(self) -> str:
        # pkexec starts the program with a sanitised environment, so never rely
        # on a bare name being resolved for it.
        return shutil.which(self.binary() or "dnf5") or "/usr/bin/dnf5"

    def install_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "install", "-y", *[p.target for p in packages]]

    def remove_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "remove", "-y", *[p.target for p in packages]]

    def upgrade_cmd(self) -> list[str]:
        return ["pkexec", self.tool(), "upgrade", "-y"]

    def update_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "upgrade", "-y", *[p.target for p in packages]]

    def _parse(self, text: str, installed: bool = False) -> list[Package]:
        installed_names = self.installed_names() if not installed else set()
        out = []
        seen = set()
        for row in self._rows(text):
            if len(row) < 3:
                continue
            name, summary, version = row[0], row[1], row[2]
            repo = row[3] if len(row) > 3 else "fedora"
            if not name or name in seen:
                continue
            seen.add(name)
            out.append(Package(name=name, summary=summary, version=version, source=repo,
                               backend=self.key, installed=installed or name in installed_names))
        return out

    def parse_search(self, text: str, query: str = "") -> list[Package]:
        return self._parse(text)

    def parse_installed(self, text: str) -> list[Package]:
        return self._parse(text, installed=True)

    def parse_updates(self, text: str) -> list[Package]:
        return self._parse(text)


class AptBackend(Backend):
    key = "apt"
    label = "APT"

    def available(self) -> bool:
        return have("apt-cache") and have("dpkg-query")

    def search_cmd(self, query: str) -> list[str]:
        return ["apt-cache", "search", "--names-only", query]

    def installed_cmd(self) -> list[str]:
        return ["dpkg-query", "-W", "-f=${Package}\t${Version}\t${binary:Summary}\n"]

    def updates_cmd(self) -> list[str]:
        return ["apt", "list", "--upgradable"]

    def tool(self) -> str:
        return shutil.which("apt-get") or "/usr/bin/apt-get"

    def install_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", "env", "DEBIAN_FRONTEND=noninteractive",
                self.tool(), "install", "-y", *[p.target for p in packages]]

    def remove_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", "env", "DEBIAN_FRONTEND=noninteractive",
                self.tool(), "remove", "-y", *[p.target for p in packages]]

    def upgrade_cmd(self) -> list[str]:
        return ["pkexec", "env", "DEBIAN_FRONTEND=noninteractive", self.tool(),
                "upgrade", "-y"]

    def update_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", "env", "DEBIAN_FRONTEND=noninteractive",
                self.tool(), "install", "--only-upgrade", "-y",
                *[p.target for p in packages]]

    def parse_search(self, text: str, query: str = "") -> list[Package]:
        installed = self.installed_names()
        out, seen = [], set()
        for line in text.splitlines():
            if " - " not in line:
                continue
            name, _, summary = line.partition(" - ")
            name = name.strip()
            if not name or name in seen:
                continue
            seen.add(name)
            out.append(Package(name=name, summary=summary.strip(), source="apt",
                               backend=self.key, installed=name in installed))
        return out

    def parse_installed(self, text: str) -> list[Package]:
        out = []
        for row in self._rows(text):
            if not row or not row[0]:
                continue
            out.append(Package(name=row[0], version=row[1] if len(row) > 1 else "",
                               summary=row[2] if len(row) > 2 else "", source="apt",
                               backend=self.key, installed=True))
        return out

    def parse_updates(self, text: str) -> list[Package]:
        installed = self.installed_names()
        out = []
        for line in text.splitlines():
            if "/" not in line or "upgradable from" not in line:
                continue
            name = line.split("/", 1)[0].strip()
            version = line.split()[1] if len(line.split()) > 1 else ""
            out.append(Package(name=name, version=version, source="apt", backend=self.key,
                               installed=name in installed))
        return out


class PacmanBackend(Backend):
    key = "pacman"
    label = "pacman"

    def available(self) -> bool:
        return have("pacman")

    def search_cmd(self, query: str) -> list[str]:
        return ["pacman", "-Ss", query]

    def installed_cmd(self) -> list[str]:
        return ["pacman", "-Q"]

    def updates_cmd(self) -> list[str]:
        return ["pacman", "-Qu"]

    def tool(self) -> str:
        return shutil.which("pacman") or "/usr/bin/pacman"

    def install_cmd(self, packages: list[Package]) -> list[str]:
        native = [p.target for p in packages if p.kind != "aur"]
        return ["pkexec", self.tool(), "-S", "--noconfirm", *native] if native else None

    def remove_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "-Rs", "--noconfirm", *[p.target for p in packages]]

    def upgrade_cmd(self) -> list[str]:
        return ["pkexec", self.tool(), "-Syu", "--noconfirm"]

    def update_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "-S", "--noconfirm", *[p.target for p in packages]]

    def parse_search(self, text: str, query: str = "") -> list[Package]:
        installed = self.installed_names()
        out, current = [], None
        for line in text.splitlines():
            if line.startswith((" ", "\t")):
                if current is not None:
                    current.summary = line.strip()
                continue
            head = line.split(" ", 1)
            if len(head) < 2 or "/" not in head[0]:
                continue
            repo, _, name = head[0].partition("/")
            bits = head[1].split()
            version = bits[0] if bits else ""
            current = Package(name=name, version=version, source=repo, backend=self.key,
                              installed=name in installed)
            out.append(current)
        return out

    def parse_installed(self, text: str) -> list[Package]:
        out = []
        for line in text.splitlines():
            bits = line.split()
            if len(bits) < 2:
                continue
            out.append(Package(name=bits[0], version=bits[1], source="installed",
                               backend=self.key, installed=True))
        return out

    def parse_updates(self, text: str) -> list[Package]:
        out = []
        for line in text.splitlines():
            bits = line.split()
            if len(bits) < 2:
                continue
            out.append(Package(name=bits[0], version=bits[1], source="pacman",
                               backend=self.key, installed=True))
        return out


class YayBackend(Backend):
    """Arch AUR through yay/paru — search here, install in a terminal."""

    key = "yay"
    label = "AUR"
    kind = "aur"

    def helper(self) -> str | None:
        for candidate in ("yay", "paru"):
            if have(candidate):
                return candidate
        return None

    def available(self) -> bool:
        return have("pacman") and self.helper() is not None

    def search_cmd(self, query: str) -> list[str]:
        helper = self.helper()
        return [helper, "-Ss", query] if helper else None

    def installed_cmd(self) -> list[str]:
        return None  # pacman -Q already covers AUR packages (they are pacman packages)

    def install_cmd(self, packages: list[Package]) -> list[str] | None:
        helper = self.helper()
        if not helper:
            return None
        # AUR helpers must never run as root; the UI opens this in a terminal.
        return [shutil.which(helper) or helper, "-S", "--noconfirm",
                *[p.target for p in packages]]

    def remove_cmd(self, packages: list[Package]) -> list[str]:
        pacman = shutil.which("pacman") or "/usr/bin/pacman"
        return ["pkexec", pacman, "-Rs", "--noconfirm", *[p.target for p in packages]]

    def needs_terminal(self) -> bool:
        return True

    def parse_search(self, text: str, query: str = "") -> list[Package]:
        out, current = [], None
        for line in text.splitlines():
            if line.startswith("aur/"):
                head = line.split(" ", 1)
                name = head[0].split("/", 1)[1]
                version = head[1].split()[0] if len(head) > 1 and head[1].split() else ""
                current = Package(name=name, version=version, source="aur", backend=self.key,
                                  kind="aur")
                out.append(current)
            elif line.startswith((" ", "\t")) and current is not None and not current.summary:
                current.summary = line.strip()
        return out


class ZypperBackend(Backend):
    key = "zypper"
    label = "zypper"

    def available(self) -> bool:
        return have("zypper")

    def search_cmd(self, query: str) -> list[str]:
        return ["zypper", "-q", "--no-refresh", "search", "-s", query]

    def installed_cmd(self) -> list[str]:
        return ["zypper", "-q", "search", "-i", "-s"]

    def updates_cmd(self) -> list[str]:
        return ["zypper", "-q", "list-updates"]

    def tool(self) -> str:
        return shutil.which("zypper") or "/usr/bin/zypper"

    def install_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "--non-interactive", "install",
                *[p.target for p in packages]]

    def remove_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "--non-interactive", "remove",
                *[p.target for p in packages]]

    def upgrade_cmd(self) -> list[str]:
        return ["pkexec", self.tool(), "--non-interactive", "update"]

    def update_cmd(self, packages: list[Package]) -> list[str]:
        return ["pkexec", self.tool(), "--non-interactive", "update",
                *[p.target for p in packages]]

    def _parse_pipes(self, text: str, installed: bool = False) -> list[Package]:
        installed_names = self.installed_names() if not installed else set()
        out = []
        for line in text.splitlines():
            if "|" not in line or line.strip().startswith(("S |", "---")):
                continue
            cells = [c.strip() for c in line.split("|")]
            if len(cells) < 3:
                continue
            name = cells[1]
            summary = cells[2]
            version = cells[3] if len(cells) > 3 else ""
            if not name or name.lower() == "name":
                continue
            out.append(Package(name=name, summary=summary, version=version, source=cells[0],
                               backend=self.key,
                               installed=installed or cells[0].lower().startswith("i") or name in installed_names))
        return out

    def parse_search(self, text: str, query: str = "") -> list[Package]:
        return self._parse_pipes(text)

    def parse_installed(self, text: str) -> list[Package]:
        return self._parse_pipes(text, installed=True)

    def parse_updates(self, text: str) -> list[Package]:
        return self._parse_pipes(text, installed=True)


class FlatpakBackend(Backend):
    key = "flatpak"
    label = "Flatpak"
    kind = "flatpak"

    def available(self) -> bool:
        return have("flatpak")

    def search_cmd(self, query: str) -> list[str]:
        return ["flatpak", "search", "--columns=application,name,description,version,remotes", query]

    def installed_cmd(self) -> list[str]:
        return ["flatpak", "list", "--app", "--columns=application,name,version,origin,installation"]

    def updates_cmd(self) -> list[str]:
        return ["flatpak", "remote-ls", "--updates", "--app",
                "--columns=application,name,version"]

    def tool(self) -> str:
        return shutil.which("flatpak") or "/usr/bin/flatpak"

    def remote_scopes(self) -> dict[str, set[str]]:
        """Which installation each remote is defined in: user, system, or both.

        ``flatpak remotes`` has no ``installation`` column, so ask each
        installation separately. A remote that only exists system-wide cannot be
        used by ``--user`` installs at all.
        """
        cached = getattr(self, "_remote_scopes", None)
        if cached is not None:
            return cached
        scopes: dict[str, set[str]] = {}
        for scope, flag in (("user", "--user"), ("system", "--system")):
            try:
                out = subprocess.run([self.tool(), "remotes", flag, "--columns=name"],
                                     capture_output=True, text=True, timeout=30).stdout
            except (OSError, subprocess.TimeoutExpired):
                continue
            for line in (out or "").splitlines():
                name = line.strip()
                if name:
                    scopes.setdefault(name, set()).add(scope)
        self._remote_scopes = scopes
        return scopes

    def installed_scopes(self) -> dict[str, str]:
        """app id -> the installation it lives in."""
        cached = getattr(self, "_installed_scopes", None)
        if cached is not None:
            return cached
        scopes: dict[str, str] = {}
        try:
            out = subprocess.run([self.tool(), "list", "--app", "--columns=application,installation"],
                                 capture_output=True, text=True, timeout=30).stdout
        except (OSError, subprocess.TimeoutExpired):
            out = ""
        for row in self._rows(out):
            if row and row[0]:
                scopes[row[0]] = row[1] if len(row) > 1 else "system"
        self._installed_scopes = scopes
        return scopes

    def _is_system(self, packages: list[Package]) -> bool:
        known = self.installed_scopes()
        return any(getattr(p, "system_scope", False) or known.get(p.name) == "system"
                   for p in packages)

    def install_cmd(self, packages: list[Package]) -> list[str]:
        remote = (packages[0].source.split(",")[0] or "flathub").strip()
        targets = [p.target for p in packages]
        scopes = self.remote_scopes().get(remote, set())
        if "user" in scopes:
            return [self.tool(), "install", "--user", "-y", remote, *targets]
        if "system" in scopes:
            # The remote only exists system-wide, so a --user install can never
            # find its refs ("No remote refs found for …"). Install system-wide.
            return ["pkexec", self.tool(), "install", "--system", "-y", remote, *targets]
        return [self.tool(), "install", "-y", remote, *targets]

    def remove_cmd(self, packages: list[Package]) -> list[str]:
        targets = [p.target for p in packages]
        if self._is_system(packages):
            return ["pkexec", self.tool(), "uninstall", "--system", "-y", *targets]
        return [self.tool(), "uninstall", "--user", "-y", *targets]

    def upgrade_cmd(self) -> list[str]:
        if any("system" in scopes for scopes in self.remote_scopes().values()):
            return ["pkexec", self.tool(), "update", "--system", "-y"]
        return [self.tool(), "update", "--user", "-y"]

    def upgrade_cmds(self) -> list[list[str]]:
        cmds: list[list[str]] = []
        if any("system" in scopes for scopes in self.remote_scopes().values()):
            cmds.append(["pkexec", self.tool(), "update", "--system", "-y"])
        cmds.append([self.tool(), "update", "--user", "-y"])
        return cmds

    def update_cmd(self, packages: list[Package]) -> list[str]:
        targets = [p.target for p in packages]
        if self._is_system(packages):
            return ["pkexec", self.tool(), "update", "--system", "-y", *targets]
        return [self.tool(), "update", "--user", "-y", *targets]

    def parse_search(self, text: str, query: str = "") -> list[Package]:
        installed = self.installed_names()
        out, seen = [], set()
        for row in self._rows(text):
            if len(row) < 2:
                continue
            app_id, name = row[0], row[1]
            if not app_id or app_id in seen:
                continue
            seen.add(app_id)
            description = row[2] if len(row) > 2 else ""
            out.append(Package(name=app_id, summary=description, display=name,
                               version=row[3] if len(row) > 3 else "",
                               source=row[4] if len(row) > 4 else "flathub",
                               backend=self.key, kind="flatpak", installed=app_id in installed))
        return out

    def parse_installed(self, text: str) -> list[Package]:
        out = []
        for row in self._rows(text):
            if not row or not row[0]:
                continue
            pkg = Package(name=row[0], summary="", display=row[1] if len(row) > 1 else "",
                          version=row[2] if len(row) > 2 else "",
                          source=row[3] if len(row) > 3 else "flathub",
                          backend=self.key, kind="flatpak", installed=True)
            pkg.system_scope = (row[4] == "system") if len(row) > 4 else False
            out.append(pkg)
        return out

    def parse_updates(self, text: str) -> list[Package]:
        out = []
        for row in self._rows(text):
            if not row or not row[0]:
                continue
            out.append(Package(name=row[0], summary="", display=row[1] if len(row) > 1 else "",
                               version=row[2] if len(row) > 2 else "", source="flathub",
                               backend=self.key, kind="flatpak", installed=True))
        return out


# ── registry ─────────────────────────────────────────────────────────────────

BACKENDS = [Dnf5Backend(), AptBackend(), PacmanBackend(), YayBackend(),
            ZypperBackend(), FlatpakBackend()]


def active_backends(include_flatpak: bool = True) -> list[Backend]:
    out = []
    for backend in BACKENDS:
        if not backend.available():
            continue
        if backend.kind == "flatpak" and not include_flatpak:
            continue
        out.append(backend)
    return out


def backend_by_key(key: str) -> Backend | None:
    for backend in BACKENDS:
        if backend.key == key:
            return backend
    return None


def native_backend() -> Backend | None:
    for backend in active_backends():
        if backend.kind == "native":
            return backend
    return None


# ── curated front page ───────────────────────────────────────────────────────

# id per backend: dnf5/apt/pacman/zypper package names, plus the Flatpak app id.
CURATED = [
    ("Firefox", "Web browser", {"dnf5": "firefox", "apt": "firefox", "pacman": "firefox",
                                "zypper": "MozillaFirefox", "flatpak": "org.mozilla.firefox"}),
    ("GIMP", "Image editor", {"dnf5": "gimp", "apt": "gimp", "pacman": "gimp",
                              "zypper": "gimp", "flatpak": "org.gimp.GIMP"}),
    ("Inkscape", "Vector graphics", {"dnf5": "inkscape", "apt": "inkscape", "pacman": "inkscape",
                                     "zypper": "inkscape", "flatpak": "org.inkscape.Inkscape"}),
    ("VLC", "Media player", {"dnf5": "vlc", "apt": "vlc", "pacman": "vlc",
                             "zypper": "vlc", "flatpak": "org.videolan.VLC"}),
    ("Kdenlive", "Video editor", {"dnf5": "kdenlive", "apt": "kdenlive", "pacman": "kdenlive",
                                  "zypper": "kdenlive", "flatpak": "org.kde.kdenlive"}),
    ("Blender", "3D creation suite", {"dnf5": "blender", "apt": "blender", "pacman": "blender",
                                      "zypper": "blender", "flatpak": "org.blender.Blender"}),
    ("LibreOffice", "Office suite", {"dnf5": "libreoffice", "apt": "libreoffice", "pacman": "libreoffice-fresh",
                                     "zypper": "libreoffice", "flatpak": "org.libreoffice.LibreOffice"}),
    ("Thunderbird", "Mail and calendar", {"dnf5": "thunderbird", "apt": "thunderbird",
                                          "pacman": "thunderbird", "zypper": "MozillaThunderbird",
                                          "flatpak": "org.mozilla.Thunderbird"}),
    ("OBS Studio", "Streaming and recording", {"dnf5": "obs-studio", "apt": "obs-studio",
                                               "pacman": "obs-studio", "zypper": "obs-studio",
                                               "flatpak": "com.obsproject.Studio"}),
    ("Steam", "Games", {"dnf5": "steam", "apt": "steam-installer", "pacman": "steam",
                        "zypper": "steam", "flatpak": "com.valvesoftware.Steam"}),
    ("Telegram", "Messaging", {"dnf5": "telegram-desktop", "apt": "telegram-desktop",
                               "pacman": "telegram-desktop", "zypper": "telegram-desktop",
                               "flatpak": "org.telegram.desktop"}),
    ("Krita", "Digital painting", {"dnf5": "krita", "apt": "krita", "pacman": "krita",
                                   "zypper": "krita", "flatpak": "org.kde.krita"}),
]


def curated_packages(backends: list[Backend]) -> list[Package]:
    """The front page: one entry per app, from the best source this machine has."""
    out: list[Package] = []
    flats = [b for b in backends if b.kind == "flatpak"]
    natives = [b for b in backends if b.kind == "native"]
    for name, summary, ids in CURATED:
        chosen: Package | None = None
        for backend in natives:
            target = ids.get(backend.key)
            if target:
                chosen = Package(name=target, summary=summary, display=name, source=backend.label,
                                 backend=backend.key, installed=target in backend.installed_names())
                break
        if chosen is None:
            for backend in flats:
                app_id = ids.get(backend.key)
                if app_id:
                    chosen = Package(name=app_id, summary=summary, display=name, source="flathub",
                                     backend=backend.key, kind="flatpak")
                    break
        if chosen is not None:
            out.append(chosen)
    out.sort(key=lambda p: (not p.installed, p.label.lower()))
    return out


# ── CLI (handy for testing the parsers without a GUI) ────────────────────────

def _main(argv: list[str]) -> int:
    import argparse

    parser = argparse.ArgumentParser(prog="mason_software_backend",
                                     description="Inspect Mason's Software backends.")
    parser.add_argument("--list", action="store_true", help="show detected backends")
    parser.add_argument("--search", metavar="QUERY")
    parser.add_argument("--installed", action="store_true")
    parser.add_argument("--updates", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args(argv)

    if args.list or not (args.search or args.installed or args.updates):
        print(f"distro : {distro_label()}")
        for backend in BACKENDS:
            state = "yes" if backend.available() else "no"
            print(f"  {backend.key:8s} {backend.label:10s} available={state}")
        return 0

    packages: list[Package] = []
    for backend in active_backends():
        if args.search:
            cmd = backend.search_cmd(args.search)
        elif args.installed:
            cmd = backend.installed_cmd()
        else:
            cmd = backend.updates_cmd()
        if not cmd:
            continue
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        except (OSError, subprocess.TimeoutExpired) as err:
            print(f"{backend.key}: {err}", file=os.sys.stderr)
            continue
        text = proc.stdout or ""
        parsed = (backend.parse_search(text, args.search) if args.search
                  else backend.parse_installed(text) if args.installed
                  else backend.parse_updates(text))
        packages.extend(parsed)

    packages = packages[: args.limit]
    if args.json:
        print(json.dumps([p.as_dict() for p in packages], indent=2))
    else:
        for pkg in packages:
            flag = "*" if pkg.installed else " "
            print(f"{flag} [{pkg.backend}/{pkg.source}] {pkg.name} {pkg.version} — {pkg.summary[:60]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(os.sys.argv[1:]))
