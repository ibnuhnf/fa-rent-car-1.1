#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_NAME="${POSTGRES_DB:-fa_rent_car}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
TARGET_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[DRY-RUN] pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} | gzip > ${TARGET_FILE}"
  echo "[DRY-RUN] find ${BACKUP_DIR} -name '*.sql.gz' -mtime +7 -delete"
  exit 0
fi

echo "Creating backup: ${TARGET_FILE}"
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${TARGET_FILE}"

echo "Cleaning backups older than 7 days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete

echo "Backup complete: $(du -h "${TARGET_FILE}" | cut -f1)"
