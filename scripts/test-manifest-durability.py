#!/usr/bin/env python3
"""Try to lose a record. Everything runs on a COPY in a temp dir."""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

REPO = Path("/home/gmusic/salix/repos/assembly-voice")
sys.path.insert(0, str(REPO / "scripts"))
import manifest_store as ms

work = Path(tempfile.mkdtemp(prefix="voice-breakit-"))
M = work / "messages.json"

def seed(n=101):
    M.write_text(json.dumps({"messages": [{"id": f"seed-{i}", "text": f"m{i}"} for i in range(n)]}, indent=2))

def count():
    try:
        return len(json.loads(M.read_text())["messages"])
    except Exception as e:
        return f"UNPARSEABLE ({type(e).__name__})"

ok = lambda c: "✓" if c else "✗"
results = []

# ── 1 · the original bomb: torn file, then a normal publish ────────────────
seed()
before = count()
raw = M.read_text(); M.write_text(raw[:5000])          # simulate interrupted write
try:
    ms.append_message(M, {"id": "after-tear", "text": "the next message"})
    outcome = f"WROTE ANYWAY → {count()} records"; passed = False
except ms.ManifestCorrupt as e:
    outcome = "refused: " + str(e).split(".")[0][:58]; passed = True
results.append(("torn file, then a publish", f"{before} → refused", ok(passed), outcome))

# ── 2 · does the torn file survive for recovery? ──────────────────────────
still_there = M.exists() and len(M.read_text()) == 5000
results.append(("torn bytes preserved, not overwritten", "yes", ok(still_there), f"{len(M.read_text())} bytes intact"))

# ── 3 · 8 concurrent publishers ───────────────────────────────────────────
seed()
def pub(i):
    try:
        ms.append_message(M, {"id": f"concurrent-{i}", "text": f"c{i}"}); return True
    except Exception:
        return False
with ThreadPoolExecutor(max_workers=8) as ex:
    wrote = sum(ex.map(pub, range(8)))
final = count()
passed = final == 109 and wrote == 8
results.append(("8 concurrent publishers", "101 → 109", ok(passed), f"{final} records, {wrote}/8 wrote"))

# ── 4 · Python and Node writing at the same time ──────────────────────────
seed()
node = f"""
const store = require("{REPO}/lib/manifest-store");
for (let i = 0; i < 6; i++) {{
  store.updateManifest("{M}", (d) => {{ d.messages.push({{id:"node-"+i}}); return true; }});
}}
"""
(work / "n.js").write_text(node)
proc = subprocess.Popen(["node", str(work / "n.js")], cwd=str(REPO))
with ThreadPoolExecutor(max_workers=6) as ex:
    pywrote = sum(ex.map(lambda i: pub(100 + i), range(6)))
proc.wait()
final = count()
passed = final == 113
results.append(("Python + Node interleaved", "101 → 113", ok(passed), f"{final} records"))

# ── 5 · killed mid-write leaves the old file whole ────────────────────────
seed()
before = count()
killer = f"""
import sys, os, signal, json
sys.path.insert(0, "{REPO}/scripts")
import manifest_store as ms
from pathlib import Path
M = Path("{M}")
real = ms.write_manifest
def bomb(path, manifest):
    tmp = path.with_name("." + path.name + f".{{os.getpid()}}.tmp")
    tmp.write_text(json.dumps(manifest)[:400])   # a half-written temp file
    os.kill(os.getpid(), signal.SIGKILL)         # die before the rename
ms.write_manifest = bomb
try: ms.append_message(M, {{"id":"never"}})
except Exception: pass
"""
(work / "k.py").write_text(killer)
subprocess.run([sys.executable, str(work / "k.py")], capture_output=True)
after = count()
passed = after == before
results.append(("killed before the rename", f"{before} intact", ok(passed), f"{after} records"))

# ── 6 · the stale lock from a dead writer must not wedge the voice ────────
seed()
lock = Path(str(M) + ms.LOCK_SUFFIX)
lock.write_text("99999 0\n")
os.utime(lock, (0, 0))                                  # ancient
try:
    ms.append_message(M, {"id": "after-stale-lock"}); passed = count() == 102
except Exception as e:
    passed = False
results.append(("stale lock is broken, not obeyed", "publish proceeds", ok(passed), f"{count()} records"))

# ── 7 · a live lock is respected ──────────────────────────────────────────
seed()
held = ms.acquire_lock(M)
try:
    ms.append_message(M, {"id": "should-not-land"}, ) if False else None
    try:
        ms.acquire_lock(M, timeout=0.4); passed = False; note = "second writer got in"
    except ms.ManifestLocked:
        passed = True; note = "second writer waited then gave up"
finally:
    ms.release_lock(held)
results.append(("a held lock excludes a second writer", "blocked", ok(passed), note))

print(f"\n{'CASE':<42}{'EXPECTED':<20}{'':<3}{'ACTUAL'}")
print("─" * 108)
for case, exp, mark, act in results:
    print(f"{case:<42}{exp:<20}{mark:<3}{act}")
fails = sum(1 for r in results if r[2] == "✗")
print("─" * 108)
print(f"{len(results) - fails} passed · {fails} failed")
shutil.rmtree(work, ignore_errors=True)
sys.exit(1 if fails else 0)
