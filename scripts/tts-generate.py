#!/usr/bin/env python3
"""Generate an Assembly TTS message via ElevenLabs and append it to messages.json.

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
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "audio"
MESSAGES_FILE = ROOT / "messages.json"
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"

PERSONA_TO_LANG = {
    "aureon": "fr",
    "salix": "fr",
    "nyro": "en",
    "jamai": "en",
    "synth": "en",
}


def parse_args():
    p = argparse.ArgumentParser(description="Generate Assembly TTS via ElevenLabs.")
    p.add_argument("--text", required=True, help="Text to speak")
    p.add_argument("--lang", choices=["fr", "en"], help="Language (fr|en)")
    p.add_argument("--persona", choices=sorted(PERSONA_TO_LANG), help="Persona tag")
    return p.parse_args()


def resolve_voice(lang: str) -> tuple[str, str]:
    if lang == "fr":
        return os.getenv("SALIX_VOICE_ID", ""), "SALIX_VOICE_ID"
    return os.getenv("ENGLISH_VOICE_ID", ""), "ENGLISH_VOICE_ID"


def main() -> int:
    args = parse_args()
    load_dotenv(ROOT / ".env")

    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not set (check .env)", file=sys.stderr)
        return 1

    lang = args.lang or (PERSONA_TO_LANG[args.persona] if args.persona else "fr")
    persona = args.persona or ("aureon" if lang == "fr" else "nyro")

    voice_id, voice_env = resolve_voice(lang)
    if not voice_id:
        print(f"ERROR: {voice_env} not set in .env", file=sys.stderr)
        return 1

    AUDIO_DIR.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc)
    fname = f"{now.strftime('%Y%m%d_%H%M%S')}_{lang}.mp3"
    out_path = AUDIO_DIR / fname

    client = ElevenLabs(api_key=api_key)
    audio = client.text_to_speech.convert(
        text=args.text,
        voice_id=voice_id,
        model_id=MODEL_ID,
        output_format=OUTPUT_FORMAT,
    )
    with open(out_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)

    if MESSAGES_FILE.exists():
        with open(MESSAGES_FILE, encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {"messages": []}

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": now.isoformat().replace("+00:00", "Z"),
        "text": args.text,
        "lang": lang,
        "persona": persona,
        "audio_file": f"audio/{fname}",
        "listened": False,
    }
    manifest["messages"].append(entry)

    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")

    size = out_path.stat().st_size
    print(f"OK  id={entry['id']}")
    print(f"    persona={persona}  lang={lang}  voice={voice_id}")
    print(f"    audio={out_path}  bytes={size}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
