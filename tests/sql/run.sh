#!/bin/sh
# Rejoue les migrations proposées 002, 005 et 006 sur une base PostgreSQL JETABLE (jamais Supabase) puis les contrôles de contraintes.
# Usage : PGHOST=/tmp PGPORT=5544 PGUSER=postgres sh tests/sql/run.sh
set -e
cd "$(dirname "$0")/../.."
psql -q -d postgres -c "drop database if exists ar_test" -c "create database ar_test"
P="psql -q -v ON_ERROR_STOP=1 -d ar_test"
$P -f tests/sql/stub_schema.sql
$P -f supabase/migrations/002_poll_snapshots.sql
$P -f supabase/proposals/006_poll_round.sql
$P -f supabase/proposals/005_election_results.sql
$P -t -A -f tests/sql/005_006_contraintes.sql > /tmp/ar_sql_out.txt; grep -v "^$" /tmp/ar_sql_out.txt
if grep -q "^FAIL" /tmp/ar_sql_out.txt; then echo "ÉCHEC SQL"; exit 1; fi
sh tests/sql/concurrence.sh
