"""Read where this process is standing. Never guess it.

Phase 2 scope: read the declaration a publisher owes, honestly, and return
nothing rather than something plausible. Confirming the declaration — proving
the process is still IN the pane it names — is phase 3 and is deliberately not
attempted here.

TWO TRAPS THIS MODULE EXISTS TO AVOID, both measured on eury 2026-08-08:

  tmux answers even when you are not in tmux.
      $ env -u TMUX tmux display-message -p '#{session_name}'
      stateloom-hub
  A real, live, plausible, completely unrelated session — the most recently
  active one. A capture that does not gate on $TMUX stamps someone else's work
  on every cron and CI publish. So $TMUX is checked first, always.

  $HERDR_PANE_ID is inherited by children.
      tmux pane %39, session "tide-gate-test", reports HERDR_PANE_ID=w1:p1C
  It was spawned from that herdr pane and kept the variable. The variable
  survived the move; the process did not stay. The id names a pane that is
  genuinely live, so no probe against the inventory can catch this — only
  process ancestry can, and that is phase 3. Until then this module reports
  what the environment claims and marks it unconfirmed, so nothing downstream
  can mistake it for proof.

Absence beats invention: a card with no room chips reads as "unknown room"; a
card with the wrong room sends the listener into somebody else's terminal.
"""

from __future__ import annotations

import os
import socket
from pathlib import Path


def _clean(value):
    """The sanitizer the gate will apply anyway. Fail here rather than at the door."""
    if not isinstance(value, str):
        return None
    v = value.strip()
    if not v or len(v) > 200:
        return None
    return v if all(c.isalnum() or c in "._:@/%-" for c in v) else None


def _herdr_session() -> str | None:
    """Derive the session name from the socket path — herdr exports no session var.

    ~/.config/herdr/herdr.sock            → "default"
    ~/.config/herdr/sessions/<n>/herdr.sock → "<n>"
    """
    sock = os.environ.get("HERDR_SOCKET_PATH", "").strip()
    if not sock:
        return None
    parts = Path(sock).parts
    if "sessions" in parts:
        i = parts.index("sessions")
        if i + 1 < len(parts):
            return _clean(parts[i + 1])
    return "default"


def capture_herdr() -> dict | None:
    """Read herdr's own environment. Returns None when this is not a herdr pane."""
    if os.environ.get("HERDR_ENV") != "1":
        return None
    pane = _clean(os.environ.get("HERDR_PANE_ID"))
    workspace = _clean(os.environ.get("HERDR_WORKSPACE_ID"))
    session = _herdr_session()
    # The gate requires all three for herdr, because a pane id without its
    # session steers the wrong session. Partial is the same as absent.
    if not (pane and workspace and session):
        return None
    out = {"multiplexer": "herdr", "session": session, "workspace": workspace, "pane": pane}
    tab = _clean(os.environ.get("HERDR_TAB_ID"))
    if tab:
        out["tab"] = tab
    return out


def capture_tmux() -> dict | None:
    """Read tmux. Gated on $TMUX, because tmux answers from outside itself."""
    if not os.environ.get("TMUX"):
        return None
    import subprocess

    try:
        session = subprocess.run(
            ["tmux", "display-message", "-p", "#{session_name}"],
            capture_output=True, text=True, timeout=2.0,
        )
        if session.returncode != 0:
            return None
        name = _clean(session.stdout.strip())
    except Exception:
        return None
    if not name:
        return None
    out = {"multiplexer": "tmux", "session": name}
    pane = _clean(os.environ.get("TMUX_PANE"))
    if pane:
        out["pane"] = pane
    return out


def capture_origin() -> dict:
    """The declaration to send. herdr wins when both are present — it is the
    outer multiplexer here, and the one a listener can actually be routed into.

    Always returns the identity fields; the multiplexer block may be absent, in
    which case the gate will refuse the publish and say why. That refusal is the
    designed outcome, not a failure of this function.
    """
    origin = {
        "user": _clean(os.environ.get("USER")) or _clean(os.getlogin() if hasattr(os, "getlogin") else None),
        "host": _clean(socket.gethostname().split(".")[0]),
        "cwd": _clean(os.getcwd()),
    }
    mux = capture_herdr() or capture_tmux()
    if mux:
        origin.update(mux)
    return {k: v for k, v in origin.items() if v is not None}
