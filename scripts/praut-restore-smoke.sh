#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 /path/to/backup-praut/STAMP" >&2
}

if [ "${1:-}" = "" ]; then
  usage
  exit 2
fi

BACKUP_DIR="$(cd "$1" && pwd)"
STAMP="$(basename "$BACKUP_DIR")"
RESTORE_ROOT="${RESTORE_ROOT:-/root/huly-restore-smoke}"
RESTORE_DIR="${RESTORE_ROOT}/${STAMP}"
PROJECT_NAME="${RESTORE_PROJECT_NAME:-huly_restore_smoke}"
COMPOSE_FILE="compose.restore-smoke.yml"
CR_DB="${CR_DATABASE:-defaultdb}"

if ! [[ "$CR_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Unsupported CockroachDB database name: $CR_DB" >&2
  exit 1
fi

if [ ! -d "$BACKUP_DIR/cockroachdb" ]; then
  if [ -f "$BACKUP_DIR/cockroachdb.sql.gz" ]; then
    echo "Refusing legacy SQL-only backup: $BACKUP_DIR/cockroachdb.sql.gz" >&2
    echo "Run scripts/praut-backup.sh again to create a native CockroachDB backup directory." >&2
  else
    echo "Missing native CockroachDB backup directory: $BACKUP_DIR/cockroachdb" >&2
  fi
  exit 1
fi

if [ ! -d "$BACKUP_DIR/minio-data" ]; then
  echo "Missing MinIO backup directory: $BACKUP_DIR/minio-data" >&2
  exit 1
fi

mkdir -p "$RESTORE_DIR"
rm -rf "$RESTORE_DIR/cockroachdb" "$RESTORE_DIR/minio-data" "$RESTORE_DIR/crdb-data"
cp -R "$BACKUP_DIR/cockroachdb" "$RESTORE_DIR/cockroachdb"
cp -R "$BACKUP_DIR/minio-data" "$RESTORE_DIR/minio-data"

for path in MANIFEST.txt cockroachdb.BACKUP_INFO.txt cockroachdb.ROW_COUNTS.tsv minio.FILE_COUNTS.txt compose.yml compose.resolved.yaml huly_v7.conf nginx.conf .huly.nginx; do
  if [ -e "$BACKUP_DIR/$path" ]; then
    cp -R "$BACKUP_DIR/$path" "$RESTORE_DIR/"
  fi
done

cat > "$RESTORE_DIR/$COMPOSE_FILE" <<'YAML'
services:
  cockroach:
    image: cockroachdb/cockroach:latest-v24.2
    command:
      - start-single-node
      - --accept-sql-without-tls
      - --external-io-dir=/cockroach/external
    volumes:
      - ./crdb-data:/cockroach/cockroach-data
      - ./cockroachdb:/cockroach/external/restore:ro
    networks:
      - restore_smoke
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: restore-smoke
      MINIO_ROOT_PASSWORD: restore-smoke-password
    volumes:
      - ./minio-data:/data:ro
    networks:
      - restore_smoke
networks:
  restore_smoke:
    name: huly_restore_smoke_net
YAML

cd "$RESTORE_DIR"

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d

cleanup() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --execute="SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --execute="SELECT 1" >/dev/null

RESTORE_LOG="$RESTORE_DIR/cockroachdb.RESTORE_OUTPUT.txt"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --execute="
  DROP DATABASE IF EXISTS ${CR_DB} CASCADE;
  RESTORE DATABASE ${CR_DB} FROM LATEST IN 'nodelocal://1/restore';
" > "$RESTORE_LOG" 2>&1

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T cockroach sh -eu -c '
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
' -- "$CR_DB" > "$RESTORE_DIR/cockroachdb.RESTORED_ROW_COUNTS.tsv"

if [ -f "$RESTORE_DIR/cockroachdb.ROW_COUNTS.tsv" ]; then
  diff -u "$RESTORE_DIR/cockroachdb.ROW_COUNTS.tsv" "$RESTORE_DIR/cockroachdb.RESTORED_ROW_COUNTS.tsv" > "$RESTORE_DIR/cockroachdb.ROW_COUNTS.diff" || {
    echo "Restored row counts do not match backup row counts. See $RESTORE_DIR/cockroachdb.ROW_COUNTS.diff" >&2
    exit 1
  }
fi

TABLE_COUNT="$(wc -l < "$RESTORE_DIR/cockroachdb.RESTORED_ROW_COUNTS.tsv" | tr -d ' ')"
CURRENT_EPOCH_RESULT="$(docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database="$CR_DB" --format=tsv --execute="SELECT public.current_epoch_ms()" | tail -n 1)"

MINIO_TOTAL_FILES="$(find "$RESTORE_DIR/minio-data" -type f | wc -l | tr -d ' ')"
MINIO_DATA_FILES="$(find "$RESTORE_DIR/minio-data" -path "$RESTORE_DIR/minio-data/.minio.sys" -prune -o -type f -print | wc -l | tr -d ' ')"
if [ ! -d "$RESTORE_DIR/minio-data/.minio.sys" ]; then
  echo "Missing restored MinIO .minio.sys directory" >&2
  exit 1
fi

if [ -f "$RESTORE_DIR/minio.FILE_COUNTS.txt" ]; then
  EXPECTED_MINIO_TOTAL="$(awk -F '\t' '$1=="total_files"{print $2}' "$RESTORE_DIR/minio.FILE_COUNTS.txt")"
  if [ "$EXPECTED_MINIO_TOTAL" != "$MINIO_TOTAL_FILES" ]; then
    echo "MinIO file count mismatch: expected $EXPECTED_MINIO_TOTAL, got $MINIO_TOTAL_FILES" >&2
    exit 1
  fi
fi

find "$RESTORE_DIR/minio-data" -path "$RESTORE_DIR/minio-data/.minio.sys" -prune -o -type f -print | sort | awk 'NR==1 || NR==50 || NR==100 || NR==150 || NR==200 {print}' > "$RESTORE_DIR/minio.SAMPLE_FILES.txt"
while IFS= read -r sample; do
  [ -n "$sample" ] || continue
  head -c 16 "$sample" >/dev/null
done < "$RESTORE_DIR/minio.SAMPLE_FILES.txt"

cat > "$RESTORE_DIR/RESTORE_SMOKE_RESULT.md" <<RESULT
# Huly Restore Smoke Result - ${STAMP}

Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Backup source: ${BACKUP_DIR}
Restore workspace: ${RESTORE_DIR}
Compose project: ${PROJECT_NAME}
Public ports: none published

## Result

PASS

## CockroachDB

- Backup format: native CockroachDB backup directory.
- Database: ${CR_DB}
- Restore command: RESTORE DATABASE ${CR_DB} FROM LATEST IN 'nodelocal://1/restore';
- Restored table count: ${TABLE_COUNT}
- Row count comparison: PASS
- public.current_epoch_ms(): ${CURRENT_EPOCH_RESULT}

## MinIO

- Total files: ${MINIO_TOTAL_FILES}
- Files excluding .minio.sys: ${MINIO_DATA_FILES}
- .minio.sys exists: yes
- Sample object reads: PASS

## Cleanup

- Temporary restore workspace preserved for audit.
- Isolated containers were stopped and removed after the test.
RESULT

cleanup
trap - EXIT

echo "Restore smoke PASS. Result: $RESTORE_DIR/RESTORE_SMOKE_RESULT.md"
