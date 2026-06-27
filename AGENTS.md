# Project Instructions: assembly-voice

## Session Context
- **Session Name:** `assembly-voice`
- **Environment:** `gmusic@eury.ferret-harmonic.ts.net` (PWD: `/home/gmusic/salix/repos/assembly-voice`)
- **SSH Route:** `ssh gmusic@eury.ferret-harmonic.ts.net`
- **SSH Interactive:** `ssh -t gmusic@eury.ferret-harmonic.ts.net "cd /home/gmusic/salix/repos/assembly-voice && exec bash"`
- **Listening Portal:** `https://gmusicassembly.com/Assembly/voice/`

## Mandatory TTS Generation
Every substantive text response to the user MUST be voiced by running the project's TTS script and the response MUST include the resulting audio URL.

### Command
```bash
python3 scripts/tts-generate.py --text "<concise response text>" --lang <en|fr>
```

### Audio URL format
After generation, include the public link in the response using the script output:

```text
🔊 https://gmusicassembly.com/Assembly/voice/audio/<filename-from-script-output>
```

### Parameters
- `--text`: A concise spoken version of the response. For long outputs, summarize to 1–3 sentences.
- `--lang`: `fr` for French, `en` for English. For mixed-language exchanges, follow the dominant language.
- `--persona` (optional): override the default mapping when a specific Assembly voice identity is desired.
- **Voice safety rule:** For French audio, default to French-speaking personas (`aureon` or `salix`). Only use English-speaking personas (`nyro`, `jamai`, `synth`) when the user explicitly wants that configured voice identity preserved.

### When to skip TTS
- Trivial acknowledgements
- Pure tool-call turns with no user-facing prose
- Error dumps the user mainly needs to read silently

## Voice Personas (Edge-TTS)
The `tts-generate.py` script maps personas to these neural voices:
- **aureon**: `fr-FR-DeniseNeural`
- **salix**: `fr-FR-HenriNeural`
- **nyro**: `en-US-AriaNeural`
- **jamai**: `en-US-AndrewNeural`
- **synth**: `en-US-GuyNeural`

## Antigravity Migration Note
- Keep this `AGENTS.md` aligned with `GEMINI.md` during the Gemini CLI → Antigravity CLI transition.
- Prefer `AGENTS.md` for Antigravity-compatible project guidance.
- Do not delete `GEMINI.md` until authenticated `agy` runs confirm the runtime no longer depends on it.
