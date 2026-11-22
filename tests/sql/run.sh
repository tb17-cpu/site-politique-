#!/bin/sh
# Rejoue les migrations proposées 002, 005 et 006 sur une base PostgreSQL JETABLE (jamais Supabase) puis les contrôles de contraintes.
# Usage : PGHOST=/tmp PGPORT=5544 PGUSER=postgres sh tests/sql/run.sh
# Sécurité :
#  - connexion LOCALE uniquement (socket Unix ou localhost) ; toute autre cible est refusée, sauf AR_ALLOW_REMOTE=1 (à n'utiliser que sur un serveur jetable) ;
#  - la base de test porte un nom UNIQUE (ar_test_<pid>_<horodatage>), créée par ce script : « create database » échoue si le nom existe déjà ;
#  - seule la base créée par CE lancement est supprimée à la fin ; aucune base préexistante n'est jamais supprimée ; AR_KEEP_DB=1 la conserve.
set -e
cd "$(dirname "$0")/../.."
H="${PGHOST:-}"
case "$H" in
  ""|/*|localhost|127.0.0.1|::1) ;;
  *) [ "${AR_ALLOW_REMOTE:-}" = 1 ] || { echo "REFUS : PGHOST='$H' n'est pas local. Ce script crée et supprime une base : serveur local jetable uniquement (AR_ALLOW_REMOTE=1 pour passer outre, à vos risques)." >&2; exit 2; } ;;
esac
[ -z "${PGHOSTADDR:-}" ] || case "$PGHOSTADDR" in 127.*|::1) ;; *) [ "${AR_ALLOW_REMOTE:-}" = 1 ] || { echo "REFUS : PGHOSTADDR='$PGHOSTADDR' n'est pas local." >&2; exit 2; } ;; esac
case "$H" in *supabase*) echo "REFUS : cible Supabase." >&2; exit 2 ;; esac
AR_DB="ar_test_$$_$(date +%s)"; export AR_DB
OUT="$(mktemp)"
CREATED=0
cleanup() {
  rm -f "$OUT"
  if [ "$CREATED" = 1 ] && [ "${AR_KEEP_DB:-}" != 1 ]; then psql -q -d postgres -c "drop database if exists \"$AR_DB\"" >/dev/null 2>&1 || echo "Avertissement : base $AR_DB non supprimée" >&2; fi
}
trap cleanup EXIT INT TERM
psql -q -d postgres -v ON_ERROR_STOP=1 -c "create database \"$AR_DB\""   # échoue (et ne supprime rien) si le nom existe déjà
CREATED=1
P="psql -q -v ON_ERROR_STOP=1 -d $AR_DB"
$P -f tests/sql/stub_schema.sql
$P -f supabase/migrations/002_poll_snapshots.sql
$P -f supabase/proposals/006_poll_round.sql
$P -f supabase/proposals/005_election_results.sql
$P -t -A -f tests/sql/005_006_contraintes.sql > "$OUT"; grep -v "^$" "$OUT"
if grep -q "^FAIL" "$OUT"; then echo "ÉCHEC SQL"; exit 1; fi
sh tests/sql/concurrence.sh
