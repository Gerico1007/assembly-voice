"""Safe read/modify/write for messages.json.

WHY THIS EXISTS. On 2026-08-08 the manifest held 407 messages going back to
2026-05-02. It is in .gitignore and untracked, so git has never seen a single
one of them, and both writers shared the same two-step defect:

    except Exception:  manifest = {"messages": []}     # substitute empty
    open(MESSAGES_FILE, "w")                           # then truncate

One interrupted write leaves a torn file. The next publish parses it, fails,
silently starts from an empty manifest, and overwrites. 407 records gone,
exit code 0, the word "OK" printed. Reproduced: 101 records became 1. Under
eight concurrent publishers, 101 became 4 — the losers each read the file while
a winner had it truncated.

Three rules follow, and this module exists to make them unavoidable:

  1. A CORRUPT MANIFEST IS NEVER "EMPTY". Refuse loudly. An empty manifest is a
     claim that nothing was ever said, and this file cannot make that claim.
  2. WRITES ARE ATOMIC. Write a sibling temp file, fsync it, then os.replace —
     a rename within a directory either happens or does not. A reader never
     sees a half-written manifest, so rule 1 stops being reachable at all.
  3. WRITERS TAKE A LOCK. server.js writes this file too. The lock is an
     O_EXCL sentinel rather than flock so both languages can hold the same one.

`server.js` has a mirror of this in lib/manifest-store.js. The two must agree
on LOCK_SUFFIX and on the stale timeout, or they will not exclude each other.
"""

from __future__ import annotations

import json
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

# Mirrored in lib/manifest-store.js — change both or neither.
LOCK_SUFFIX = ".lock"
LOCK_STALE_SECONDS = 30.0
LOCK_TIMEOUT_SECONDS = 10.0
LOCK_POLL_SECONDS = 0.05

BACKUP_DIRNAME = "backups"
BACKUP_KEEP = 30


class ManifestCorrupt(RuntimeError):
    """The manifest exists and could not be parsed.

    Never caught into an empty manifest. The correct response to "I cannot read
    the history" is to stop, not to declare there was none.
    """


class ManifestLocked(RuntimeError):
    """Another writer held the lock longer than we are willing to wait."""


def _lock_path(path: Path) -> Path:
    return path.with_name(path.name + LOCK_SUFFIX)


def acquire_lock(path: Path, timeout: float = LOCK_TIMEOUT_SECONDS) -> Path:
    """Take the writer lock, or raise.

    O_CREAT|O_EXCL is atomic on every filesystem this runs on, and unlike flock
    it is visible to a Node process doing the same thing.
    """
    lock = _lock_path(path)
    deadline = time.monotonic() + timeout

    while True:
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            os.write(fd, f"{os.getpid()} {time.time()}\n".encode())
            os.close(fd)
            return lock
        except FileExistsError:
            # A crashed writer must not wedge the voice forever.
            try:
                age = time.time() - lock.stat().st_mtime
                if age > LOCK_STALE_SECONDS:
                    lock.unlink(missing_ok=True)
                    continue
            except FileNotFoundError:
                continue  # released while we looked
            if time.monotonic() >= deadline:
                raise ManifestLocked(
                    f"another writer has held {lock.name} for longer than {timeout:.0f}s"
                )
            time.sleep(LOCK_POLL_SECONDS)


def release_lock(lock: Path) -> None:
    try:
        lock.unlink()
    except FileNotFoundError:
        pass


def read_manifest(path: Path) -> dict:
    """Parse the manifest, or raise ManifestCorrupt. Absent file is legitimately empty."""
    if not path.exists():
        return {"messages": []}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise ManifestCorrupt(
            f"{path} exists but did not parse ({exc}). Refusing to continue — "
            f"writing now would replace the history with an empty file. "
            f"A recent copy is in {path.parent / BACKUP_DIRNAME}/."
        ) from exc

    if not isinstance(data, dict) or not isinstance(data.get("messages"), list):
        raise ManifestCorrupt(f"{path} parsed but is not a manifest ({{'messages': [...]}}).")
    return data


def _rotate_backup(path: Path, manifest: dict) -> None:
    """Keep a daily copy. Best effort — a backup failure must never fail a publish."""
    try:
        backups = path.parent / BACKUP_DIRNAME
        backups.mkdir(exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        daily = backups / f"messages.{stamp}.json"
        if not daily.exists() and path.exists():
            shutil.copy2(path, daily)
            keep = sorted(backups.glob("messages.*.json"))[:-BACKUP_KEEP]
            for old in keep:
                old.unlink(missing_ok=True)
    except Exception:
        pass


def write_manifest(path: Path, manifest: dict) -> None:
    """Replace the manifest atomically. Caller must hold the lock."""
    if not isinstance(manifest.get("messages"), list):
        raise ValueError("refusing to write a manifest without a messages list")

    _rotate_backup(path, manifest)

    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())  # the bytes are on disk before the rename
        os.replace(tmp, path)     # atomic: readers see old or new, never half
    finally:
        try:
            tmp.unlink()
        except FileNotFoundError:
            pass

    # Durably record the rename itself, so a power loss cannot resurrect the old file.
    try:
        dfd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(dfd)
        finally:
            os.close(dfd)
    except OSError:
        pass


def append_message(path: Path, entry: dict) -> int:
    """Append one message under the lock. Returns the new record count."""
    lock = acquire_lock(path)
    try:
        manifest = read_manifest(path)
        manifest["messages"].append(entry)
        write_manifest(path, manifest)
        return len(manifest["messages"])
    finally:
        release_lock(lock)
