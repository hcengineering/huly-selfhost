#!/usr/bin/env bash
#
# Take a backup of a workspace in this local Huly deployment.
# Connection parameters are read from huly_v7.conf (same file docker compose uses).
#
# Backups are incremental: each run only downloads and stores documents that
# are new or changed since the last backup snapshot in <backup-dir> (based on
# per-domain hashes). Re-running this against the same directory is cheap and
# safe - it just adds another snapshot on top of what's already there.
#
# Usage:
#   ./backup-create.sh <backup-dir> <workspace> [options] [-- <extra tool args>]
#
# Options:
#   --full              Force a full recheck: compare every document instead of relying on
#                        stored hashes (slower, use if you suspect the backup is out of sync)
#   --full-verify        Full verification: download and diff every document against the
#                        server, not just changed ones (slowest, most thorough)
#   --force              Force backup even if no transactions changed since last run
#   --include <domains>  ; separated list of domains to include (default: all)
#   --skip <domains>      ; separated list of domains to skip
#   --blob-limit <mb>     Skip blobs larger than this size in MB (default: 5)
#   --content-types <ct>  ; separated content type prefixes to skip downloading (e.g. video/;audio/)
#   --timeout <sec>       Connect timeout in seconds (default: 30)
#   --keep-snapshots <n>  Compact backup once it has more than N snapshots (default: 14)
#
# Examples:
#   ./backup-create.sh ./backups/myws myws
#   ./backup-create.sh ./backups/myws myws --full-verify
#   ./backup-create.sh ./backups/myws myws --skip fulltext-blob
set -euo pipefail

CONFIG_FILE="huly_v7.conf"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "\033[1;31mConfig not found: $CONFIG_FILE. Run ./setup.sh first.\033[0m"
    exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG_FILE"

# Args
BACKUP_DIR="${1:-}"
WORKSPACE="${2:-}"
shift $(( $# >= 2 ? 2 : $# )) || true

FULL=false
FULL_VERIFY=false
FORCE=false
INCLUDE=""
SKIP=""
BLOB_LIMIT="5"
CONTENT_TYPES=""
TIMEOUT="30"
KEEP_SNAPSHOTS="14"
EXTRA_ARGS=()

while [ $# -gt 0 ] && [ "${1:-}" != "--" ]; do
    case "$1" in
        --full)            FULL=true;        shift ;;
        --full-verify)     FULL_VERIFY=true; shift ;;
        --force)           FORCE=true;       shift ;;
        --include)         INCLUDE="$2";     shift 2 ;;
        --skip)            SKIP="$2";        shift 2 ;;
        --blob-limit)      BLOB_LIMIT="$2";  shift 2 ;;
        --content-types)   CONTENT_TYPES="$2"; shift 2 ;;
        --timeout)         TIMEOUT="$2";     shift 2 ;;
        --keep-snapshots)  KEEP_SNAPSHOTS="$2"; shift 2 ;;
        *)
            echo -e "\033[1;31mUnknown option: $1\033[0m"
            exit 1
            ;;
    esac
done
if [ "${1:-}" == "--" ]; then
    shift
    EXTRA_ARGS=("$@")
fi

if [ -z "$BACKUP_DIR" ] || [ -z "$WORKSPACE" ]; then
    echo "Usage: $0 <backup-dir> <workspace> [options] [-- <extra tool args>]"
    echo ""
    echo "  <backup-dir>       Local directory to store/append the backup (created if missing)"
    echo "  <workspace>        Workspace id/url to back up"
    echo "  --full             Force full recheck of all documents (slower)"
    echo "  --full-verify      Download and diff every document against the server (slowest)"
    echo "  --force            Force backup even if no transactions changed"
    echo "  --include <d>      ; separated list of domains to include (default: all)"
    echo "  --skip <d>         ; separated list of domains to skip"
    echo "  --blob-limit <mb>  Skip blobs larger than this size in MB (default: 5)"
    echo "  --content-types <t> ; separated content type prefixes to skip (e.g. video/;audio/)"
    echo "  --timeout <sec>    Connect timeout in seconds (default: 30)"
    echo "  --keep-snapshots <n> Compact once more than N snapshots exist (default: 14)"
    echo "  -- <args>          Extra args passed to 'tool backup'"
    exit 1
fi

# Create the backup directory if it doesn't exist yet (first run)
mkdir -p "$BACKUP_DIR"
BACKUP_ABS="$(cd "$BACKUP_DIR" && pwd)"

# Required config values
: "${SECRET:?SECRET missing in $CONFIG_FILE}"
: "${CR_DB_URL:?CR_DB_URL missing in $CONFIG_FILE}"
: "${HULY_VERSION:?HULY_VERSION missing in $CONFIG_FILE}"
: "${DOCKER_NAME:?DOCKER_NAME missing in $CONFIG_FILE}"

NETWORK="${DOCKER_NAME}_huly_net"

echo -e "\033[1;34mCreating backup:\033[0m"
echo "  Destination:    $BACKUP_ABS"
echo "  Workspace:      $WORKSPACE"
echo "  Full recheck:   $FULL"
echo "  Full verify:    $FULL_VERIFY"
echo "  Force:          $FORCE"
echo "  Include:        ${INCLUDE:-*}"
echo "  Skip:           ${SKIP:-none}"
echo "  Blob limit:     ${BLOB_LIMIT}mb"
echo "  Keep snapshots: $KEEP_SNAPSHOTS"
echo "  Network:        $NETWORK"
echo "  Version:        $HULY_VERSION"
echo ""

# Verify the stack network exists (stack must be up)
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
    echo -e "\033[1;31mNetwork $NETWORK not found. Start the stack first: docker compose up -d\033[0m"
    exit 1
fi

CMD=(backup /backup "$WORKSPACE")
[ "$FULL" == true ] && CMD+=(--full)
[ "$FULL_VERIFY" == true ] && CMD+=(--fullVerify)
[ "$FORCE" == true ] && CMD+=(--force)
[ -n "$INCLUDE" ] && CMD+=(--include "$INCLUDE")
[ -n "$SKIP" ] && CMD+=(--skip "$SKIP")
[ -n "$BLOB_LIMIT" ] && CMD+=(--blobLimit "$BLOB_LIMIT")
[ -n "$CONTENT_TYPES" ] && CMD+=(--contentTypes "$CONTENT_TYPES")
[ -n "$TIMEOUT" ] && CMD+=(--timeout "$TIMEOUT")
[ -n "$KEEP_SNAPSHOTS" ] && CMD+=(--keepSnapshots "$KEEP_SNAPSHOTS")
[ ${#EXTRA_ARGS[@]} -gt 0 ] && CMD+=("${EXTRA_ARGS[@]}")

RUN_TOOL_DOCKER_ARGS="-v ${BACKUP_ABS}:/backup" ./run-tool.sh "${CMD[@]}"

echo -e "\n\033[1;32mBackup finished.\033[0m"
echo "  Stored in: $BACKUP_ABS"
