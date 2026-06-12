#!/usr/bin/env python3
"""Generate an Assembly TTS message via Microsoft Edge-TTS (Unlimited Free) and append it to messages.json.

Usage:
    python3 scripts/tts-generate.py --text "Bonjour Jerry" --lang fr
    python3 scripts/tts-generate.py --text "Build complete" --lang en
    python3 scripts/tts-generate.py --text "The pattern holds" --persona nyro
"""
import argparse
import json
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_AUDIO_BASE = "https://gmusicassembly.com/Assembly/voice/audio"
AUDIO_DIR = ROOT / "audio"
MESSAGES_FILE = ROOT / "messages.json"

PERSONA_TO_LANG = {
    "aureon": "fr",
    "salix": "fr",
    "nyro": "en",
    "jamai": "en",
    "synth": "en",
}

# Mapping personas to Edge-TTS voices
PERSONA_TO_VOICE = {
    "aureon": "fr-FR-DeniseNeural",
    "salix": "fr-FR-HenriNeural",
    "nyro": "en-US-AriaNeural",
    "jamai": "en-US-AndrewNeural",
    "synth": "en-US-GuyNeural",
}

DEFAULT_VOICES = {
    "fr": "fr-FR-DeniseNeural",
    "en": "en-US-AriaNeural",
}

def parse_args():
    p = argparse.ArgumentParser(description="Generate Assembly TTS via Edge-TTS.")
    p.add_argument("--text", required=True, help="Text to speak")
    p.add_argument("--lang", choices=["fr", "en"], help="Language (fr|en)")
    p.add_argument("--persona", choices=sorted(PERSONA_TO_LANG), help="Persona tag")
    return p.parse_args()

async def amain() -> int:
    args = parse_args()

    lang = args.lang or (PERSONA_TO_LANG[args.persona] if args.persona else "fr")
    persona = args.persona or ("aureon" if lang == "fr" else "nyro")
    voice = PERSONA_TO_VOICE.get(persona) or DEFAULT_VOICES.get(lang)

    AUDIO_DIR.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc)
    fname = f"{now.strftime('%Y%m%d_%H%M%S')}_{lang}.mp3"
    out_path = AUDIO_DIR / fname

    communicate = edge_tts.Communicate(args.text, voice)
    await communicate.save(out_path)

    if MESSAGES_FILE.exists():
        try:
            with open(MESSAGES_FILE, encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = {"messages": []}
    else:
        manifest = {"messages": []}

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": now.isoformat().replace("+00:00", "Z"),
        "text": args.text,
        "lang": lang,
        "persona": persona,
        "audio_file": f"audio/{fname}",
        "pwd": os.getcwd(),
        "listened": False,
    }
    manifest["messages"].append(entry)

    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")

    size = out_path.stat().st_size
    print(f"OK  id={entry['id']}")
    print(f"    persona={persona}  lang={lang}  voice={voice}")
    print(f"    audio={out_path}  bytes={size}")
    print(f"    public_url={PUBLIC_AUDIO_BASE}/{fname}")
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(amain()))
