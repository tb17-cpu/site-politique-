-- À exécuter AVANT 001/002 — LECTURE SEULE (aucune modification).

-- 1. Contraintes CHECK portant sur publication_status / reliability_level, sur toutes les tables du schéma public
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'c' and connamespace = 'public'::regnamespace
  and pg_get_constraintdef(oid) ~ '(publication_status|reliability_level)'
order by 1, 2;

-- 2. Valeurs réellement présentes, pour TOUTES les tables du schéma public qui portent ces colonnes (value NULL = non renseigné)
select table_name, column_name, (xpath('/row/v/text()', r))[1]::text as value, (xpath('/row/n/text()', r))[1]::text::bigint as n
from (
  select c.table_name, c.column_name,
         unnest(xpath('/table/row', query_to_xml(format('select %I::text as v, count(*) as n from public.%I group by 1', c.column_name, c.table_name), false, false, ''))) as r
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public' and c.column_name in ('publication_status', 'reliability_level')
) x
order by 1, 2, 3;

-- 3. Types des clés et colonnes utilisées par la migration 002
select table_name, column_name, data_type from information_schema.columns
where table_schema = 'public'
  and ((column_name = 'id' and table_name in ('elections','sources','candidacies','parties','people'))
    or (table_name = 'candidacies' and column_name in ('election_id','publication_status'))
    or (table_name in ('elections','sources','parties','people') and column_name = 'publication_status'))
order by 1, 2;

-- 4. Absence éventuelle de la table ou des colonnes de migration (doit être vide avant exécution)
select 'poll_snapshots existe déjà' as alerte from information_schema.tables where table_schema='public' and table_name='poll_snapshots'
union all select 'colonne déjà présente : ' || column_name from information_schema.columns
 where table_schema='public' and table_name='case_outcomes' and column_name in ('baseline_value_status','observed_value_status','fiscal_cost_status','fiscal_revenue_status');
