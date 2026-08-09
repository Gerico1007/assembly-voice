require('dotenv').config();
const express = require('express');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const AUDIO_DIR = path.join(ROOT, 'audio');
const MESSAGES_FILE = path.join(ROOT, 'messages.json');
const SSL_DIR = path.join(ROOT, 'ssl');

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages: [] }, null, 2) + '\n');
}

const app = express();
const sslOptions = {
  key: fs.readFileSync(path.join(SSL_DIR, 'server.key')),
  cert: fs.readFileSync(path.join(SSL_DIR, 'server.cert')),
};
const server = https.createServer(sslOptions, app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const agents = {};
const agentsDir = path.join(ROOT, 'agents');
if (fs.existsSync(agentsDir)) {
  fs.readdirSync(agentsDir).forEach((file) => {
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(agentsDir, file), 'utf8'));
      agents[data.id] = data;
    }
  });
}

const store = require('./lib/manifest-store');

/**
 * Reads on the display path stay forgiving — a torn manifest should degrade the
 * feed, never take the portal down. But it must not be mistaken for an empty
 * history, so it is logged loudly and never handed to a writer.
 */
const readMessages = () => {
  try {
    return store.readManifest(MESSAGES_FILE);
  } catch (e) {
    console.error(`[voice] manifest unreadable: ${e.message}`);
    return { messages: [], degraded: true };
  }
};

/**
 * Every write goes through updateManifest: one cross-language lock, a fresh
 * read inside it, and an atomic rename. The read-inside-the-lock is what
 * removes the lost update — previously this handler read the file, a publisher
 * appended, and the handler then wrote its stale snapshot back, deleting the
 * new message.
 */
const updateMessages = (res, mutate) => {
  try {
    return { ok: true, data: store.updateManifest(MESSAGES_FILE, mutate) };
  } catch (e) {
    const corrupt = e instanceof store.ManifestCorrupt;
    console.error(`[voice] refusing to write: ${e.message}`);
    res.status(corrupt ? 500 : 503).json({
      error: corrupt
        ? 'message history is unreadable — refusing to overwrite it'
        : 'another writer is holding the message history; try again',
    });
    return { ok: false };
  }
};

app.get('/api/agents', (req, res) => res.json(agents));

app.get('/api/messages', (req, res) => res.json(readMessages()));

app.get('/api/messages/unlistened', (req, res) => {
  const data = readMessages();
  const unlistened = data.messages.filter((m) => !m.listened);
  res.json({ count: unlistened.length, messages: unlistened });
});

app.post('/api/messages/:id/listened', (req, res) => {
  let found = null;
  const result = updateMessages(res, (data) => {
    found = data.messages.find((m) => m.id === req.params.id);
    if (!found) return false;          // nothing to write — leave the file alone
    if (found.listened) return false;  // already marked; do not rewrite 340KB
    found.listened = true;
    return true;
  });
  if (!result.ok) return;
  if (!found) return res.status(404).json({ error: 'Message not found' });
  res.json({ ok: true, message: found });
});

app.post('/api/messages/listen-all', (req, res) => {
  let marked = 0;
  const result = updateMessages(res, (data) => {
    marked = 0;
    data.messages.forEach((m) => {
      if (!m.listened) {
        m.listened = true;
        marked += 1;
      }
    });
    return marked > 0;
  });
  if (!result.ok) return;
  res.json({ ok: true, marked });
});

app.use('/audio', express.static(AUDIO_DIR));
app.use(express.static(path.join(ROOT, 'dist')));

let watchTimer = null;
let lastBroadcastId = null;

/**
 * Watch the DIRECTORY, not the file.
 *
 * fs.watch on a path binds to the inode behind it. Since writes became atomic
 * (temp file, fsync, rename) the old inode is unlinked on every publish, so a
 * file watch fires once for the rename and is then bound to something nobody
 * will ever write to again. Measured: in-place write → 1 event; first rename →
 * events; second rename → nothing, watcher dead.
 *
 * That is a regression the atomic-write fix introduced, and it is the quiet
 * kind: the portal keeps serving, /api/messages stays correct, and only the
 * live push stops — so the feed simply stops moving and nothing reports an
 * error. A directory watch survives the rename because the directory's inode
 * does not change.
 */
const broadcastLatest = () => {
  if (watchTimer) clearTimeout(watchTimer);
  watchTimer = setTimeout(() => {
    const data = readMessages();
    const latest = data.messages[data.messages.length - 1];
    if (latest && latest.id !== lastBroadcastId) {
      lastBroadcastId = latest.id;
      io.emit('new_message', latest);
      console.log(`📨 broadcast new_message  persona=${latest.persona} lang=${latest.lang}`);
    }
  }, 200);
};

const MESSAGES_BASENAME = path.basename(MESSAGES_FILE);
fs.watch(ROOT, (_event, filename) => {
  // The temp file and the lock live in this directory too; only the manifest
  // landing is news. A null filename means the platform did not tell us which
  // file changed, in which case checking is cheaper than missing a message.
  if (filename === null || filename === MESSAGES_BASENAME) broadcastLatest();
});

io.on('connection', (socket) => {
  console.log(`🔗 socket connected ${socket.id}`);
  socket.emit('hello', {
    agents: Object.keys(agents),
    server_time: new Date().toISOString(),
  });
  socket.on('disconnect', (reason) => {
    console.log(`👋 socket disconnected ${socket.id} (${reason})`);
  });
});

const initial = readMessages();
if (initial.messages.length > 0) {
  lastBroadcastId = initial.messages[initial.messages.length - 1].id;
}

console.log('♠️🌿🎸🧵 G.MUSIC ASSEMBLY VOICE PORTAL');
console.log(`Loaded ${Object.keys(agents).length} personas: ${Object.keys(agents).join(', ')}`);
console.log(`Existing messages: ${initial.messages.length}`);

const PORT = process.env.PORT || 4444;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTPS https://0.0.0.0:${PORT}`);
  console.log(`📱 Tailscale: https://eury.ferret-harmonic.ts.net:${PORT}`);
});
