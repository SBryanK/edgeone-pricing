#!/usr/bin/env bash
# Build (and optionally run) the EdgeOne Pricing Calculator Docker image.
#
# Usage:
#   ./build-docker.sh                  # build only
#   ./build-docker.sh --run             # build, then run detached on host:80
#   HOST_PORT=8080 ./build-docker.sh --run   # custom host port
#
# The image publishes container port 8080 (unprivileged nginx). The host
# port defaults to 80 and is configurable via HOST_PORT.

set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-edgeone-pricing-calculator}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HOST_PORT="${HOST_PORT:-80}"
CONTAINER_PORT=8080

if [[ ! -f package.json ]]; then
    echo "Error: package.json not found. Run from the project root." >&2
    exit 1
fi

echo "[1/2] Building Docker image ${IMAGE_NAME}:${IMAGE_TAG} ..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "✓ Image built."

if [[ "${1:-}" == "--run" ]]; then
    echo "[2/2] Starting container on host port ${HOST_PORT} ..."
    # Remove any prior container with the same name so re-runs are idempotent.
    docker rm -f "${IMAGE_NAME}" >/dev/null 2>&1 || true
    docker run -d \
        --name "${IMAGE_NAME}" \
        --restart unless-stopped \
        -p "${HOST_PORT}:${CONTAINER_PORT}" \
        "${IMAGE_NAME}:${IMAGE_TAG}"

    echo "✓ Container started. Open http://localhost:${HOST_PORT}/"
    echo "  Logs:   docker logs -f ${IMAGE_NAME}"
    echo "  Stop:   docker rm -f ${IMAGE_NAME}"
else
    cat <<USAGE

Next steps:
  • Run (Docker):            docker run -d -p ${HOST_PORT}:${CONTAINER_PORT} ${IMAGE_NAME}:${IMAGE_TAG}
  • Run (Compose plugin):    docker compose up -d
  • This script, auto-run:   ./build-docker.sh --run

USAGE
fi