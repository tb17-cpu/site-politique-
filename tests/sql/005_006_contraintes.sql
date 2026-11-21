-- Test des migrations proposées 005 et 006 sur une base PostgreSQL jetable (JAMAIS Supabase), données entièrement fictives.
-- Prérequis : tests/sql/stub_schema.sql (tables minimales), migrations 002, 005, 006 appliquées. Chaque contrôle doit échouer comme attendu.
\set ON_ERROR_STOP on
create temp table _r(ok boolean, n text);
grant all on _r to anon, authenticated;
create function pg_temp.expect_fail(sql text, n text, frag text default null) returns void language plpgsql as $f$
begin
  begin execute sql; insert into _r values (false, n || ' (aucune erreur levée)');
  exception when others then
    if frag is null or sqlerrm ilike '%' || frag || '%' then insert into _r values (true, n); else insert into _r values (false, n || ' (erreur inattendue : ' || sqlerrm || ')'); end if;
  end;
end $f$;
create function pg_temp.expect_ok(sql text, n text) returns void language plpgsql as $f$
begin begin execute sql; insert into _r values (true, n); exception when others then insert into _r values (false, n || ' (' || sqlerrm || ')'); end; end $f$;

insert into elections(id) values ('00000000-0000-0000-0000-00000000f001'),('00000000-0000-0000-0000-00000000f002');
insert into sources(id) values ('00000000-0000-0000-0000-0000000000b1');
insert into candidacies(id, election_id) values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000f001'),('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-00000000f001'),('00000000-0000-0000-0000-00000000c0f2','00000000-0000-0000-0000-00000000f002');
insert into parties(id) values ('00000000-0000-0000-0000-00000000a001');

-- Tours
select pg_temp.expect_ok($$insert into election_round_results(id,election_id,round_number,held_on,result_status,registered_voters,voters,abstentions,blank_votes,null_votes,expressed_votes,source_id)
  values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000f001',1,'2027-04-10','provisional',1000,750,250,20,10,720,'00000000-0000-0000-0000-0000000000b1')$$, 'tour 1 brouillon valide');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status) values ('00000000-0000-0000-0000-00000000f001',1,'2027-04-10','final')$$, 'doublon (élection, tour) refusé', 'err_unique_round');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status,registered_voters,voters) values ('00000000-0000-0000-0000-00000000f002',1,'2027-04-10','final',100,101)$$, 'votants > inscrits refusé', 'err_voters_le_registered');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status,voters,blank_votes,null_votes) values ('00000000-0000-0000-0000-00000000f002',1,'2027-04-10','final',100,60,50)$$, 'blancs + nuls > votants refusé', 'err_blank_null');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status,registered_voters,voters,abstentions) values ('00000000-0000-0000-0000-00000000f002',1,'2027-04-10','final',100,80,5)$$, 'abstentions incohérentes refusées', 'err_abstentions');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status,voters,blank_votes,null_votes,expressed_votes) values ('00000000-0000-0000-0000-00000000f002',1,'2027-04-10','final',100,10,10,50)$$, 'exprimés incohérents refusés', 'err_expressed');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status) values ('00000000-0000-0000-0000-00000000f002',1,'2027-04-10','definitif')$$, 'statut de résultat inconnu refusé', 'err_result_status');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status,publication_status) values ('00000000-0000-0000-0000-00000000f002',1,'2027-04-10','final','published')$$, 'tour publié sans source refusé', 'err_published_needs_source');
select pg_temp.expect_fail($$update election_round_results set round_number=2 where id='00000000-0000-0000-0000-0000000000d1'$$, 'n° de tour immuable', 'immuables');

-- Scores
select pg_temp.expect_ok($$insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes,percent_expressed,qualified_next_round) values ('00000000-0000-0000-0000-0000000000d1','candidacy','00000000-0000-0000-0000-00000000c001',300,41.67,true)$$, 'score candidature valide');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes) values ('00000000-0000-0000-0000-0000000000d1','candidacy','00000000-0000-0000-0000-00000000c001',10)$$, 'doublon candidature refusé', 'ecr_unique_candidacy');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes) values ('00000000-0000-0000-0000-0000000000d1','candidacy','00000000-0000-0000-0000-00000000c0f2',10)$$, 'candidature d''une autre élection refusée', 'n''appartient pas');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,party_id,candidacy_id,votes) values ('00000000-0000-0000-0000-0000000000d1','party','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000c002',10)$$, 'type party avec identifiant candidature refusé', 'ecr_entity_ref');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,votes) values ('00000000-0000-0000-0000-0000000000d1','candidacy',10)$$, 'type candidacy sans identifiant refusé', 'ecr_entity_ref');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,candidacy_id,votes) values ('00000000-0000-0000-0000-0000000000d1','other','X','00000000-0000-0000-0000-00000000c002',10)$$, 'other avec identifiant refusé', 'ecr_entity_ref');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes) values ('00000000-0000-0000-0000-0000000000d1','other','   ',10)$$, 'libellé vide refusé', 'ecr_entity_ref');
select pg_temp.expect_ok($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes) values ('00000000-0000-0000-0000-0000000000d1','other','Liste Z',50)$$, 'libellé libre valide');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes) values ('00000000-0000-0000-0000-0000000000d1','other','  liste z ',5)$$, 'doublon de libellé (casse/espaces) refusé', 'ecr_unique_label');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,party_id) values ('00000000-0000-0000-0000-0000000000d1','party','00000000-0000-0000-0000-00000000a001')$$, 'score sans voix ni pourcentage refusé', 'ecr_score_present');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,party_id,votes,percent_expressed,elected,qualified_next_round) values ('00000000-0000-0000-0000-0000000000d1','party','00000000-0000-0000-0000-00000000a001',5,1,true,true)$$, 'élu et qualifié exclusifs', 'ecr_elected_xor');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,party_id,percent_expressed) values ('00000000-0000-0000-0000-0000000000d1','party','00000000-0000-0000-0000-00000000a001',100.5)$$, 'pourcentage > 100 refusé', 'ecr_percent');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes,publication_status) values ('00000000-0000-0000-0000-0000000000d1','candidacy','00000000-0000-0000-0000-00000000c002',5,'published')$$, 'score publié sur un tour non publié refusé', 'son tour est publié');

-- Publication cohérente
select pg_temp.expect_ok($$update election_round_results set publication_status='published' where id='00000000-0000-0000-0000-0000000000d1'$$, 'publication du tour 1 (sourcé)');
select pg_temp.expect_ok($$update election_candidate_results set publication_status='published' where round_result_id='00000000-0000-0000-0000-0000000000d1'$$, 'publication des scores du tour publié');
select pg_temp.expect_fail($$update election_round_results set publication_status='draft' where id='00000000-0000-0000-0000-0000000000d1'$$, 'dépublier un tour ayant des scores publiés refusé', 'dépublier d''abord');
select pg_temp.expect_ok($$update election_round_results set result_status='final' where id='00000000-0000-0000-0000-0000000000d1'$$, 'provisoire -> définitif accepté');
select pg_temp.expect_fail($$update election_round_results set result_status='provisional' where id='00000000-0000-0000-0000-0000000000d1'$$, 'définitif -> provisoire refusé', 'redevenir provisoire');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status,source_id,publication_status) values ('00000000-0000-0000-0000-00000000f002',2,'2027-04-24','final','00000000-0000-0000-0000-0000000000b1','published')$$, 'tour 2 publié sans tour 1 publié refusé', 'tour précédent');
select pg_temp.expect_ok($$insert into election_round_results(id,election_id,round_number,held_on,result_status,source_id,publication_status) values ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-00000000f001',2,'2027-04-24','final','00000000-0000-0000-0000-0000000000b1','published')$$, 'tour 2 publié après tour 1 publié et définitif');
select pg_temp.expect_fail($$update election_candidate_results set round_result_id='00000000-0000-0000-0000-0000000000d2' where entity_label='Liste Z'$$, 'tour parent d''un score immuable', 'immuable');

-- Totaux (différés : testés en transaction explicite)
do $t$ begin
  begin
    insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,percent_expressed) values ('00000000-0000-0000-0000-0000000000d2','candidacy','00000000-0000-0000-0000-00000000c001',70);
    insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,percent_expressed) values ('00000000-0000-0000-0000-0000000000d2','candidacy','00000000-0000-0000-0000-00000000c002',40);
    set constraints all immediate;
    insert into _r values (false,'somme des pourcentages > 100,5 refusée (aucune erreur)');
  exception when others then insert into _r values (sqlerrm ilike '%dépasse 100,5%','somme des pourcentages > 100,5 refusée'); end;
end $t$;

-- Sondages : colonne round (006)
select pg_temp.expect_fail($$insert into poll_snapshots(election_id,snapshot_date,entity_kind,entity_label,value_percent,round,round_basis) values ('00000000-0000-0000-0000-00000000f001','2026-11-01','other','L',10,0,'declared')$$, 'round = 0 refusé', 'poll_round_chk');
select pg_temp.expect_fail($$insert into poll_snapshots(election_id,snapshot_date,entity_kind,entity_label,value_percent,round) values ('00000000-0000-0000-0000-00000000f001','2026-11-01','other','L',10,1)$$, 'round sans origine refusé', 'poll_round_basis_chk');
select pg_temp.expect_fail($$insert into poll_snapshots(election_id,snapshot_date,entity_kind,entity_label,value_percent,round_basis) values ('00000000-0000-0000-0000-00000000f001','2026-11-01','other','L',10,'declared')$$, 'origine sans round refusée', 'poll_round_basis_chk');
select pg_temp.expect_ok($$insert into poll_snapshots(election_id,snapshot_date,poll_date,pollster,scenario,entity_kind,entity_label,value_percent,round,round_basis) values ('00000000-0000-0000-0000-00000000f001','2026-11-01','2026-10-01','Zed','S','other','L1',10,1,'declared')$$, 'sondage avec tour déclaré');
do $t$ begin
  begin
    insert into poll_snapshots(election_id,snapshot_date,poll_date,pollster,scenario,entity_kind,entity_label,value_percent,round,round_basis) values ('00000000-0000-0000-0000-00000000f001','2026-11-01','2026-10-01','Zed','S','other','L2',20,2,'declared');
    set constraints all immediate;
    insert into _r values (false,'tours contradictoires dans un même sondage refusés (aucune erreur)');
  exception when others then insert into _r values (sqlerrm ilike '%même tour%','tours contradictoires dans un même sondage refusés'); end;
end $t$;
select pg_temp.expect_ok($$insert into poll_snapshots(election_id,snapshot_date,poll_date,pollster,scenario,entity_kind,entity_label,value_percent) values ('00000000-0000-0000-0000-00000000f001','2026-11-01','2026-10-02','Old','sans mention','other','L',10)$$, 'ancienne ligne sans tour acceptée (tour indéterminé)');

-- 005 : expressed_votes réduit sous la somme des voix déjà enregistrées (contrôle différé déclenché côté table parente)
insert into election_round_results(id,election_id,round_number,held_on,result_status,expressed_votes) values ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-00000000f002',1,'2027-04-10','provisional',1000);
insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes) values ('00000000-0000-0000-0000-0000000000d3','candidacy','00000000-0000-0000-0000-00000000c0f2',600);
insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes) values ('00000000-0000-0000-0000-0000000000d3','other','Liste Y',300);
select pg_temp.expect_fail($$update election_round_results set expressed_votes = 800 where id='00000000-0000-0000-0000-0000000000d3'; set constraints all immediate$$, 'réduire expressed_votes sous la somme des voix (900) refusé', 'dépasse les suffrages exprimés');
select pg_temp.expect_fail($$update election_round_results set expressed_votes = 899 where id='00000000-0000-0000-0000-0000000000d3'; set constraints all immediate$$, 'réduire expressed_votes à 899 (< 900) refusé', 'dépasse les suffrages exprimés');
select pg_temp.expect_ok($$update election_round_results set expressed_votes = 900 where id='00000000-0000-0000-0000-0000000000d3'; set constraints all immediate$$, 'expressed_votes égal à la somme des voix accepté');
select pg_temp.expect_ok($$update election_round_results set expressed_votes = 5000 where id='00000000-0000-0000-0000-0000000000d3'; set constraints all immediate$$, 'augmenter expressed_votes accepté');
select pg_temp.expect_ok($$update election_round_results set notes = 'x' where id='00000000-0000-0000-0000-0000000000d3'; set constraints all immediate$$, 'modification sans effet sur les totaux acceptée');

-- 005 : cohérence inter-lignes élu / qualifiés d'un même tour (round e1 : f001 tour 3, brouillon) ; le NOMBRE d'élus n'est pas limité
insert into election_round_results(id,election_id,round_number,held_on,result_status) values ('00000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-00000000f002',2,'2027-04-24','provisional');
insert into election_round_results(id,election_id,round_number,held_on,result_status) values ('00000000-0000-0000-0000-0000000000d5','00000000-0000-0000-0000-00000000f001',3,'2027-05-08','provisional');
insert into election_round_results(id,election_id,round_number,held_on,result_status) values ('00000000-0000-0000-0000-0000000000d6','00000000-0000-0000-0000-00000000f001',4,'2027-05-15','provisional');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes,elected) values ('00000000-0000-0000-0000-0000000000d4','other','A',10,true),('00000000-0000-0000-0000-0000000000d4','other','B',9,false);
  insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes,qualified_next_round) values ('00000000-0000-0000-0000-0000000000d4','other','C',8,true); set constraints all immediate$$, 'un élu ET un qualifié dans le même tour refusés (élu inséré avant)', 'élu et des candidats qualifiés');
select pg_temp.expect_fail($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes,qualified_next_round) values ('00000000-0000-0000-0000-0000000000d4','other','D',8,true),('00000000-0000-0000-0000-0000000000d4','other','E',7,true);
  insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes,elected) values ('00000000-0000-0000-0000-0000000000d4','other','F',10,true); set constraints all immediate$$, 'un élu ET des qualifiés refusés (qualifiés insérés avant)', 'élu et des candidats qualifiés');
select pg_temp.expect_ok($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes,elected) values ('00000000-0000-0000-0000-0000000000d5','other','A',10,true),('00000000-0000-0000-0000-0000000000d5','other','B',9,true),('00000000-0000-0000-0000-0000000000d5','other','C',8,true),('00000000-0000-0000-0000-0000000000d5','other','D',7,false); set constraints all immediate$$, 'plusieurs élus dans un même tour, sans qualifiés : accepté (aucune limite du nombre d''élus)');
select pg_temp.expect_ok($$insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes,qualified_next_round) values ('00000000-0000-0000-0000-0000000000d6','other','A',10,true),('00000000-0000-0000-0000-0000000000d6','other','B',9,true),('00000000-0000-0000-0000-0000000000d6','other','C',8,false); set constraints all immediate$$, 'plusieurs qualifiés sans élu : accepté');
select pg_temp.expect_fail($$update election_candidate_results set qualified_next_round = true where round_result_id='00000000-0000-0000-0000-0000000000d5' and entity_label='D'; set constraints all immediate$$, 'qualifier un candidat dans un tour qui a déjà des élus refusé (UPDATE)', 'élu et des candidats qualifiés');
select pg_temp.expect_fail($$update election_candidate_results set elected = true where round_result_id='00000000-0000-0000-0000-0000000000d6' and entity_label='C'; set constraints all immediate$$, 'déclarer élu un candidat dans un tour qui a des qualifiés refusé (UPDATE)', 'élu et des candidats qualifiés');
select pg_temp.expect_ok($$update election_candidate_results set elected = true, qualified_next_round = false where round_result_id='00000000-0000-0000-0000-0000000000d6' and entity_label in ('A','B'); update election_candidate_results set elected = false where round_result_id='00000000-0000-0000-0000-0000000000d6'; set constraints all immediate$$, 'correction cohérente dans une même transaction acceptée');

-- 005 : vues de contrôle éditorial (propriétaire uniquement) -----------------------------------------------------------------------------------
insert into elections(id) values ('00000000-0000-0000-0000-00000000e301'),('00000000-0000-0000-0000-00000000e302'),('00000000-0000-0000-0000-00000000e303');
insert into candidacies(id,election_id,second_round_status,second_round_qualified_at) values
 ('00000000-0000-0000-0000-0000000e3a01','00000000-0000-0000-0000-00000000e301','qualified',null),
 ('00000000-0000-0000-0000-0000000e3a02','00000000-0000-0000-0000-00000000e301','not_reached','2027-04-11'),
 ('00000000-0000-0000-0000-0000000e3a03','00000000-0000-0000-0000-00000000e301',null,null),
 ('00000000-0000-0000-0000-0000000e3a04','00000000-0000-0000-0000-00000000e301','not_reached',null),
 ('00000000-0000-0000-0000-0000000e3b01','00000000-0000-0000-0000-00000000e302',null,null),
 ('00000000-0000-0000-0000-0000000e3b02','00000000-0000-0000-0000-00000000e302',null,null),
 ('00000000-0000-0000-0000-0000000e3c01','00000000-0000-0000-0000-00000000e303',null,null),
 ('00000000-0000-0000-0000-0000000e3c02','00000000-0000-0000-0000-00000000e303',null,null),
 ('00000000-0000-0000-0000-0000000e3c03','00000000-0000-0000-0000-00000000e303',null,null);
insert into election_round_results(id,election_id,round_number,held_on,result_status,source_id,publication_status) values ('00000000-0000-0000-0000-0000000d3001','00000000-0000-0000-0000-00000000e301',1,'2027-04-10','final','00000000-0000-0000-0000-0000000000b1','published');
insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes,qualified_next_round,publication_status) values
 ('00000000-0000-0000-0000-0000000d3001','candidacy','00000000-0000-0000-0000-0000000e3a01',50,true,'published'),
 ('00000000-0000-0000-0000-0000000d3001','candidacy','00000000-0000-0000-0000-0000000e3a02',30,false,'published'),
 ('00000000-0000-0000-0000-0000000d3001','candidacy','00000000-0000-0000-0000-0000000e3a03',20,true,'published');
select pg_temp.expect_ok($q$do $x$ declare v text; begin
  select verdict into v from candidacy_second_round_reconciliation where candidacy_id='00000000-0000-0000-0000-0000000e3a01'; if v is distinct from 'confirmé par les résultats' then raise exception 'a01 %', v; end if;
  select verdict into v from candidacy_second_round_reconciliation where candidacy_id='00000000-0000-0000-0000-0000000e3a02'; if v is distinct from 'déclaré sans résultat confirmant' then raise exception 'a02 %', v; end if;
  select verdict into v from candidacy_second_round_reconciliation where candidacy_id='00000000-0000-0000-0000-0000000e3a03'; if v is distinct from 'résultat sans déclaration' then raise exception 'a03 %', v; end if;
  if exists (select 1 from candidacy_second_round_reconciliation where candidacy_id='00000000-0000-0000-0000-0000000e3a04') then raise exception 'a04 listé à tort (not_reached, aucune qualification)'; end if;
end $x$$q$, 'rapprochement des colonnes déclaratives et des résultats : confirmé / déclaré sans résultat / résultat sans déclaration');
-- conflits de parcours : élu ou éliminé à un tour puis présent plus tard ; un qualifié présent au tour suivant n'est PAS un conflit
insert into election_round_results(id,election_id,round_number,held_on,result_status) values
 ('00000000-0000-0000-0000-0000000d3101','00000000-0000-0000-0000-00000000e302',1,'2027-04-10','final'),('00000000-0000-0000-0000-0000000d3102','00000000-0000-0000-0000-00000000e302',2,'2027-04-24','final'),
 ('00000000-0000-0000-0000-0000000d3201','00000000-0000-0000-0000-00000000e303',1,'2027-04-10','final'),('00000000-0000-0000-0000-0000000d3202','00000000-0000-0000-0000-00000000e303',2,'2027-04-24','final');
insert into election_candidate_results(round_result_id,entity_kind,candidacy_id,votes,elected,qualified_next_round) values
 ('00000000-0000-0000-0000-0000000d3101','candidacy','00000000-0000-0000-0000-0000000e3b01',60,true,false),('00000000-0000-0000-0000-0000000d3101','candidacy','00000000-0000-0000-0000-0000000e3b02',40,false,false),
 ('00000000-0000-0000-0000-0000000d3102','candidacy','00000000-0000-0000-0000-0000000e3b01',55,false,false),('00000000-0000-0000-0000-0000000d3102','candidacy','00000000-0000-0000-0000-0000000e3b02',45,false,false),
 ('00000000-0000-0000-0000-0000000d3201','candidacy','00000000-0000-0000-0000-0000000e3c01',40,false,true),('00000000-0000-0000-0000-0000000d3201','candidacy','00000000-0000-0000-0000-0000000e3c02',35,false,true),('00000000-0000-0000-0000-0000000d3201','candidacy','00000000-0000-0000-0000-0000000e3c03',25,false,false),
 ('00000000-0000-0000-0000-0000000d3202','candidacy','00000000-0000-0000-0000-0000000e3c01',55,true,false),('00000000-0000-0000-0000-0000000d3202','candidacy','00000000-0000-0000-0000-0000000e3c02',45,false,false),('00000000-0000-0000-0000-0000000d3202','candidacy','00000000-0000-0000-0000-0000000e3c03',5,false,false);
select pg_temp.expect_ok($q$do $x$ declare n int; begin
  select count(*) into n from election_result_path_conflicts where election_id='00000000-0000-0000-0000-00000000e302'; if n <> 2 then raise exception 'e302 : % conflits (attendu 2 : élu puis réapparu, battu puis réapparu)', n; end if;
  select count(*) into n from election_result_path_conflicts where election_id='00000000-0000-0000-0000-00000000e303'; if n <> 1 then raise exception 'e303 : % conflits (attendu 1 : éliminé puis réapparu ; qualifiés au tour suivant normaux)', n; end if;
end $x$$q$, 'vue des conflits de parcours : élu/battu qui réapparaît détecté, qualifié présent au tour suivant non signalé');
select pg_temp.expect_ok($$select 1$$, 'ces cas ne sont PAS interdits en base (aucune règle universelle) : insertions acceptées plus haut');
set role anon;
select pg_temp.expect_fail($$select * from election_result_path_conflicts$$, 'anon ne peut pas lire la vue des conflits', 'permission denied');
select pg_temp.expect_fail($$select * from candidacy_second_round_reconciliation$$, 'anon ne peut pas lire la vue de rapprochement', 'permission denied');
reset role;

-- 006 : un changement d'identité de sondage ne doit pas faire rejoindre à une ligne un groupe de tour différent
-- Groupe de référence : (f001, source NULL, 'Zed', 'S', 2026-10-01, fieldwork NULL) au tour 1 (inséré plus haut).
insert into poll_snapshots(id,election_id,snapshot_date,poll_date,pollster,scenario,entity_kind,entity_label,value_percent,round,round_basis,fieldwork_start,source_id) values
 ('00000000-0000-0000-0000-0000000006a1','00000000-0000-0000-0000-00000000f001','2026-11-01','2026-10-01','Yel','S','other','M1',10,2,'declared',null,null),
 ('00000000-0000-0000-0000-0000000006a2','00000000-0000-0000-0000-00000000f001','2026-11-01','2026-10-01','Zed','T','other','M2',10,2,'declared',null,null),
 ('00000000-0000-0000-0000-0000000006a3','00000000-0000-0000-0000-00000000f001','2026-11-01','2026-09-01','Zed','S','other','M3',10,2,'declared',null,null),
 ('00000000-0000-0000-0000-0000000006a4','00000000-0000-0000-0000-00000000f001','2026-11-01','2026-10-01','Zed','S','other','M4',10,2,'declared','2026-09-01',null),
 ('00000000-0000-0000-0000-0000000006a5','00000000-0000-0000-0000-00000000f001','2026-11-01','2026-10-01','Zed','S','other','M5',10,2,'declared',null,'00000000-0000-0000-0000-0000000000b1'),
 ('00000000-0000-0000-0000-0000000006a6','00000000-0000-0000-0000-00000000f002','2026-11-01','2026-10-01','Zed','S','other','M6',10,2,'declared',null,null);
select pg_temp.expect_fail($$update poll_snapshots set pollster='Zed' where id='00000000-0000-0000-0000-0000000006a1'; set constraints all immediate$$, 'changer pollster pour rejoindre un groupe de tour différent refusé', 'même tour');
select pg_temp.expect_fail($$update poll_snapshots set scenario='S' where id='00000000-0000-0000-0000-0000000006a2'; set constraints all immediate$$, 'changer scenario pour rejoindre un groupe de tour différent refusé', 'même tour');
select pg_temp.expect_fail($$update poll_snapshots set poll_date='2026-10-01' where id='00000000-0000-0000-0000-0000000006a3'; set constraints all immediate$$, 'changer poll_date pour rejoindre un groupe de tour différent refusé', 'même tour');
select pg_temp.expect_fail($$update poll_snapshots set fieldwork_start=null where id='00000000-0000-0000-0000-0000000006a4'; set constraints all immediate$$, 'changer fieldwork_start pour rejoindre un groupe de tour différent refusé', 'même tour');
select pg_temp.expect_fail($$update poll_snapshots set source_id=null where id='00000000-0000-0000-0000-0000000006a5'; set constraints all immediate$$, 'changer source_id pour rejoindre un groupe de tour différent refusé', 'même tour');
select pg_temp.expect_fail($$update poll_snapshots set election_id='00000000-0000-0000-0000-00000000f001' where id='00000000-0000-0000-0000-0000000006a6'; set constraints all immediate$$, 'changer election_id pour rejoindre un groupe de tour différent refusé', 'même tour');
select pg_temp.expect_ok($$update poll_snapshots set round=1, round_basis='declared' where id='00000000-0000-0000-0000-0000000006a1'; update poll_snapshots set pollster='Zed' where id='00000000-0000-0000-0000-0000000006a1'; set constraints all immediate$$, 'rejoindre un groupe du MÊME tour est accepté');

-- Suppression / dépublication d'un tour : jamais de tour suivant publié sans tour précédent publié et définitif (contrôle différé : on force le contrôle avec SET CONSTRAINTS)
create function pg_temp.mkseq(n int, r2 text) returns void language plpgsql as $f$
declare e uuid := ('00000000-0000-0000-0000-00000000f9' || lpad(n::text,2,'0'))::uuid;
        a uuid := ('00000000-0000-0000-0000-0000000d9' || lpad(n::text,2,'0') || '1')::uuid;
        b uuid := ('00000000-0000-0000-0000-0000000d9' || lpad(n::text,2,'0') || '2')::uuid;
begin
  insert into elections(id) values (e);
  insert into election_round_results(id,election_id,round_number,held_on,result_status,source_id,publication_status) values (a,e,1,'2027-04-10','final','00000000-0000-0000-0000-0000000000b1','published');
  insert into election_candidate_results(round_result_id,entity_kind,entity_label,votes,publication_status) values (a,'other','Liste S'||n,10,'published');
  if r2 is not null then
    insert into election_round_results(id,election_id,round_number,held_on,result_status,source_id,publication_status) values (b,e,2,'2027-04-24',r2,'00000000-0000-0000-0000-0000000000b1','published');
  end if;
end $f$;
select pg_temp.mkseq(1,'provisional'), pg_temp.mkseq(2,null), pg_temp.mkseq(3,'final'), pg_temp.mkseq(4,'final'), pg_temp.mkseq(5,'final'), pg_temp.mkseq(6,'final');
-- tour 2 en brouillon : c'est un tour non publié, il ne gêne pas la suppression du tour 1
insert into election_round_results(id,election_id,round_number,held_on,result_status,publication_status) values ('00000000-0000-0000-0000-0000000d9023','00000000-0000-0000-0000-00000000f902',2,'2027-04-24','provisional','draft');
select pg_temp.expect_fail($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9011'; set constraints all immediate$$, 'supprimer le tour 1 alors que le tour 2 reste publié (provisoire) : refusé', 'reste publié');
select pg_temp.expect_fail($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9031'; set constraints all immediate$$, 'supprimer le tour 1 alors que le tour 2 (définitif) reste publié : refusé', 'reste publié');
select pg_temp.expect_fail($$update election_round_results set publication_status='draft' where id='00000000-0000-0000-0000-0000000d9031'; set constraints all immediate$$, 'dépublier le tour 1 alors que le tour 2 reste publié : refusé', 'dépublier');
do $t$ begin
  insert into _r values ((select count(*) from election_round_results where election_id='00000000-0000-0000-0000-00000000f903')=2
                          and (select count(*) from election_candidate_results where entity_label='Liste S3')=1,
                         'après les refus : les deux tours et les scores du tour 1 sont intacts');
end $t$;
select pg_temp.expect_ok($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9012'; set constraints all immediate$$, 'supprimer le DERNIER tour publié : accepté');
select pg_temp.expect_ok($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9011'; set constraints all immediate$$, 'puis supprimer le tour 1 devenu seul (ses scores partent en cascade) : accepté');
select pg_temp.expect_ok($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9021'; set constraints all immediate$$, 'supprimer le tour 1 dont le tour 2 est seulement brouillon : accepté');
select pg_temp.expect_ok($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9042'; delete from election_round_results where id='00000000-0000-0000-0000-0000000d9041'; set constraints all immediate$$, 'tour 2 puis tour 1 dans la même transaction : accepté');
select pg_temp.expect_ok($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9051'; delete from election_round_results where id='00000000-0000-0000-0000-0000000d9052'; set constraints all immediate$$, 'tour 1 puis tour 2 dans la même transaction (ordre indifférent) : accepté');
select pg_temp.expect_ok($$delete from election_round_results where election_id='00000000-0000-0000-0000-00000000f906'; set constraints all immediate$$, 'suppression de tous les tours d''une élection en une instruction : accepté');
select pg_temp.expect_ok($$delete from election_round_results where id='00000000-0000-0000-0000-0000000d9023'; set constraints all immediate$$, 'supprimer un tour brouillon : accepté');

-- Droits : lecture publique seule, vue de revue non exposée
set role anon;
select pg_temp.expect_ok($$select count(*) from election_round_results$$, 'anon peut lire les tours (RLS)');
select pg_temp.expect_fail($$insert into election_round_results(election_id,round_number,held_on,result_status) values ('00000000-0000-0000-0000-00000000f002',5,'2027-01-01','final')$$, 'anon ne peut pas écrire', 'permission denied');
select pg_temp.expect_fail($$select * from poll_snapshots_round_review$$, 'anon ne peut pas lire la vue de revue', 'permission denied');
reset role;
-- RLS : un score dont le tour est dépublié n'est jamais visible
update election_round_results set publication_status='archived' where id='00000000-0000-0000-0000-0000000000d2';
set role anon;
select pg_temp.expect_ok($q$do $x$ begin if (select count(*) from election_candidate_results where round_result_id='00000000-0000-0000-0000-0000000000d2')<>0 then raise exception 'fuite'; end if; end $x$$q$, 'anon : aucun score d''un tour non publié');
reset role;

select case when ok then 'ok  ' else 'FAIL' end || ' ' || n as resultat from _r;
select count(*) filter (where not ok) as echecs, count(*) as controles from _r \gset
\echo :controles contrôles, :echecs échec(s)
