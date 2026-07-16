#!/usr/bin/env bash
set -euo pipefail

SUBSCRIPTION="${ASSEMBLY_PUBSUB_SUBSCRIPTION:-${1:-assembly-voice-events-sub}}"
LIMIT="${ASSEMBLY_PUBSUB_PULL_LIMIT:-1}"
AUTO_ACK="${ASSEMBLY_PUBSUB_AUTO_ACK:-true}"
ONCE="${ASSEMBLY_PUBSUB_ONCE:-false}"
SLEEP_SECONDS="${ASSEMBLY_PUBSUB_SLEEP_SECONDS:-3}"

pull_once() {
  local args=(
    pubsub subscriptions pull "$SUBSCRIPTION"
    --limit="$LIMIT"
    --format="yaml(message.data,message.attributes,ackId,deliveryAttempt,publishTime)"
  )

  if [[ "$AUTO_ACK" == "true" ]]; then
    args+=(--auto-ack)
  fi

  gcloud "${args[@]}"
}

while true; do
  pull_once || true
  if [[ "$ONCE" == "true" ]]; then
    exit 0
  fi
  sleep "$SLEEP_SECONDS"
done
