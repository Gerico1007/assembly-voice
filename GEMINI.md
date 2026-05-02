# Project Instructions: assembly-voice

## Interaction Workflow
- **Session Context:**
  - **Session Name:** `assembly-voice`
  - **Checkpoint Command:** `/resume save assembly-voice-checkpoint`
  - **Environment:** `gmusic@eury.ferret-harmonic.ts.net` (PWD: `/home/gmusic/workspace/assembly-voice`)
  - **SSH Route:** `ssh gmusic@eury.ferret-harmonic.ts.net`
  - **SSH Interactive:** `ssh -t gmusic@eury.ferret-harmonic.ts.net "cd /home/gmusic/workspace/assembly-voice && exec bash"`
- **Mandatory TTS Generation:** Every time you provide a text response to the user, you MUST also execute the text-to-speech generation script using `run_shell_command`.
- **Command:** `python scripts/tts-generate.py --text "<response_text>" --lang <lang_code>`
- **Audio Web Link:** After generating the audio, you MUST provide the web link in your response following this format: `https://eury.ferret-harmonic.ts.net:4444/audio/<filename>`
- **Parameters:**
  - `--text`: The exact text of your response (concise versions are preferred for long outputs).
  - `--lang`: Set to `en` for English or `fr` for French, matching the response language.

