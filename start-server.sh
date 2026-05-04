#!/usr/bin/env bash
# Start the Vite dev server and the Node reverse proxy together.
#
# The proxy binds PORT (default 8080, configurable). On Linux, binding <1024
# requires root, so use PORT=80 with sudo or grant the cap_net_bind_service
# capability to the Node binary — see TROUBLESHOOTING.md.
#
# Ctrl+C cleans up both processes.

set -euo pipefail

VITE_PORT="${VITE_PORT:-5174}"
PROXY_PORT="${PORT:-8080}"

cleanup() {
    echo ""
    echo "Stopping servers..."
    # Kill our direct children; anything they spawned gets the same signal via
    # the process group below.
    [[ -n "${VITE_PID:-}" ]] && kill "${VITE_PID}" 2>/dev/null || true
    [[ -n "${PROXY_PID:-}" ]] && kill "${PROXY_PID}" 2>/dev/null || true
    wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Starting Vite dev server on :${VITE_PORT} ..."
npm run dev -- --port "${VITE_PORT}" &
VITE_PID=$!

# Wait up to ~20s for the dev server to come up before fronting it.
echo "Waiting for Vite to accept connections ..."
for _ in $(seq 1 40); do
    if curl -fsS "http://127.0.0.1:${VITE_PORT}/" >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

if ! curl -fsS "http://127.0.0.1:${VITE_PORT}/" >/dev/null 2>&1; then
    echo "Vite dev server did not become ready on :${VITE_PORT}" >&2
    exit 1
fi
echo "✓ Vite is up."

echo "Starting reverse proxy on :${PROXY_PORT} ..."
PORT="${PROXY_PORT}" VITE_TARGET="http://127.0.0.1:${VITE_PORT}" \
    node reverse-proxy.js &
PROXY_PID=$!

cat <<INFO

✓ Ready.
    App:    http://localhost:${PROXY_PORT}/
    Direct: http://localhost:${VITE_PORT}/

Press Ctrl+C to stop.
INFO

wait "${PROXY_PID}"