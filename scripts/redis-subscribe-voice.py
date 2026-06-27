#!/usr/bin/env python3
"""Poll the Assembly voice Redis stream and print new events."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
HOME_ENV_FILE = Path.home() / ".env"
DEFAULT_STREAM_KEY = "assembly:voice:events"


def load_environment() -> None:
    if HOME_ENV_FILE.exists():
        load_dotenv(HOME_ENV_FILE, override=True)
    load_dotenv(ROOT / ".env", override=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read Assembly voice events from Redis.")
    parser.add_argument("--stream", default=os.getenv("ASSEMBLY_REDIS_STREAM", DEFAULT_STREAM_KEY))
    parser.add_argument("--last-id", default="$", help="Stream ID cursor. Use 0 to replay from start.")
    parser.add_argument("--count", type=int, default=10, help="Maximum events to fetch per poll.")
    parser.add_argument("--block-ms", type=int, default=15000, help="Blocking poll time in milliseconds.")
    parser.add_argument("--once", action="store_true", help="Read one batch and exit.")
    parser.add_argument("--json", action="store_true", help="Print raw JSON events.")
    return parser.parse_args()


def upstash_command(command: list[str]) -> dict[str, Any]:
    api_url = os.getenv("KV_REST_API_URL")
    api_token = os.getenv("KV_REST_API_TOKEN")
    if not api_url or not api_token:
        raise RuntimeError("KV_REST_API_URL or KV_REST_API_TOKEN is not set")

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
    with urlopen(request, timeout=max(20, int(os.getenv("ASSEMBLY_UPSTASH_TIMEOUT", "25")))) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_event(entry_fields: list[str]) -> dict[str, str]:
    return dict(zip(entry_fields[0::2], entry_fields[1::2], strict=False))


def print_event(stream_name: str, entry_id: str, event: dict[str, str], as_json: bool) -> None:
    if as_json:
        print(
            json.dumps(
                {"stream": stream_name, "id": entry_id, "event": event},
                ensure_ascii=False,
            )
        )
        return

    summary = event.get("text", "").strip()
    if len(summary) > 120:
        summary = summary[:117] + "..."
    print(f"[{entry_id}] {event.get('persona', '?')} {event.get('lang', '?')} {event.get('event_type', '?')}")
    print(f"  topic: {event.get('topic', '-')}")
    print(f"  audio: {event.get('audio_url', '-')}")
    print(f"  text:  {summary}")


def read_forever(args: argparse.Namespace) -> int:
    last_id = args.last_id
    while True:
        command = [
            "XREAD",
            "COUNT",
            str(args.count),
            "BLOCK",
            str(args.block_ms),
            "STREAMS",
            args.stream,
            last_id,
        ]
        try:
            payload = upstash_command(command)
        except HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            print(f"redis http error {exc.code}: {details}", file=sys.stderr)
            time.sleep(3)
            continue
        except URLError as exc:
            print(f"redis network error: {exc.reason}", file=sys.stderr)
            time.sleep(3)
            continue
        except Exception as exc:
            print(f"redis error: {exc}", file=sys.stderr)
            time.sleep(3)
            continue

        if payload.get("error"):
            print(f"redis error: {payload['error']}", file=sys.stderr)
            time.sleep(3)
            continue

        result = payload.get("result")
        if not result:
            if args.once:
                return 0
            continue

        for stream_name, entries in result:
            for entry_id, fields in entries:
                event = normalize_event(fields)
                print_event(stream_name, entry_id, event, args.json)
                last_id = entry_id

        if args.once:
            return 0


def main() -> int:
    load_environment()
    args = parse_args()
    return read_forever(args)


if __name__ == "__main__":
    raise SystemExit(main())
