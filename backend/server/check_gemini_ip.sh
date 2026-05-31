#!/usr/bin/env bash

set -euo pipefail

STATE_DIR="backend/server/.state"
STATE_FILE="$STATE_DIR/public_ip.txt"

fetch_public_ip() {
  local ip

  ip="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
  if [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    printf '%s\n' "$ip"
    return 0
  fi

  ip="$(curl -fsS --max-time 10 https://ifconfig.me/ip 2>/dev/null || true)"
  if [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    printf '%s\n' "$ip"
    return 0
  fi

  return 1
}

current_ip="$(fetch_public_ip || true)"

if [[ -z "$current_ip" ]]; then
  echo "Could not determine your public IPv4 address."
  echo "Try running: curl https://api.ipify.org"
  exit 1
fi

mkdir -p "$STATE_DIR"

previous_ip=""
if [[ -f "$STATE_FILE" ]]; then
  previous_ip="$(tr -d '[:space:]' < "$STATE_FILE")"
fi

echo "Current public IPv4: $current_ip"

if [[ -z "$previous_ip" ]]; then
  echo "$current_ip" > "$STATE_FILE"
  echo
  echo "First run: saved current IP for future change detection."
  echo "If this IP is not already allowlisted, add it to your Gemini key IP restrictions now."
  exit 0
fi

if [[ "$current_ip" != "$previous_ip" ]]; then
  echo
  echo "IP changed since last check:"
  echo "  previous: $previous_ip"
  echo "  current : $current_ip"
  echo "$current_ip" > "$STATE_FILE"
  echo
  echo "Action required: update Gemini key allowed IPs in Google Cloud Credentials."
  exit 0
fi

echo "No change since last check."
echo "Gemini key allowlist should still be valid for local backend calls."