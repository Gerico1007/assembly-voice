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

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Access from your phone**:
   - The terminal will display two URLs
   - Use the **Network URL** (e.g., `http://192.168.x.x:3000`) on your Android phone
   - Make sure your phone is on the same WiFi network

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
├── agents/           # Agent embodiment JSON files
├── public/           # Web interface files
│   ├── index.html    # Main HTML
│   ├── style.css     # Styles
│   └── app.js        # Client-side JavaScript
├── server.js         # Node.js/Express server
└── package.json      # Dependencies
```

## Technologies

- Node.js & Express
- WebSocket (ws)
- Web Speech API
- Responsive web design