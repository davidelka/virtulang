#!/usr/bin/env bash
# One-click demo: starts the app (port 5173) and the AI server (port 8787) if they aren't running,
# then opens Chrome with Hebrew voices enabled (Linux Chrome needs --enable-speech-dispatcher).
# Chrome runs with its own profile so the flag applies even when your regular Chrome is open.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS="${XDG_STATE_HOME:-$HOME/.local/state}/virtulang"
mkdir -p "$LOGS"

# Desktop launchers don't load the shell profile, so load nvm for node/npm.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

listening() { ss -ltn 2>/dev/null | grep -q ":$1 "; }

start() { # port dir log
  if listening "$1"; then return; fi
  (cd "$2" && nohup npm run dev >"$LOGS/$3.log" 2>&1 &)
}

start 5173 "$ROOT" app
start 8787 "$ROOT/ai-server" ai-server

for _ in $(seq 1 40); do # wait up to 20 s for the app
  listening 5173 && break
  sleep 0.5
done

exec google-chrome \
  --enable-speech-dispatcher \
  --user-data-dir="$HOME/.config/virtulang-chrome" \
  --no-first-run \
  --app=http://localhost:5173/ "$@"
