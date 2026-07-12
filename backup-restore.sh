#!/usr/bin/env bash
#
# Restore a downloaded backup into this local Huly deployment.
# Connection parameters are read from huly_v7.conf (same file docker compose uses).
#
# By default this restores in MERGE mode: only new/changed documents from the
# backup are uploaded, and any data already present in the workspace but not
# in the backup is left untouched (nothing is deleted). Use --no-merge to
# restore the destructive way (server is made to match the backup exactly,
# i.e. anything not in the backup gets removed).
#
# Usage:
#   ./backup-restore.sh <backup-dir> <workspace> [date] [--no-accounts] [--no-upgrade] [--no-merge] [-y] [-- <extra tool args>]
#
# Example:
#   ./backup-restore.sh ./backups/myws myws
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
DATE=""
EXTRA_ARGS=()
# Restore person/socialId accounts from the backup. On by default - needed when
# migrating a workspace so its members/authors are recreated. Disable with --no-accounts.
RESTORE_ACCOUNTS=true
# Upgrade the workspace to the current model version after restore. On by default -
# the backup is usually from an older version. Disable with --no-upgrade.
UPGRADE=true
# Merge mode: only add/update documents from the backup, never delete anything
# already present in the workspace. On by default so restores are safe to
# re-run and only bring in what's missing. Disable with --no-merge to make
# the workspace match the backup exactly (deletes data not in the backup).
MERGE=true
# Skip the interactive confirmation prompt that --no-merge triggers (useful
# for CI/automation). Has no effect when merge is on.
ASSUME_YES=false

shift $(( $# >= 2 ? 2 : $# )) || true

# Optional flags, then optional [date], then optional `-- extra args`
while [ $# -gt 0 ] && [ "${1:-}" != "--" ]; do
    case "$1" in
        --accounts)    RESTORE_ACCOUNTS=true;  shift ;;
        --no-accounts) RESTORE_ACCOUNTS=false; shift ;;
        --upgrade)     UPGRADE=true;  shift ;;
        --no-upgrade)  UPGRADE=false; shift ;;
        --merge)       MERGE=true;    shift ;;
        --no-merge)    MERGE=false;   shift ;;
        -y|--yes)      ASSUME_YES=true; shift ;;
        *) DATE="$1"; shift ;;
    esac
done
if [ "${1:-}" == "--" ]; then
    shift
    EXTRA_ARGS=("$@")
fi

if [ -z "$BACKUP_DIR" ] || [ -z "$WORKSPACE" ]; then
    echo "Usage: $0 <backup-dir> <workspace> [date] [--no-accounts] [--no-upgrade] [--no-merge] [-y] [-- <extra tool args>]"
    echo ""
    echo "  <backup-dir>   Local directory with downloaded backup files"
    echo "  <workspace>    Target workspace id/url to restore into"
    echo "  [date]         Optional snapshot timestamp (ms). Default: latest"
    echo "  --no-accounts  Do not restore person/socialId accounts (default: restore them)"
    echo "  --no-upgrade   Do not upgrade the workspace after restore (default: upgrade)"
    echo "  --no-merge     Delete data not present in the backup (default: merge, nothing is deleted)"
    echo "  -y, --yes      Skip the confirmation prompt triggered by --no-merge"
    echo "  -- <args>      Extra args passed to 'tool backup-restore' (e.g. --recheck)"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "\033[1;31mBackup directory not found: $BACKUP_DIR\033[0m"
    exit 1
fi

# Resolve absolute path for the volume mount
BACKUP_ABS="$(cd "$BACKUP_DIR" && pwd)"

# Required config values
: "${SECRET:?SECRET missing in $CONFIG_FILE}"
: "${CR_DB_URL:?CR_DB_URL missing in $CONFIG_FILE}"
: "${HULY_VERSION:?HULY_VERSION missing in $CONFIG_FILE}"
: "${DOCKER_NAME:?DOCKER_NAME missing in $CONFIG_FILE}"

NETWORK="${DOCKER_NAME}_huly_net"

echo -e "\033[1;34mRestoring backup:\033[0m"
echo "  Source:    $BACKUP_ABS"
echo "  Workspace: $WORKSPACE"
echo "  Date:      ${DATE:-latest}"
echo "  Accounts:  ${RESTORE_ACCOUNTS}"
echo "  Upgrade:   ${UPGRADE}"
echo "  Merge:     ${MERGE} $([ "$MERGE" == true ] && echo '(existing data preserved, only new/changed restored)' || echo '(destructive, matches backup exactly)')"
echo "  Network:   $NETWORK"
echo "  Version:   $HULY_VERSION"
echo ""

# Verify the stack network exists (stack must be up)
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
    echo -e "\033[1;31mNetwork $NETWORK not found. Start the stack first: docker compose up -d\033[0m"
    exit 1
fi

# --no-merge deletes any data in the workspace that isn't present in the
# backup and cannot be undone - require explicit confirmation unless -y/--yes
# was passed (e.g. for scripted/CI use).
if [ "$MERGE" != true ] && [ "$ASSUME_YES" != true ]; then
    echo -e "\033[1;31mWARNING: --no-merge will DELETE any data in workspace '$WORKSPACE'\033[0m"
    echo -e "\033[1;31mthat is not present in the backup. This cannot be undone.\033[0m"
    echo ""
    read -r -p "Type the workspace name (${WORKSPACE}) to confirm, anything else to abort: " CONFIRM
    if [ "$CONFIRM" != "$WORKSPACE" ]; then
        echo "Aborted."
        exit 1
    fi
    echo ""
fi

CMD=(backup-restore /backup "$WORKSPACE")
[ -n "$DATE" ] && CMD+=("$DATE")
[ "$RESTORE_ACCOUNTS" == true ] && CMD+=(--accounts)
[ "$MERGE" == true ] && CMD+=(--merge)
[ ${#EXTRA_ARGS[@]} -gt 0 ] && CMD+=("${EXTRA_ARGS[@]}")

RUN_TOOL_DOCKER_ARGS="-v ${BACKUP_ABS}:/backup" ./run-tool.sh "${CMD[@]}"

echo -e "\n\033[1;32mRestore finished.\033[0m"

# Upgrade the workspace to the current model version (backups are usually older).
if [ "$UPGRADE" == true ]; then
    echo -e "\n\033[1;34mUpgrading workspace ${WORKSPACE} to the current version...\033[0m"
    ./run-tool.sh upgrade-workspace "$WORKSPACE"
    echo -e "\033[1;32mUpgrade finished.\033[0m"
fi

# This deployment uses minio for blob storage; the tool's backup-restore writes
# blobs there directly. A blobs/blobs.json manifest means the backup was taken
# from a datalake-based deployment and contains extra blobs that must be
# uploaded separately - not supported here.
if [ -f "$BACKUP_ABS/blobs/blobs.json" ]; then
    echo -e "\n\033[1;33mWarning: $BACKUP_ABS/blobs/blobs.json found (extra datalake blobs).\033[0m"
    echo -e "\033[1;33mThis stack has no datalake service; these blobs were NOT uploaded.\033[0m"
fi
