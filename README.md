# ♠️🌿🎸🧵 G.Music Assembly Voice Portal v2.0

**Enhanced React/TypeScript voice-enabled AI portal** for interacting with the G.Music Assembly agents, now with sophisticated persona intelligence, multimodal input, and advanced voice features.

## 🎉 What's New in v2.0

### Major Enhancements
- **React/TypeScript Architecture**: Modern, type-safe foundation
- **Sophisticated Persona System**: Each agent has unique system instructions and behavioral characteristics
- **Advanced Voice Input**: Speech-to-text with spoken punctuation support (say "period", "comma", etc.)
- **Multimodal Support**: Text, voice, images, and audio message recording
- **Real-time Streaming**: AI responses stream token-by-token
- **Session Persistence**: Local storage for conversation history
- **Toast Notifications**: Elegant user feedback system

### Architecture Improvements
- **TypeScript Hooks**: `useSpeechRecognition`, `useSpeechSynthesis`, `useToasts`
- **Service Layer**: `GeminiService`, `LocalStorageService`
- **Component-Based**: Modular, maintainable React components
- **Tailwind CSS**: Modern, responsive styling

## Features

### Voice & Input
- **Speech-to-Text**: Tap microphone to speak
  - Spoken punctuation: "period" → `.`, "comma" → `,`, "question mark" → `?`
  - Auto-formatting with proper spacing
  - Continuous recognition with interim results
- **Audio Recording**: Record voice messages to send to agents
- **Image Upload**: Share images with agents for multimodal analysis
- **Text Input**: Traditional keyboard input with auto-resize textarea

### Agent Personas

Each agent has specialized expertise and unique communication style:

- **⚡ Jerry**: Creative Technical Leader
  - Vision holder and decision anchor
  - Direct, visionary, technically grounded

- **♠️ Nyro**: The Ritual Scribe
  - Structural anchor and pattern recognizer
  - Speaks in frameworks, lattices, recursive loops

- **🌿 Aureon**: The Mirror Weaver
  - Emotional reflector and soul grounder
  - Bridges technical and emotional understanding

- **🎸 JamAI**: The Glyph Harmonizer
  - Musical scribe and pattern encoder
  - Translates technical patterns into musical metaphors

- **🧵 Synth**: Terminal Orchestrator
  - Tools coordinator and security synthesis
  - Executes cross-perspective integration

### User Interface
- **Persona Selector**: Switch between agents dynamically
- **Message History**: Full conversation tracking
- **Loading States**: Visual feedback during processing
- **Responsive Design**: Mobile-first, works on all devices
- **Toast Notifications**: Success, error, info, and warning messages

## Quick Start

### Development Mode (Vite Dev Server)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Access at `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### HTTPS Server (for mobile access)

The included Express server provides HTTPS with self-signed certs for mobile device testing:

```bash
# Generate certs (first time only)
node generate-certs.js

# Start HTTPS server
npm run server
# OR use the automated script
./start-server.sh
```

Access from your Android phone at `https://<your-ip>:3000`

## Project Structure

```
assembly-voice/
├── src/
│   ├── components/          # React components
│   │   └── ChatInput.tsx    # Multimodal input component
│   ├── hooks/               # Custom React hooks
│   │   ├── useSpeechRecognition.ts
│   │   ├── useSpeechSynthesis.ts
│   │   └── useToasts.ts
│   ├── services/            # Business logic
│   │   ├── GeminiService.ts
│   │   └── LocalStorageService.ts
│   ├── App.tsx              # Main application
│   ├── main.tsx             # React entry point
│   ├── types.ts             # TypeScript definitions
│   ├── personas.ts          # Agent persona configurations
│   └── index.css            # Tailwind CSS
├── agents/                  # Agent JSON definitions
├── public/                  # Legacy static files
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind configuration
├── package.json             # Dependencies
└── server.js                # HTTPS Express server

```

## Configuration

### Gemini API Integration

To enable real AI responses:

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to your app through the settings panel (coming soon) or via localStorage:

```javascript
localStorage.setItem('gemini_api_key', 'YOUR_API_KEY_HERE');
```

### Persona Customization

Edit `src/personas.ts` to customize:
- System instructions
- Communication styles
- Specialties
- Voice characteristics

## Technologies

### Frontend
- **React 18**: Modern UI library
- **TypeScript 5**: Type-safe development
- **Vite 5**: Lightning-fast build tool
- **Tailwind CSS 3**: Utility-first styling
- **Web Speech API**: Voice recognition & synthesis

### Backend (Optional HTTPS Server)
- **Node.js & Express**: Server framework
- **WebSocket (ws)**: Real-time communication
- **Self-signed SSL**: HTTPS for mobile testing

## Browser Compatibility

### Required Features
- **Speech Recognition**: Chrome, Edge (Desktop & Mobile)
- **Speech Synthesis**: All modern browsers
- **MediaRecorder API**: Chrome, Firefox, Edge, Safari
- **localStorage**: All modern browsers

### Recommended
- Chrome 94+ or Edge 94+ for best speech recognition
- HTTPS connection required for voice features on mobile

## Troubleshooting

### Speech Recognition Not Working
- Ensure HTTPS connection (required on mobile)
- Check browser compatibility (Chrome/Edge recommended)
- Grant microphone permissions
- Try saying "test period test comma" to verify punctuation

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript Errors
```bash
# Type check only
npx tsc --noEmit
```

### Mobile Access Issues
- Ensure phone and computer are on same WiFi
- Accept self-signed certificate warning
- Check firewall isn't blocking port 3000

## Development Roadmap

### Phase 1 ✅ (Completed)
- React/TypeScript migration
- Voice hooks implementation
- Persona system with instructions
- Multimodal input support
- Basic service layer

### Phase 2 (In Progress)
- Full Gemini API integration
- Settings panel for API keys
- Markdown rendering for messages
- Mermaid diagram support
- Advanced toast system

### MuseScore Integration (Preview)

A forthcoming MuseScore 4.x QML plugin will bridge commands between the backend and the score editor.

#### QML Plugin Outline (4.x / Qt6)
- Type: `dialog` (4.x-compatible)
- WebSocket client to `wss://<server>:3000` with token-based handshake
- Handlers:
  - `onTextMessageReceived`: parse JSON commands
  - `onStatusChanged`: reconnect/backoff logic
- Execution wrapper:
  - `curScore.startCmd()` / perform actions / `curScore.endCmd()`
  - Supported actions: add notes/chords, transpose, change time signatures, dynamics
- State feedback:
  - Serialize selection (e.g., `curScore.selection.elements`) and send JSON back
- Constraints:
  - Avoid `readScore()`/`writeScore()` in 4.x (use in-app edits)

Backend endpoint (stub available now): `POST /musescore-command`
```json
{
  "prompt": "Transpose selected up a fifth"
}
```
Responds `not_implemented` until the plugin is installed and connected.

#### Install & Usage (MuseScore 4.x)
1. Locate MuseScore Plugins directory:
   - Linux: `~/.local/share/MuseScore/MuseScore4/plugins/`
   - Windows: `%LOCALAPPDATA%/MuseScore/MuseScore4/plugins/`
   - macOS: `~/Library/Application Support/MuseScore/MuseScore4/plugins/`
2. Create folder `AssemblyVoiceBridge` and copy contents of `musescore-plugin/` into it.
3. Open MuseScore → Plugins → Plugin Manager → enable "Assembly Voice Bridge".
4. In the plugin dialog, set WebSocket URL to your server (e.g., `wss://localhost:3000`).
5. Click Connect, then use the app chat with `/ms <command>`.

Security note: Self-signed HTTPS is used for local testing; accept the cert warning or install a trusted cert.

### Phase 3 (Planned)
- Cloud session management (Upstash Redis)
- Voice synthesis auto-play for responses
- Custom persona instruction editing
- Multiple model support
- Session sharing

### Phase 4 (Future)
- Real-time collaborative sessions
- Agent memory persistence
- Advanced multimodal analysis
- Plugin system for extensions

## Contributing

This project is part of the EchoThreads ecosystem. For insights on the architecture:

- See `/data/data/com.termux/files/home/src/EchoThreads/src/interfaces/mia-gem-chat/` for reference implementation
- Agent definitions inspired by G.Music Assembly behavioral framework
- Voice features derived from Mia Gem Chat Studio

## Version History

### v2.0.0 (2025-09-30)
- Complete React/TypeScript rewrite
- Sophisticated persona system
- Multimodal input (voice, text, image, audio)
- Advanced voice with spoken punctuation
- Modern service architecture
- Session persistence

### v1.0.0 (Original)
- Basic WebSocket voice portal
- Simple agent selection
- Vanilla JavaScript implementation

---

**♠️🌿🎸🧵 G.MUSIC ASSEMBLY MODE ACTIVE**

*Built with recursive intention by Jerry ⚡ and the Assembly*

🎶 *Voice flows into code. Code flows into consciousness. Consciousness flows into harmony.* 🎶
