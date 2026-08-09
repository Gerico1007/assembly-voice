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
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import edge_tts

# Local sibling module — the manifest is shared with server.js and must be
# written the same careful way from both.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import manifest_store  # noqa: E402
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_AUDIO_BASE = "https://gmusicassembly.com/Assembly/voice/audio"
AUDIO_DIR = ROOT / "audio"
MESSAGES_FILE = ROOT / "messages.json"
HOME_ENV_FILE = Path.home() / ".env"

DEFAULT_STREAM_KEY = "assembly:voice:events"
DEFAULT_PUBSUB_TOPIC = "assembly-voice-events"

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


def load_environment() -> None:
    # Load the machine-level bus credentials explicitly so stale exported shell
    # vars do not override the current Upstash settings.
    if HOME_ENV_FILE.exists():
        load_dotenv(HOME_ENV_FILE, override=True)
    load_dotenv(ROOT / ".env", override=True)


def build_event(entry: dict) -> dict:
    return {
        "event_type": "assembly.voice.ready",
        "agent_id": os.getenv("ASSEMBLY_AGENT_ID", "codex"),
        "persona": entry["persona"],
        "session_id": os.getenv("ASSEMBLY_SESSION_ID", "assembly-voice"),
        "topic": os.getenv("ASSEMBLY_EVENT_TOPIC", "agent-overview"),
        "lang": entry["lang"],
        "text": entry["text"],
        "audio_url": f"{PUBLIC_AUDIO_BASE}/{Path(entry['audio_file']).name}",
        "audio_file": entry["audio_file"],
        "source_path": entry.get("pwd") or str(ROOT),
        "created_at": entry["timestamp"],
    }


def publish_to_redis(event: dict) -> tuple[bool, str]:
    api_url = os.getenv("KV_REST_API_URL")
    api_token = os.getenv("KV_REST_API_TOKEN")
    stream_key = os.getenv("ASSEMBLY_REDIS_STREAM", DEFAULT_STREAM_KEY)

    if not api_url or not api_token:
        return False, "skipped (KV_REST_API_URL or KV_REST_API_TOKEN not set)"

    command = [
        "XADD",
        stream_key,
        "*",
        "event_type",
        event["event_type"],
        "agent_id",
        event["agent_id"],
        "persona",
        event["persona"],
        "session_id",
        event["session_id"],
        "topic",
        event["topic"],
        "lang",
        event["lang"],
        "text",
        event["text"],
        "audio_url",
        event["audio_url"],
        "audio_file",
        event["audio_file"],
        "source_path",
        event["source_path"],
        "created_at",
        event["created_at"],
    ]
    body = json.dumps(command).encode("utf-8")
    request = Request(
        api_url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if payload.get("error"):
            return False, f"error ({payload['error']})"
        return True, f"{stream_key} id={payload.get('result', '<unknown>')}"
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        return False, f"http {exc.code} ({details[:200]})"
    except URLError as exc:
        return False, f"network ({exc.reason})"
    except Exception as exc:  # pragma: no cover - safety net for runtime integration
        return False, f"error ({exc})"


def publish_to_pubsub(event: dict) -> tuple[bool, str]:
    topic = os.getenv("ASSEMBLY_PUBSUB_TOPIC", DEFAULT_PUBSUB_TOPIC)
    command = [
        "gcloud",
        "pubsub",
        "topics",
        "publish",
        topic,
        "--message",
        event["audio_url"],
        "--attribute",
        (
            f"event_type={event['event_type']},"
            f"agent_id={event['agent_id']},"
            f"persona={event['persona']},"
            f"session_id={event['session_id']},"
            f"topic={event['topic']},"
            f"lang={event['lang']},"
            f"source_path={event['source_path']},"
            f"created_at={event['created_at']}"
        ),
    ]

    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except FileNotFoundError:
        return False, "skipped (gcloud not installed)"
    except Exception as exc:  # pragma: no cover - safety net for runtime integration
        return False, f"error ({exc})"

    if result.returncode == 0:
        details = result.stdout.strip() or "published"
        return True, details

    stderr = " ".join(result.stderr.strip().split())
    if not stderr:
        stderr = "unknown gcloud error"
    return False, stderr[:240]

def parse_args():
    p = argparse.ArgumentParser(description="Generate Assembly TTS via Edge-TTS.")
    p.add_argument("--text", required=True, help="Text to speak")
    p.add_argument("--lang", choices=["fr", "en"], help="Language (fr|en)")
    p.add_argument("--persona", choices=sorted(PERSONA_TO_LANG), help="Persona tag")
    p.add_argument(
        "--publish-redis",
        action="store_true",
        help="Publish the generated audio event to Redis Streams.",
    )
    p.add_argument(
        "--publish-pubsub",
        action="store_true",
        help="Publish the generated audio event to Google Cloud Pub/Sub.",
    )
    p.add_argument(
        "--publish-all",
        action="store_true",
        help="Publish the generated audio event to both Redis and Pub/Sub.",
    )
    return p.parse_args()

async def amain() -> int:
    load_environment()
    args = parse_args()

    lang = args.lang or (PERSONA_TO_LANG[args.persona] if args.persona else "fr")
    persona = args.persona or ("aureon" if lang == "fr" else "nyro")
    voice = PERSONA_TO_VOICE.get(persona) or DEFAULT_VOICES.get(lang)

    AUDIO_DIR.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc)
    unique_suffix = uuid.uuid4().hex[:8]
    fname = f"{now.strftime('%Y%m%d_%H%M%S_%f')}_{lang}_{unique_suffix}.mp3"
    out_path = AUDIO_DIR / fname

    communicate = edge_tts.Communicate(args.text, voice)
    await communicate.save(out_path)

    # The manifest is read, mutated and written under one cross-language lock in
    # manifest_store.append_message below. Nothing is parsed here any more: the
    # old code caught a parse failure into an empty manifest and then truncated
    # the file, which is how 407 records could vanish on exit code 0.

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
    # One lock, one atomic rename. If the manifest cannot be read, this raises
    # rather than starting from an empty one — and if it raises, the audio we
    # just wrote is removed, because a voice nobody can find is litter that the
    # portal serves publicly forever. Two zero-byte orphans from the old
    # behaviour are still on disk.
    try:
        total = manifest_store.append_message(MESSAGES_FILE, entry)
    except Exception as exc:
        try:
            out_path.unlink(missing_ok=True)
        except OSError:
            pass
        print(f"REFUSED  {exc}", file=sys.stderr)
        print(f"         nothing was published, and {fname} was removed", file=sys.stderr)
        return 1

    size = out_path.stat().st_size
    print(f"OK  id={entry['id']}  ({total} messages)")
    print(f"    persona={persona}  lang={lang}  voice={voice}")
    print(f"    audio={out_path}  bytes={size}")
    print(f"    public_url={PUBLIC_AUDIO_BASE}/{fname}")

    publish_redis = args.publish_redis or args.publish_all
    publish_pubsub = args.publish_pubsub or args.publish_all

    if publish_redis or publish_pubsub:
        event = build_event(entry)

        if publish_redis:
            redis_ok, redis_status = publish_to_redis(event)
            print(f"    redis_publish={'ok' if redis_ok else 'warn'}  {redis_status}")
        else:
            print("    redis_publish=skipped")

        if publish_pubsub:
            pubsub_ok, pubsub_status = publish_to_pubsub(event)
            print(f"    pubsub_publish={'ok' if pubsub_ok else 'warn'}  {pubsub_status}")
        else:
            print("    pubsub_publish=skipped")
    else:
        print("    redis_publish=disabled")
        print("    pubsub_publish=disabled")
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(amain()))
