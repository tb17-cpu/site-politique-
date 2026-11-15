-- À exécuter AVANT 001/002 (lecture seule) : confirme les valeurs autorisées réelles et les prérequis.
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint where contype = 'c' and conrelid::regclass::text in
  ('elections','sources','candidacies','parties','people','case_outcomes') and pg_get_constraintdef(oid) ~ '(publication_status|reliability_level)';
select distinct publication_status from elections union select distinct publication_status from sources;
select distinct reliability_level from case_outcomes;
select table_name, column_name, data_type from information_schema.columns
 where table_schema='public' and ((column_name='id' and table_name in ('elections','sources','candidacies','parties','people')) or (table_name='candidacies' and column_name in ('election_id','publication_status')));
