#!/bin/bash
set -e

# Run migrations
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    \i /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql
EOSQL

echo "Database initialization completed successfully"