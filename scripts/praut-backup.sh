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
  echo "Backing up CockroachDB to $DEST/cockroachdb.sql.gz"
  CR_SQL_URL="${CR_DB_URL:-postgres://${CR_USERNAME:-selfhost}:${CR_USER_PASSWORD:-}@cockroach:26257/${CR_DATABASE:-defaultdb}}"
  case "$CR_SQL_URL" in
    *\?*) CR_SQL_URL="${CR_SQL_URL}&sslmode=disable" ;;
    *) CR_SQL_URL="${CR_SQL_URL}?sslmode=disable" ;;
  esac
  docker compose exec -e CR_SQL_URL="$CR_SQL_URL" -T cockroach sh -c '
    set -e
    run_sql() {
      cockroach sql --url "$CR_SQL_URL" "$@"
    }
    {
      echo "-- Schema dump"
      run_sql --format=raw -e "SHOW CREATE ALL TABLES"
      TABLES=$(run_sql --format=csv -e "
        SELECT schema_name || '"'"'.'"'"' || table_name
        FROM [SHOW TABLES FROM '"${CR_DATABASE:-defaultdb}"']
        WHERE schema_name NOT IN ('"'"'crdb_internal'"'"','"'"'pg_catalog'"'"','"'"'pg_extension'"'"','"'"'information_schema'"'"')
        ORDER BY schema_name, table_name
      " | tail -n +2)
      for tbl in $TABLES; do
        ROW_COUNT=$(run_sql --format=csv -e "SELECT count(*) FROM ${tbl}" | tail -1)
        if [ "$ROW_COUNT" -gt 0 ] 2>/dev/null; then
          echo ""
          echo "-- CSV data for IMPORT INTO ${tbl}:"
          echo "COPY ${tbl} FROM stdin WITH CSV HEADER;"
          run_sql --format=csv -e "TABLE ${tbl}"
          echo "\\."
        fi
      done
    }
  ' | gzip > "$DEST/cockroachdb.sql.gz"
else
  echo "CockroachDB container is not running; skipped database backup." > "$DEST/cockroachdb.SKIPPED.txt"
fi

if [ -n "$(docker compose ps -q minio 2>/dev/null)" ]; then
  echo "Backing up MinIO files to $DEST/minio-data"
  MINIO_CONTAINER="$(docker compose ps -q minio)"
  mkdir -p "$DEST/minio-data"
  docker cp "${MINIO_CONTAINER}:/data/." "$DEST/minio-data/"
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
MANIFEST

echo "Backup written to $DEST"
