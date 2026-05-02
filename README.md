# ♠️🌿🎸🧵 G.Music Assembly Voice Portal v2.0

**Enhanced React/TypeScript voice-enabled AI portal** for interacting with the G.Music Assembly agents. 

This repository bridges terminal commands and audio/voice communication, allowing agents (Jerry, Nyro, Aureon, JamAI, Synth) to "speak" their responses back to the user via an automated ElevenLabs TTS pipeline.

## 🎙️ Core Concept: The Listening Portal

The portal has evolved from a simple chat interface into a **Voice Listening Portal**.
1. **Agent Interaction:** You interact with agents via terminal/CLI.
2. **Auto-TTS:** Responses are automatically converted to audio using ElevenLabs via the `tts-generate.py` script.
3. **Broadcasting:** Generated audio files and transcripts are stored in `messages.json`.
4. **Portal UI:** A React/Socket.io frontend monitors `messages.json` in real-time, broadcasting new voice messages to connected clients.

## 🛠️ Architecture

- **Frontend**: React 18, TypeScript 5, Tailwind CSS 3 (Vite build).
- **Backend**: Node.js/Express with Socket.io for real-time messaging.
- **Voice Engine**: ElevenLabs API via Python CLI (`scripts/tts-generate.py`).
- **Communication**: JSON-based message storage (`messages.json`) + WebSocket real-time updates.

## 🚀 Quick Start

### Prerequisites
- Node.js (v20+)
- Python 3.10+
- ElevenLabs API Key

### Setup
1. **Install dependencies:**
   ```bash
   npm install
   pip install -r scripts/requirements.txt
   ```
2. **Configure Environment:**
   Create a `.env` file (copy from `.env.example`) and add your `ELEVENLABS_API_KEY`, `ENGLISH_VOICE_ID`, and `SALIX_VOICE_ID`.

### Running the Portal
1. **Build the Frontend:**
   ```bash
   npm run build
   ```
2. **Launch the Portal:**
   ```bash
   npm run server
   ```
Access at `https://eury.ferret-harmonic.ts.net:4444` (or your configured port).

## 💡 Key Features

- **Per-Message SSH/PWD Buttons**: Every voice message includes context-aware SSH/CD commands to help you quickly navigate back to the directory where the agent generated the response.
- **Real-time Notifications**: New messages trigger an audio chime and browser notification.
- **Mark All Listened**: Easily acknowledge all pending voice messages.
- **Responsive UI**: Glassmorphism aesthetic optimized for mobile/tablet.

## 📜 Development Workflow

- **Branching**: Use `issue-number-description` for new features.
- **Syncing**: Keep main up to date with `git pull`.
- **Portal**: Always run `npm run build` after UI changes before restarting `npm run server`.

---

**♠️🌿🎸🧵 G.MUSIC ASSEMBLY MODE ACTIVE**

*Voice flows into code. Code flows into consciousness. Consciousness flows into harmony.*
