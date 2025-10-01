const express = require('express');
const https = require('https');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Load SSL certificates
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.cert'))
};

const server = https.createServer(sslOptions, app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load agent embodiments
const agents = {};
const agentsDir = path.join(__dirname, 'agents');
fs.readdirSync(agentsDir).forEach(file => {
  if (file.endsWith('.json')) {
    const agentData = JSON.parse(fs.readFileSync(path.join(agentsDir, file), 'utf8'));
    agents[agentData.id] = agentData;
  }
});

console.log('♠️🌿🎸🧵 G.MUSIC ASSEMBLY MODE ACTIVE');
console.log(`Loaded ${Object.keys(agents).length} agent embodiments:`, Object.keys(agents).join(', '));

// API Routes
app.get('/api/agents', (req, res) => {
  res.json(agents);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agents[req.params.id];
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.post('/api/query', async (req, res) => {
  const { query, activeAgents } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Get agent responses
  const responses = {};
  const selectedAgents = activeAgents || Object.keys(agents);
  // ...existing code...
});

server.listen(3003, () => {
  console.log(`\n♠️🌿🎸🧵 G.MUSIC ASSEMBLY SERVER STARTUP`);
  console.log(`🚀 HTTPS server running on port 3003`);
});
