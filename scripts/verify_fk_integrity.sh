#!/usr/bin/env bash
set -euo pipefail

: ${DB_HOST:=localhost}
: ${DB_PORT:=3306}
: ${DB_USER:=root}
: ${DB_PASS:=}
: ${DB_NAME:=lend}

echo "== FK Integrity Verification: $DB_NAME on $DB_HOST:$DB_PORT =="

if ! command -v mysql >/dev/null 2>&1; then
  echo "ERROR: mysql CLI not found. Please install MySQL client to run this script.";
  exit 1;
fi

INTEGRITY=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -se \
  'SELECT IFNULL(NOT EXISTS (SELECT 1 FROM loans l LEFT JOIN borrowers b ON l.borrower_id=b.id WHERE b.id IS NULL),1);')

if [ "$INTEGRITY" = 1 ]; then
  echo "OK: loans.borrower_id FK integrity holds."
else
  echo "ERROR: Found orphan loans.borrower_id rows (foreign key integrity violation)."
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -se "SELECT l.id, l.borrower_id FROM loans l LEFT JOIN borrowers b ON l.borrower_id=b.id WHERE b.id IS NULL LIMIT 5;"
  exit 2
fi

echo "FK integrity checks completed."
