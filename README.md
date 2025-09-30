# ♠️🌿🎸🧵 G.Music Assembly Voice App

Voice-enabled web application for interacting with the G.Music Assembly agents on your Android phone.

## Features

- **Voice Input**: Tap to speak and interact with agents via microphone
- **Agent Selection**: Choose which agents respond to your queries
- **Real-time Responses**: Get immediate feedback from active agents
- **Conversation History**: Track previous interactions
- **Mobile-Optimized**: Designed for Android phone access

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the server** (recommended):
   ```bash
   ./start-server.sh
   ```
   This script automatically:
   - Generates SSL certificates if they don't exist
   - Finds an available port (starting from 3000)
   - Starts the server

   **Alternative manual start:**
   ```bash
   node generate-certs.js  # Only needed first time
   npm start               # Uses port 3000 by default
   ```
   To use a specific port:
   ```bash
   PORT=3001 npm start
   ```

3. **Access from your phone**:
   - The terminal will display two URLs
   - Use the **Network URL** (e.g., `https://192.168.x.x:3000`) on your Android phone
   - Make sure your phone is on the same WiFi network
   - **Accept the security warning** when first connecting (self-signed certificate)

## Agent Embodiments

- **⚡ Jerry**: Creative Technical Leader
- **♠️ Nyro**: The Ritual Scribe - Structural analysis
- **🌿 Aureon**: The Mirror Weaver - Emotional reflection
- **🎸 JamAI**: The Glyph Harmonizer - Musical integration
- **🧵 Synth**: Terminal Orchestrator - Security synthesis

## Usage

1. Open the Network URL in your phone's browser
2. Grant microphone permissions when prompted
3. Select which agents you want to hear from
4. Tap the microphone button and speak your question
5. Receive responses from each active agent

## Project Structure

```
workspace/
├── agents/              # Agent embodiment JSON files
├── public/              # Web interface files
│   ├── index.html       # Main HTML
│   ├── style.css        # Styles
│   └── app.js           # Client-side JavaScript
├── ssl/                 # SSL certificates (auto-generated)
├── server.js            # Node.js/Express server
├── start-server.sh      # Automated startup script
├── generate-certs.js    # SSL certificate generator
└── package.json         # Dependencies
```

## Technologies

- Node.js & Express
- WebSocket (ws)
- Web Speech API
- Responsive web design

## Troubleshooting

### Error: ENOENT: no such file or directory, open 'ssl/server.key'

**Cause:** SSL certificates haven't been generated yet.

**Solution:** Run the certificate generation script:
```bash
node generate-certs.js
```

### Error: EADDRINUSE: address already in use

**Cause:** Port 3000 is already in use by another process.

**Solution:** Start the server on a different port:
```bash
PORT=3001 npm start
```
Or stop the process using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

### Certificate Security Warning on Phone

**Cause:** The app uses self-signed SSL certificates (not from a trusted authority).

**Solution:** This is normal and safe for local development. When you access the app:
1. You'll see a security warning in your browser
2. Click "Advanced" or "Details"
3. Click "Proceed to [IP address]" or "Accept risk and continue"
4. The warning only appears on first access

### Microphone Not Working

**Ensure:**
- Browser has microphone permissions granted
- Phone is not muted
- Using HTTPS connection (required for Web Speech API)
- Browser supports Web Speech API (Chrome/Edge recommended)