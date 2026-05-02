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

const readMessages = () => {
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  } catch (e) {
    return { messages: [] };
  }
};
const writeMessages = (data) => {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(data, null, 2) + '\n');
};

app.get('/api/agents', (req, res) => res.json(agents));

app.get('/api/messages', (req, res) => res.json(readMessages()));

app.get('/api/messages/unlistened', (req, res) => {
  const data = readMessages();
  const unlistened = data.messages.filter((m) => !m.listened);
  res.json({ count: unlistened.length, messages: unlistened });
});

app.post('/api/messages/:id/listened', (req, res) => {
  const data = readMessages();
  const msg = data.messages.find((m) => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  msg.listened = true;
  writeMessages(data);
  res.json({ ok: true, message: msg });
});

app.use('/audio', express.static(AUDIO_DIR));
app.use(express.static(path.join(ROOT, 'dist')));
app.use('/legacy', express.static(path.join(ROOT, 'public')));

let watchTimer = null;
let lastBroadcastId = null;
fs.watch(MESSAGES_FILE, () => {
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
