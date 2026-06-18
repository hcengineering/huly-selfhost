#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${1:-backup-praut/${STAMP}}"
CR_DB="${CR_DATABASE:-defaultdb}"

if ! [[ "$CR_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Unsupported CockroachDB database name: $CR_DB" >&2
  exit 1
fi

mkdir -p "$DEST"

copy_if_exists() {
  local path="$1"
  if [ -e "$path" ]; then
    cp -R "$path" "$DEST/"
  fi
}

copy_if_exists huly_v7.conf
copy_if_exists nginx.conf
copy_if_exists .huly.nginx
copy_if_exists compose.yml
copy_if_exists praut

docker compose config > "$DEST/compose.resolved.yaml"

if [ -n "$(docker compose ps -q cockroach 2>/dev/null)" ]; then
  echo "Backing up CockroachDB database $CR_DB to $DEST/cockroachdb"
  CR_BACKUP_SUBDIR="praut-backup/${STAMP}"
  CR_BACKUP_URI="nodelocal://1/${CR_BACKUP_SUBDIR}"
  CR_CONTAINER="$(docker compose ps -q cockroach)"

  rm -rf "$DEST/cockroachdb"
  mkdir -p "$DEST/cockroachdb"

  docker compose exec \
    -e CR_DB="$CR_DB" \
    -e CR_BACKUP_SUBDIR="$CR_BACKUP_SUBDIR" \
    -e CR_BACKUP_URI="$CR_BACKUP_URI" \
    -T cockroach sh -eu -c '
      rm -rf "/cockroach/cockroach-data/extern/${CR_BACKUP_SUBDIR}"
      ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database="${CR_DB}" \
        --execute="BACKUP DATABASE ${CR_DB} INTO '\''${CR_BACKUP_URI}'\''"
    '

  docker cp "${CR_CONTAINER}:/cockroach/cockroach-data/extern/${CR_BACKUP_SUBDIR}/." "$DEST/cockroachdb/"

  {
    echo "CockroachDB native backup"
    echo "Created: ${STAMP}"
    echo "Database: ${CR_DB}"
    echo "Image: cockroachdb/cockroach:latest-v24.2"
    echo "Source URI: ${CR_BACKUP_URI}"
    echo "Restore smoke URI: nodelocal://1/restore"
    echo "Restore command: RESTORE DATABASE ${CR_DB} FROM LATEST IN 'nodelocal://1/restore';"
  } > "$DEST/cockroachdb.BACKUP_INFO.txt"

  docker compose exec -T cockroach sh -eu -c '
    DB="$1"
    ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database="$DB" --format=tsv --execute="
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_catalog = '\''$DB'\''
        AND table_type = '\''BASE TABLE'\''
        AND table_schema NOT IN ('\''crdb_internal'\'','\''pg_catalog'\'','\''pg_extension'\'','\''information_schema'\'')
      ORDER BY table_schema, table_name
    " | tail -n +2 | while read -r schema table; do
      quoted_schema=$(printf "%s" "$schema" | sed "s/\"/\"\"/g")
      quoted_table=$(printf "%s" "$table" | sed "s/\"/\"\"/g")
      count=$(./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database="$DB" --format=tsv --execute="SELECT count(*) FROM \"${quoted_schema}\".\"${quoted_table}\"" | tail -n 1)
      printf "%s.%s\t%s\n" "$schema" "$table" "$count"
    done
  ' -- "$CR_DB" > "$DEST/cockroachdb.ROW_COUNTS.tsv"

  docker compose exec \
    -e CR_BACKUP_SUBDIR="$CR_BACKUP_SUBDIR" \
    -T cockroach sh -eu -c '
      rm -rf "/cockroach/cockroach-data/extern/${CR_BACKUP_SUBDIR}"
    '
else
  echo "CockroachDB container is not running; skipped database backup." > "$DEST/cockroachdb.SKIPPED.txt"
fi

if [ -n "$(docker compose ps -q minio 2>/dev/null)" ]; then
  echo "Backing up MinIO files to $DEST/minio-data"
  MINIO_CONTAINER="$(docker compose ps -q minio)"
  rm -rf "$DEST/minio-data"
  mkdir -p "$DEST/minio-data"
  docker cp "${MINIO_CONTAINER}:/data/." "$DEST/minio-data/"
  MINIO_TOTAL_FILES="$(find "$DEST/minio-data" -type f | wc -l | tr -d ' ')"
  MINIO_DATA_FILES="$(find "$DEST/minio-data" -path "$DEST/minio-data/.minio.sys" -prune -o -type f -print | wc -l | tr -d ' ')"
  {
    printf "total_files\t%s\n" "$MINIO_TOTAL_FILES"
    printf "files_excluding_minio_sys\t%s\n" "$MINIO_DATA_FILES"
    printf "has_minio_sys\t"
    if [ -d "$DEST/minio-data/.minio.sys" ]; then
      echo "yes"
    else
      echo "no"
    fi
  } > "$DEST/minio.FILE_COUNTS.txt"
else
  echo "MinIO container is not running; skipped file backup." > "$DEST/minio-files.SKIPPED.txt"
fi

cat > "$DEST/MANIFEST.txt" <<MANIFEST
Praut Huly backup
Created: ${STAMP}
Host: ${HOST_ADDRESS:-unknown}
Secure: ${SECURE:-false}
Title: ${TITLE:-unknown}
Default language: ${DEFAULT_LANGUAGE:-unknown}
Last name first: ${LAST_NAME_FIRST:-unknown}
Disable signup: ${DISABLE_SIGNUP:-false}
Cockroach backup: native
Cockroach database: ${CR_DB}
MinIO files: filesystem copy
MANIFEST

echo "Backup written to $DEST"
