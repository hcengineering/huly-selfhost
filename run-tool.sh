#!/usr/bin/env bash
#
# Run the Huly platform tool container against this local huly-selfhost deployment.
# Connection parameters are read from huly_v7.conf (same file docker compose uses via .env).
#
# Usage:
#   ./run-tool.sh                       # interactive shell inside the tool container
#   ./run-tool.sh <command> [args...]   # run a tool command, e.g.:
#   ./run-tool.sh create-account user@example.com -p pass -f First -l Last
#   ./run-tool.sh generate-token user@example.com ws1
#   ./run-tool.sh backup-all-to-dir /backup
#
set -euo pipefail

CONFIG_FILE="huly_v7.conf"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "\033[1;31mConfig not found: $CONFIG_FILE. Run ./setup.sh first.\033[0m"
    exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${SECRET:?SECRET missing in $CONFIG_FILE}"
: "${CR_DB_URL:?CR_DB_URL missing in $CONFIG_FILE}"
: "${HULY_VERSION:?HULY_VERSION missing in $CONFIG_FILE}"
: "${DOCKER_NAME:?DOCKER_NAME missing in $CONFIG_FILE}"

# Matches the network compose creates for this project (compose.yml: name: ${DOCKER_NAME}, networks: huly_net)
NETWORK="${DOCKER_NAME}_huly_net"

# Matches the STORAGE_CONFIG hardcoded for every service in compose.yml
STORAGE_CONFIG="minio|minio?accessKey=minioadmin&secretKey=minioadmin"

if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
    echo -e "\033[1;31mNetwork $NETWORK not found. Start the stack first: docker compose up -d\033[0m"
    exit 1
fi

# No args -> interactive shell. With args -> run as a tool command via bundle.js.
if [ $# -eq 0 ]; then
    ENTRY=(bash)
    TTY="-ti"
else
    ENTRY=(bundle.js "$@")
    TTY="-t"
fi

# Extra docker args (mounts, env) can be passed via RUN_TOOL_DOCKER_ARGS,
# e.g. RUN_TOOL_DOCKER_ARGS="-v /abs/backup:/backup" ./run-tool.sh backup-all-to-dir /backup
read -r -a EXTRA_DOCKER_ARGS <<< "${RUN_TOOL_DOCKER_ARGS:-}"

docker run --rm $TTY \
    --network "$NETWORK" \
    -e SERVER_SECRET="$SECRET" \
    -e DB_URL="$CR_DB_URL" \
    -e ACCOUNT_DB_URL="$CR_DB_URL" \
    -e STORAGE_CONFIG="$STORAGE_CONFIG" \
    -e ACCOUNTS_URL="http://account:3000" \
    -e TRANSACTOR_URL="ws://transactor:3333" \
    -e QUEUE_CONFIG="redpanda:9092" \
    -e STATS_URL="http://stats:4900" \
    ${EXTRA_DOCKER_ARGS[@]+"${EXTRA_DOCKER_ARGS[@]}"} \
    "hardcoreeng/tool:${HULY_VERSION}" \
    "${ENTRY[@]}"
