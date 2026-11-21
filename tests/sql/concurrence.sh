#!/bin/sh
# Écritures concurrentes (deux sessions psql réelles) sur la base jetable ar_test : aucune incohérence ne doit passer entre deux transactions.
# Prérequis : base ar_test avec 002, 006, 005 (voir run.sh). PGHOST / PGPORT / PGUSER fournis par l'environnement.
set -u
P="psql -q -X -d ar_test"
R=0; ok(){ echo "ok   $1"; }; ko(){ echo "FAIL $1"; R=1; }
E=00000000-0000-0000-0000-0000000e0
mk(){ # $1 = n : élection, 3 candidatures et un tour (brouillon) d'identifiants dérivés de n
  $P -v ON_ERROR_STOP=1 <<SQL
insert into elections(id) values ('${E}00$1');
insert into candidacies(id,election_id) values ('00000000-0000-0000-0000-00000000c${1}01','${E}00$1'),('00000000-0000-0000-0000-00000000c${1}02','${E}00$1'),('00000000-0000-0000-0000-00000000c${1}03','${E}00$1');
insert into election_round_results(id,election_id,round_number,held_on,result_status,expressed_votes) values ('00000000-0000-0000-0000-00000000d${1}01','${E}00$1',1,'2027-04-10','provisional',1000);
SQL
}
ins(){ echo "insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes,$3) values ('00000000-0000-0000-0000-00000000d${1}01','candidacy','00000000-0000-0000-0000-00000000c${1}0$2',$4,$5);"; }
race(){ # $1 = n, $2 = SQL de T1 (tient 2 s), $3 = SQL de T2 ; lance T1 puis T2 0,7 s plus tard ; sorties dans /tmp/ar_c1 /tmp/ar_c2
  rm -f /tmp/ar_c1 /tmp/ar_c2 /tmp/ar_rc1 /tmp/ar_rc2
  ( printf 'begin;\n%s\nset constraints all immediate;\nselect pg_sleep(2);\ncommit;\n' "$2" | $P -v ON_ERROR_STOP=1 >/tmp/ar_c1 2>&1; echo $? >/tmp/ar_rc1 ) &
  sleep 0.7
  ( printf 'begin;\n%s\nset constraints all immediate;\ncommit;\n' "$3" | $P -v ON_ERROR_STOP=1 >/tmp/ar_c2 2>&1; echo $? >/tmp/ar_rc2 ) &
  wait
}
cnt(){ $P -t -A -c "select count(*) filter (where elected), count(*) filter (where qualified_next_round) from election_candidate_results where round_result_id='00000000-0000-0000-0000-00000000d${1}01'"; }

# Modèle de la course : chaque transaction exécute son contrôle (SET CONSTRAINTS IMMEDIATE) AVANT que l'autre ait validé ; sans verrou, les deux contrôles
# passent puis les deux transactions valident (incohérence). T1 garde sa transaction ouverte 2 s ; T2 démarre 0,7 s plus tard.
# 1. T1 : un élu ; T2 : un qualifié, même tour, simultanément -> exactement une des deux échoue, jamais les deux validées
mk 1; race 1 "$(ins 1 1 elected 100 true)" "$(ins 1 2 qualified_next_round 90 true)"
rc1=$(cat /tmp/ar_rc1); rc2=$(cat /tmp/ar_rc2); st=$(cnt 1)
[ "$rc1" != "$rc2" ] && [ "$st" = "1|0" -o "$st" = "0|1" ] && ok "concurrence 1 : élu / qualifié simultanés -> une seule transaction validée ($st)" || ko "concurrence 1 : élu / qualifié simultanés : rc=$rc1/$rc2 état=$st"
grep -q "élu et des candidats qualifiés" /tmp/ar_c1 /tmp/ar_c2 && ok "concurrence 1 : la transaction refusée l'est pour incohérence élu/qualifié" || ko "concurrence 1 : message attendu absent"
# 2. même chose avec l'ordre inverse (qualifié d'abord)
mk 2; race 2 "$(ins 2 1 qualified_next_round 100 true)" "$(ins 2 2 elected 90 true)"
rc1=$(cat /tmp/ar_rc1); rc2=$(cat /tmp/ar_rc2); st=$(cnt 2)
[ "$rc1" != "$rc2" ] && [ "$st" = "1|0" -o "$st" = "0|1" ] && ok "concurrence 2 : qualifié / élu simultanés (ordre inverse) -> une seule validée ($st)" || ko "concurrence 2 : rc=$rc1/$rc2 état=$st"
# 3. aucune fausse alerte : deux élus simultanés (plusieurs élus autorisés) et deux qualifiés simultanés
mk 3; race 3 "$(ins 3 1 elected 100 true)" "$(ins 3 2 elected 90 true)"
st=$(cnt 3); [ "$(cat /tmp/ar_rc1)" = 0 ] && [ "$(cat /tmp/ar_rc2)" = 0 ] && [ "$st" = "2|0" ] && ok "concurrence 3 : deux élus simultanés -> les deux validés (aucune limite du nombre d'élus)" || ko "concurrence 3 : rc=$(cat /tmp/ar_rc1)/$(cat /tmp/ar_rc2) état=$st"
mk 4; race 4 "$(ins 4 1 qualified_next_round 100 true)" "$(ins 4 2 qualified_next_round 90 true)"
st=$(cnt 4); [ "$(cat /tmp/ar_rc1)" = 0 ] && [ "$(cat /tmp/ar_rc2)" = 0 ] && [ "$st" = "0|2" ] && ok "concurrence 4 : deux qualifiés simultanés -> les deux validés" || ko "concurrence 4 : état=$st"
# 5. totaux : deux transactions de 600 voix chacune (exprimés = 1000) -> une seule validée
mk 5; race 5 "$(ins 5 1 qualified_next_round 600 false)" "$(ins 5 2 qualified_next_round 600 false)"
rc1=$(cat /tmp/ar_rc1); rc2=$(cat /tmp/ar_rc2); sv=$($P -t -A -c "select coalesce(sum(votes),0) from election_candidate_results where round_result_id='00000000-0000-0000-0000-00000000d501'")
[ "$rc1" != "$rc2" ] && [ "$sv" -le 1000 ] && ok "concurrence 5 : somme des voix concurrente > exprimés -> une seule validée (total $sv ≤ 1000)" || ko "concurrence 5 : rc=$rc1/$rc2 total=$sv"
# 6. sondages : deux lignes d'un même sondage avec des tours différents, simultanément
$P -v ON_ERROR_STOP=1 -c "insert into elections(id) values ('${E}099') on conflict do nothing"
race 6 "insert into poll_snapshots(election_id,snapshot_date,poll_date,pollster,scenario,entity_kind,entity_label,value_percent,round,round_basis) values ('${E}099','2026-11-01','2026-10-01','Cc','S','other','L1',10,1,'declared');" "insert into poll_snapshots(election_id,snapshot_date,poll_date,pollster,scenario,entity_kind,entity_label,value_percent,round,round_basis) values ('${E}099','2026-11-01','2026-10-01','Cc','S','other','L2',20,2,'declared');"
rc1=$(cat /tmp/ar_rc1); rc2=$(cat /tmp/ar_rc2); nr=$($P -t -A -c "select count(distinct round) from poll_snapshots where pollster='Cc'")
[ "$rc1" != "$rc2" ] && [ "$nr" = 1 ] && ok "concurrence 6 : lignes d'un même sondage avec tours différents, simultanées -> une seule validée" || ko "concurrence 6 : rc=$rc1/$rc2 tours=$nr"
# 7-8. séquence des tours : suppression du tour 1 et publication du tour 2, simultanées (dans les deux ordres) -> jamais un tour 2 publié sans tour 1
mk2(){ $P -v ON_ERROR_STOP=1 -c "insert into elections(id) values ('${E}00$1'); insert into election_round_results(id,election_id,round_number,held_on,result_status,source_id,publication_status) values ('00000000-0000-0000-0000-00000000d${1}01','${E}00$1',1,'2027-04-10','final','00000000-0000-0000-0000-0000000000b1','published')"; }
r2(){ echo "insert into election_round_results(id,election_id,round_number,held_on,result_status,source_id,publication_status) values ('00000000-0000-0000-0000-00000000d${1}02','${E}00$1',2,'2027-04-24','final','00000000-0000-0000-0000-0000000000b1','published');"; }
del1(){ echo "delete from election_round_results where id='00000000-0000-0000-0000-00000000d${1}01';"; }
seq(){ $P -t -A -c "select (select count(*) from election_round_results where election_id='${E}00$1' and round_number=1) || '|' || (select count(*) from election_round_results where election_id='${E}00$1' and round_number=2)"; }
mk2 7; race 7 "$(del1 7)" "$(r2 7)"
st=$(seq 7); [ "$(cat /tmp/ar_rc1)" = 0 ] && [ "$(cat /tmp/ar_rc2)" != 0 ] && [ "$st" = "0|0" ] && ok "concurrence 7 : suppression du tour 1 puis publication simultanée du tour 2 -> publication refusée ($st)" || ko "concurrence 7 : rc=$(cat /tmp/ar_rc1)/$(cat /tmp/ar_rc2) état=$st"
mk2 8; race 8 "$(r2 8)" "$(del1 8)"
st=$(seq 8); [ "$(cat /tmp/ar_rc1)" = 0 ] && [ "$(cat /tmp/ar_rc2)" != 0 ] && [ "$st" = "1|1" ] && grep -q "reste publié" /tmp/ar_c2 && ok "concurrence 8 : publication du tour 2 puis suppression simultanée du tour 1 -> suppression refusée ($st)" || ko "concurrence 8 : rc=$(cat /tmp/ar_rc1)/$(cat /tmp/ar_rc2) état=$st"
rm -f /tmp/ar_c1 /tmp/ar_c2 /tmp/ar_rc1 /tmp/ar_rc2
echo "concurrence : $([ $R = 0 ] && echo 'tous les contrôles passent' || echo 'ÉCHEC')"
exit $R
