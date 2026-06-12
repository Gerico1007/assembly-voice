# Project Instructions: assembly-voice

## Interaction Workflow
- **Session Context:**
  - **Session Name:** `assembly-voice`
  - **Checkpoint Command:** `/resume save assembly-voice-checkpoint`
  - **Environment:** `gmusic@eury.ferret-harmonic.ts.net` (PWD: `/home/gmusic/salix/repos/assembly-voice`)
  - **SSH Route:** `ssh gmusic@eury.ferret-harmonic.ts.net`
  - **SSH Interactive:** `ssh -t gmusic@eury.ferret-harmonic.ts.net "cd /home/gmusic/salix/repos/assembly-voice && exec bash"`
- **Mandatory TTS Generation:** Every time you provide a text response to the user, you MUST also execute the text-to-speech generation script using `run_shell_command`.
- **Command:** `python scripts/tts-generate.py --text "<response_text>" --lang <lang_code>`
- **Audio Web Link:** After generating the audio, you MUST provide the web link in your response following this format: `https://gmusicassembly.com/Assembly/voice/audio/<filename>`
- **Parameters:**
  - `--text`: The exact text of your response (concise versions are preferred for long outputs).
  - `--lang`: Set to `en` for English or `fr` for French, matching the response language.
  - `--persona` (optional): Select a specific Assembly voice identity when needed.
  - **Voice safety rule:** persona selection controls the actual voice. For French audio, default to French-speaking personas (`aureon` or `salix`). Only use English-speaking personas (`nyro`, `jamai`, `synth`) when the user explicitly wants that agent's configured voice identity preserved.


## Voice Personas (Edge-TTS)
The `tts-generate.py` script maps agents to the following neural voices:
- **aureon**: `fr-FR-DeniseNeural` (Female, French)
- **salix**: `fr-FR-HenriNeural` (Male, French)
- **nyro**: `en-US-AriaNeural` (Female, English)
- **jamai**: `en-US-AndrewNeural` (Male, English)
- **synth**: `en-US-GuyNeural` (Male, English)

When using `tts-generate.py`, you can specify `--persona [name]` to use the correct voice automatically.
