#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export TZ="${TZ:-Europe/Prague}"

RETENTION_DAYS="${PRAUT_BACKUP_RETENTION_DAYS:-14}"
BACKUP_ROOT="${PRAUT_SCHEDULED_BACKUP_ROOT:-backup-praut/scheduled}"
LOG_DIR="${PRAUT_BACKUP_LOG_DIR:-backup-praut/logs}"
LOCK_FILE="${PRAUT_BACKUP_LOCK_FILE:-/tmp/praut-scheduled-backup.lock}"

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || [ "$RETENTION_DAYS" -lt 1 ]; then
  echo "PRAUT_BACKUP_RETENTION_DAYS must be a positive integer." >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT" "$LOG_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another PRAUT scheduled backup is already running; exiting."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_ROOT}/${STAMP}"
LOG_FILE="${LOG_DIR}/scheduled-${STAMP}.log"

{
  echo "[$(date -Is)] Starting scheduled PRAUT backup."
  echo "Destination: ${DEST}"
  echo "Retention days: ${RETENTION_DAYS}"

  scripts/praut-backup.sh "$DEST"

  echo "[$(date -Is)] Removing scheduled backups older than ${RETENTION_DAYS} days from ${BACKUP_ROOT}."
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} +

  echo "[$(date -Is)] Scheduled PRAUT backup completed."
} 2>&1 | tee "$LOG_FILE"
