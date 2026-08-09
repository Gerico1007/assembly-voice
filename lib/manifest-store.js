'use strict';

/**
 * Safe read/modify/write for messages.json — the Node half.
 *
 * This is the mirror of scripts/manifest_store.py. Two processes in two
 * languages write this file: the Python publisher appends messages, and this
 * server marks them listened. Before 2026-08-08 both did the same unsafe thing:
 *
 *     catch (e) { return { messages: [] }; }      // substitute empty
 *     fs.writeFileSync(MESSAGES_FILE, ...)        // then truncate
 *
 * A torn file therefore erased the history on the next ordinary operation —
 * a publish, or a listener simply tapping "listened". 407 records, untracked
 * by git, one interrupted write from gone.
 *
 * The three rules, identical to the Python side:
 *   1. a corrupt manifest is never "empty" — refuse, never invent
 *   2. writes are atomic — temp file, fsync, rename
 *   3. writers take a lock, and it is an O_EXCL sentinel rather than flock so
 *      that Python and Node actually exclude each other
 *
 * LOCK_SUFFIX and LOCK_STALE_MS must match manifest_store.py or the two
 * languages will hold different locks and serialise nothing.
 */

const fs = require('fs');
const path = require('path');

const LOCK_SUFFIX = '.lock';
const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 10_000;
const LOCK_POLL_MS = 50;

const BACKUP_DIRNAME = 'backups';
const BACKUP_KEEP = 30;

class ManifestCorrupt extends Error {}
class ManifestLocked extends Error {}

const lockPath = (file) => file + LOCK_SUFFIX;

/** Busy-wait for the lock. Synchronous on purpose: the callers are already sync. */
function acquireLock(file, timeoutMs = LOCK_TIMEOUT_MS) {
  const lock = lockPath(file);
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    try {
      const fd = fs.openSync(lock, 'wx');       // O_CREAT|O_EXCL
      fs.writeSync(fd, `${process.pid} ${Date.now() / 1000}\n`);
      fs.closeSync(fd);
      return lock;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // A crashed writer must not wedge the portal forever.
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) {
          try { fs.unlinkSync(lock); } catch (_) {}
          continue;
        }
      } catch (_) {
        continue; // released while we looked
      }
      if (Date.now() >= deadline) {
        throw new ManifestLocked(`another writer has held ${path.basename(lock)} for over ${timeoutMs}ms`);
      }
      // Sleep without async: Atomics.wait on a throwaway buffer.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_POLL_MS);
    }
  }
}

function releaseLock(lock) {
  try { fs.unlinkSync(lock); } catch (_) {}
}

/** Parse, or throw. An absent file is legitimately empty; an unreadable one is not. */
function readManifest(file) {
  if (!fs.existsSync(file)) return { messages: [] };
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new ManifestCorrupt(`${file} could not be read (${e.message})`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new ManifestCorrupt(
      `${file} exists but did not parse (${e.message}). Refusing to write — ` +
      `doing so would replace the history with an empty file.`
    );
  }
  if (!data || !Array.isArray(data.messages)) {
    throw new ManifestCorrupt(`${file} parsed but is not a manifest.`);
  }
  return data;
}

/** Keep a daily copy. Best effort — a backup failure must never fail an operation. */
function rotateBackup(file) {
  try {
    const dir = path.join(path.dirname(file), BACKUP_DIRNAME);
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const daily = path.join(dir, `messages.${stamp}.json`);
    if (!fs.existsSync(daily) && fs.existsSync(file)) {
      fs.copyFileSync(file, daily);
      const all = fs.readdirSync(dir).filter((f) => /^messages\..*\.json$/.test(f)).sort();
      for (const old of all.slice(0, Math.max(0, all.length - BACKUP_KEEP))) {
        try { fs.unlinkSync(path.join(dir, old)); } catch (_) {}
      }
    }
  } catch (_) {}
}

/** Replace the manifest atomically. Caller must hold the lock. */
function writeManifest(file, data) {
  if (!data || !Array.isArray(data.messages)) {
    throw new Error('refusing to write a manifest without a messages array');
  }
  rotateBackup(file);

  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  try {
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeSync(fd, JSON.stringify(data, null, 2) + '\n');
      fs.fsyncSync(fd);            // bytes on disk before the rename
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);      // atomic within the directory
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }

  try {                            // durably record the rename itself
    const dfd = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  } catch (_) {}
}

/**
 * Read, mutate, write — all under one lock.
 * `mutate(data)` returns true to commit, false to leave the file untouched.
 */
function updateManifest(file, mutate) {
  const lock = acquireLock(file);
  try {
    const data = readManifest(file);
    if (mutate(data) === false) return data;
    writeManifest(file, data);
    return data;
  } finally {
    releaseLock(lock);
  }
}

module.exports = {
  ManifestCorrupt,
  ManifestLocked,
  acquireLock,
  releaseLock,
  readManifest,
  writeManifest,
  updateManifest,
};
