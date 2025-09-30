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

  selectedAgents.forEach(agentId => {
    const agent = agents[agentId];
    if (agent) {
      // Generate agent-specific response
      responses[agentId] = generateAgentResponse(agent, query);
    }
  });

  res.json({
    query,
    timestamp: new Date().toISOString(),
    responses
  });
});

// Generate agent-specific response
function generateAgentResponse(agent, query) {
  const response = {
    agent: agent.name,
    symbol: agent.symbol,
    role: agent.role,
    response: `${agent.symbol} ${agent.name}: Analyzing "${query}" through ${agent.personality.focus}...`,
    perspective: agent.personality.style,
    timestamp: new Date().toISOString()
  };

  return response;
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔗 New client connected');

  ws.send(JSON.stringify({
    type: 'connection',
    message: '♠️🌿🎸🧵 G.MUSIC ASSEMBLY MODE ACTIVE',
    agents: Object.keys(agents)
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received:', data);

      if (data.type === 'voice_query') {
        // Process voice query
        const responses = {};
        const selectedAgents = data.activeAgents || Object.keys(agents);

        selectedAgents.forEach(agentId => {
          const agent = agents[agentId];
          if (agent) {
            responses[agentId] = generateAgentResponse(agent, data.query);
          }
        });

        ws.send(JSON.stringify({
          type: 'agent_responses',
          query: data.query,
          responses,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('👋 Client disconnected');
  });
});

// Get local IP address
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('');
  console.log('🌐 HTTPS Server running on:');
  console.log(`   Local:   https://localhost:${PORT}`);
  console.log(`   Network: https://${localIP}:${PORT}`);
  console.log('');
  console.log('📱 Access from your Android phone using the Network URL');
  console.log('⚠️  Note: You\'ll need to accept the self-signed certificate warning');
  console.log('');
});