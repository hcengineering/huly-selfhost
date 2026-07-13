#!/usr/bin/env bash
#
# One-shot workspace restore: create the admin account, create + assign the
# workspace, then restore a backup into it (via ./backup-restore.sh).
#
# Usage:
#   ./restore-workspace.sh <backup-dir> <workspace> [options] [-- <extra backup-restore args>]
#
# Options:
#   -e, --email <email>       Admin account email     (default: admin@local)
#   -p, --password <pass>     Admin account password  (default: generated, printed at the end)
#   -f, --first <name>        Admin first name        (default: Admin)
#   -l, --last <name>         Admin last name         (default: Platform)
#       --skip-account        Don't create the account (it already exists)
#       --skip-workspace      Don't create/assign the workspace (it already exists)
#       --date <ms>           Backup snapshot timestamp, passed to backup-restore.sh
#       --merge                Merge mode: keep existing data, only add/update from backup (default)
#       --no-merge             Destructive mode: make the workspace match the backup exactly
#                              (prompts for confirmation unless -y/--yes is also given)
#   -y, --yes                  Skip the confirmation prompt triggered by --no-merge
#
# Examples:
#   ./restore-workspace.sh ./backups/myws myws
#   ./restore-workspace.sh ./backups/myws myws -e me@example.com -p secret
#   ./restore-workspace.sh ./backups/myws myws --skip-account --no-merge
set -euo pipefail

CONFIG_FILE="huly_v7.conf"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "\033[1;31mConfig not found: $CONFIG_FILE. Run ./setup.sh first.\033[0m"
    exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG_FILE"

BACKUP_DIR="${1:-}"
WORKSPACE="${2:-}"
shift $(( $# >= 2 ? 2 : $# )) || true

EMAIL="admin@local"
PASSWORD=""
FIRST="Admin"
LAST="Platform"
SKIP_ACCOUNT=false
SKIP_WORKSPACE=false
DATE=""
EXTRA_ARGS=()
# Merge mode: only add/update documents from the backup, never delete anything
# already present in the workspace. On by default. Disable with --no-merge to
# make the workspace match the backup exactly (deletes data not in the backup).
MERGE=true
# Skip the interactive confirmation prompt that --no-merge triggers in
# backup-restore.sh (useful for CI/automation).
ASSUME_YES=false

while [ $# -gt 0 ] && [ "${1:-}" != "--" ]; do
    case "$1" in
        -e|--email)       EMAIL="$2";    shift 2 ;;
        -p|--password)    PASSWORD="$2"; shift 2 ;;
        -f|--first)       FIRST="$2";    shift 2 ;;
        -l|--last)        LAST="$2";     shift 2 ;;
        --skip-account)   SKIP_ACCOUNT=true;   shift ;;
        --skip-workspace) SKIP_WORKSPACE=true; shift ;;
        --date)           DATE="$2";     shift 2 ;;
        --merge)          MERGE=true;    shift ;;
        --no-merge)       MERGE=false;   shift ;;
        -y|--yes)         ASSUME_YES=true; shift ;;
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
    echo "Usage: $0 <backup-dir> <workspace> [options] [-- <extra backup-restore args>]"
    echo ""
    echo "  <backup-dir>        Local directory with downloaded backup files"
    echo "  <workspace>         Workspace id/url to create and restore into"
    echo "  -e, --email         Admin account email (default: admin@local)"
    echo "  -p, --password      Admin password (default: generated and printed)"
    echo "  -f, --first         Admin first name (default: Admin)"
    echo "  -l, --last          Admin last name (default: Platform)"
    echo "      --skip-account    Account already exists, don't create it"
    echo "      --skip-workspace  Workspace already exists, don't create/assign it"
    echo "      --date <ms>       Backup snapshot timestamp (default: latest)"
    echo "      --merge           Keep existing data, only add/update from backup (default)"
    echo "      --no-merge        Destructive: make the workspace match the backup exactly"
    echo "  -y, --yes           Skip the confirmation prompt triggered by --no-merge"
    echo "  -- <args>           Extra args passed to backup-restore.sh tool call (e.g. --recheck)"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "\033[1;31mBackup directory not found: $BACKUP_DIR\033[0m"
    exit 1
fi

# Generate a password if none was provided
GENERATED_PASSWORD=false
if [ -z "$PASSWORD" ] && [ "$SKIP_ACCOUNT" != true ]; then
    set +o pipefail
    PASSWORD="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)"
    set -o pipefail
    GENERATED_PASSWORD=true
fi

echo -e "\033[1;34mRestore workspace:\033[0m"
echo "  Backup:    $BACKUP_DIR"
echo "  Workspace: $WORKSPACE"
echo "  Admin:     $EMAIL ($FIRST $LAST)"
echo "  Account:   $([ "$SKIP_ACCOUNT" == true ] && echo 'skip (exists)' || echo 'create')"
echo "  Workspace: $([ "$SKIP_WORKSPACE" == true ] && echo 'skip (exists)' || echo 'create + assign')"
echo "  Merge:     $([ "$MERGE" == true ] && echo 'yes (existing data preserved)' || echo 'no (destructive, matches backup exactly)')"
echo ""

# 1. Create the admin account (tolerate "already exists")
if [ "$SKIP_ACCOUNT" != true ]; then
    echo -e "\033[1;34m[1/4] Creating account $EMAIL...\033[0m"
    if ! ./run-tool.sh create-account "$EMAIL" -p "$PASSWORD" -f "$FIRST" -l "$LAST"; then
        echo -e "\033[1;33mcreate-account failed - account may already exist. Continuing.\033[0m"
        echo -e "\033[1;33m(Use --skip-account to silence this, or -p to match the existing password.)\033[0m"
        GENERATED_PASSWORD=false
    fi
else
    echo -e "\033[1;34m[1/4] Skipping account creation.\033[0m"
fi

# 2 + 3. Create the workspace and assign the admin to it
if [ "$SKIP_WORKSPACE" != true ]; then
    echo -e "\n\033[1;34m[2/4] Creating workspace $WORKSPACE...\033[0m"
    if ! ./run-tool.sh create-workspace "$WORKSPACE" "email:$EMAIL"; then
        echo -e "\033[1;31mcreate-workspace failed. If it already exists, rerun with --skip-workspace.\033[0m"
        exit 1
    fi

    echo -e "\n\033[1;34m[3/4] Assigning $EMAIL to $WORKSPACE...\033[0m"
    if ! ./run-tool.sh assign-workspace "$WORKSPACE" "$EMAIL"; then
        echo -e "\033[1;33massign-workspace failed - the owner may already be assigned. Continuing.\033[0m"
    fi
else
    echo -e "\n\033[1;34m[2/4] [3/4] Skipping workspace creation/assignment.\033[0m"
fi

# 4. Restore the backup
echo -e "\n\033[1;34m[4/4] Restoring backup into $WORKSPACE...\033[0m"
RESTORE_CMD=(./backup-restore.sh "$BACKUP_DIR" "$WORKSPACE")
[ -n "$DATE" ] && RESTORE_CMD+=("$DATE")
[ "$MERGE" == true ] && RESTORE_CMD+=(--merge) || RESTORE_CMD+=(--no-merge)
[ "$ASSUME_YES" == true ] && RESTORE_CMD+=(-y)
[ ${#EXTRA_ARGS[@]} -gt 0 ] && RESTORE_CMD+=(-- "${EXTRA_ARGS[@]}")
"${RESTORE_CMD[@]}"

# Summary
SCHEME="http"
[ "${SECURE:-}" == "true" ] && SCHEME="https"
echo -e "\n\033[1;32mDone. Workspace '$WORKSPACE' restored.\033[0m"
echo "  URL:      ${SCHEME}://${HOST_ADDRESS:-localhost}"
echo "  Login:    $EMAIL"
if [ "$GENERATED_PASSWORD" == true ]; then
    echo -e "  Password: $PASSWORD  \033[1;33m(generated - save it now)\033[0m"
fi
