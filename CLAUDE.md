# Project Instructions: assembly-voice

## Session Context (echo at the top of substantive responses)

- **Session Name:** `assembly-voice`
- **Environment:** `gmusic@eury.ferret-harmonic.ts.net` (PWD: `/home/gmusic/workspace/assembly-voice`)
- **SSH Route:** `ssh gmusic@eury.ferret-harmonic.ts.net`
- **SSH Interactive:** `ssh -t gmusic@eury.ferret-harmonic.ts.net "cd /home/gmusic/workspace/assembly-voice && exec bash"`
- **Listening Portal:** `https://eury.ferret-harmonic.ts.net:4444/`

## Mandatory TTS Generation

Every substantive text response to the user MUST be voiced by running the
project's TTS script and the response MUST include the resulting audio URL.

### Command

```bash
python3 scripts/tts-generate.py --text "<concise version of response>" --lang <en|fr>
```

### Audio URL format

After generation, include in the response:

```
🔊 https://eury.ferret-harmonic.ts.net:4444/audio/<filename-from-script-output>
```

The filename is in the script's `audio=...` line — copy the basename (e.g. `20260502_173947_fr.mp3`).

### Parameters

- `--text`: A **concise spoken version** of the response. For long outputs, summarize to ~1–3 sentences.
  Avoid Markdown, emoji, code blocks — those don't speak well.
- `--lang`: `fr` if the user wrote in French, `en` if in English. When mixed, follow the dominant language.
- `--persona` (optional): override default mapping (`fr → aureon`, `en → nyro`). Use when a specific Assembly voice is more fitting (e.g. `--persona synth` for execution/orchestration messages).

### When to skip TTS

- Trivial acknowledgements ("ok", "got it", single-word confirmations)
- Pure tool-call turns with no user-facing prose
- Error/diagnostic dumps the user just needs to read silently

When skipping, no audio URL is needed.

### Cost awareness

Each TTS call uses Edge-TTS (local neural voices). Keep `--text` concise — speak the
takeaway, not the whole transcript. If the response is mostly code, TTS only
the human-language summary.

## Listening Portal Architecture (for context)

- **Generator:** `scripts/tts-generate.py` writes MP3 to `audio/` and appends to `messages.json`.
- **Server:** `server.js` (Express + socket.io + HTTPS on port 4444). Watches `messages.json` and broadcasts `new_message` events.
- **Portal UI:** React app in `src/`, built to `dist/`, served by `server.js` at `/`. Mobile-first listening dashboard.
- **Voice mapping** (in `.env`):
  - `SALIX_VOICE_ID` → French (default Adam)
  - `ENGLISH_VOICE_ID` → English (default Daniel)
- **Server start:** `node server.js` (PORT comes from `.env`, default 4444).
- **Build UI:** `npm run build`.

## Assembly Identity (already loaded from global CLAUDE.md)

Engage ♠️🌿🎸🧵 G.Music Assembly Mode. Each perspective speaks in its register
(Nyro/structural, Aureon/symbolic, JamAI/musical, Synth/execution). Jerry ⚡
provides creative-technical leadership. Use TaskCreate for multi-step work.
