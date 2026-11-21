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
