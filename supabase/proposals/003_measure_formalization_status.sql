-- PROPOSITION — NON EXÉCUTÉE — Statut de formalisation des mesures politiques (version 2, révisée d'après l'audit du schéma réel)
-- À relire, puis à exécuter uniquement par le propriétaire du projet, dans l'éditeur SQL de Supabase. Ni le site ni Claude ne l'exécutent.
--
-- Base de l'audit (lecture seule, fourni par le propriétaire) : public.measures (1 651 lignes dont 1 649 publiées) sans aucune colonne de statut ;
-- public.sources (id, title, source_type, publisher, url, publication_date, publication_status) ; public.measure_sources (plusieurs sources par mesure,
-- 3 411 associations) ; RLS actif sur les trois tables ; lecture seule pour anon / authenticated ; politiques limitées aux lignes publiées ;
-- aucune migration de statut dans supabase_migrations.schema_migrations (la 001 existante concerne case_outcomes).
--
-- Garanties : additive ; aucune ligne modifiée ; statut NULL sans valeur par défaut pour les 1 651 mesures ; aucune table créée ; aucun trigger ;
-- aucune politique RLS ni permission modifiée ; reliability_level et toutes les colonnes existantes intactes.

-- =====================================================================================================
-- 1. PRÉCONTRÔLES (lecture seule — à lancer d'abord, avant la partie 2)
-- =====================================================================================================
-- 1a. Types des clés : attendu uuid pour measures.id et sources.id.
select table_name, column_name, data_type from information_schema.columns
 where table_schema='public' and column_name='id' and table_name in ('measures','sources') order by 1;
-- 1b. Aucune colonne « formalization% » n'existe déjà : attendu 0 ligne (sinon la migration est déjà (partiellement) appliquée : s'arrêter).
select column_name from information_schema.columns where table_schema='public' and table_name='measures' and column_name like 'formalization%';
-- 1c. Droits de lecture publique : au niveau de la table, ET éventuels droits par colonne. Si la 2e requête renvoie des lignes, les droits sont
--     gérés colonne par colonne : les nouvelles colonnes ne seraient pas lisibles sans GRANT dédié (à décider alors avec le propriétaire).
select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='measures' and grantee in ('anon','authenticated');
select grantee, column_name, privilege_type from information_schema.column_privileges where table_schema='public' and table_name='measures' and grantee in ('anon','authenticated') order by 1,2;
-- 1d. Politiques RLS de measures (aucune n'est modifiée) : vérifier qu'aucune ne dépend d'une liste de colonnes.
select policyname, cmd, roles, qual from pg_policies where schemaname='public' and tablename='measures';
-- 1e. Vues dépendant de measures (une vue « select * » ne verrait pas les nouvelles colonnes ; une vue qui expose measures en entier les exposerait).
select distinct v.relname as vue_dependante from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class v on v.oid=r.ev_class
 where d.refobjid='public.measures'::regclass and v.relname <> 'measures';
-- 1f. Repères avant/après : 1 651 mesures attendues ; CHECK existants de measures.
select count(*) as mesures, count(*) filter (where publication_status='published') as publiees from public.measures;
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.measures'::regclass and contype='c';
-- 1g. Colonnes de measure_sources (le site lit cette table pour vérifier qu'une source justificative est bien associée à la mesure).
select column_name, data_type from information_schema.columns where table_schema='public' and table_name='measure_sources' order by ordinal_position;

-- =====================================================================================================
-- 2. MIGRATION (une seule transaction : tout ou rien)
-- =====================================================================================================
begin;

alter table public.measures
  add column formalization_status      text,    -- NULL = statut non établi : aucun badge affiché
  add column formalization_status_date date,    -- date de référence PROPRE au statut (document/événement), indépendante de sources.publication_date
  add column formalization_source_id   uuid references public.sources(id),  -- source justificative (doit être associée à la mesure : voir §4)
  add column formalization_note        text;    -- précision éditoriale facultative

-- Valeurs autorisées (NULL admis).
alter table public.measures add constraint measures_formalization_status_chk check (
  formalization_status is null or formalization_status in
  ('official_program','party_position','candidate_pledge','recent_announcement','press_reported'));

-- Un statut renseigné exige sa date de référence ET sa source justificative.
alter table public.measures add constraint measures_formalization_justified_chk check (
  formalization_status is null or (formalization_status_date is not null and formalization_source_id is not null));

-- Pas de date, de source ou de note sans statut (évite des données orphelines lorsqu'un statut est retiré).
alter table public.measures add constraint measures_formalization_orphan_chk check (
  formalization_status is not null or (formalization_status_date is null and formalization_source_id is null and formalization_note is null));

-- Index de la clé étrangère (suppression/contrôle d'une source) : table de ~1 650 lignes, coût négligeable.
create index measures_formalization_source_idx on public.measures (formalization_source_id) where formalization_source_id is not null;

comment on column public.measures.formalization_status      is 'Degré de formalisation : official_program | party_position | candidate_pledge | recent_announcement | press_reported. NULL = non établi. Jamais déduit de reliability_level (fiabilité documentaire, notion distincte).';
comment on column public.measures.formalization_status_date is 'Date de référence du statut (document ou événement qui le justifie). Ne dépend pas de sources.publication_date.';
comment on column public.measures.formalization_source_id   is 'Source justificative du statut ; doit figurer dans measure_sources pour cette mesure et être publiée pour que le site affiche le statut.';
comment on column public.measures.formalization_note        is 'Précision éditoriale facultative (ex. historique : annoncée le …, intégrée au programme publié le …).';

commit;
-- Recharge du cache de schéma de l'API (inoffensif ; Supabase le fait déjà après un DDL) :
notify pgrst, 'reload schema';

-- =====================================================================================================
-- 3. CONTRÔLES APRÈS EXÉCUTION (lecture seule)
-- =====================================================================================================
--   select count(*) mesures, count(formalization_status) avec_statut from public.measures;   -- 1651 ; 0
--   select column_name from information_schema.columns where table_schema='public' and table_name='measures' and column_name like 'formalization%' order by 1;   -- 4 lignes
--   select conname from pg_constraint where conrelid='public.measures'::regclass and conname like 'measures_formalization%' order by 1;                           -- 3 lignes
--   -- Lecture publique (à lancer avec le rôle anon, ex. via l'API REST) : ne doit pas renvoyer 42501 / 403 :
--   --   GET /rest/v1/measures?select=id,formalization_status&limit=1
--   -- Les politiques RLS et les permissions sont inchangées : les colonnes ajoutées suivent le modèle d'accès existant.

-- =====================================================================================================
-- 4. COHÉRENCE « LA SOURCE EST ASSOCIÉE À LA MESURE ET PUBLIÉE » (contrôle applicatif + requête d'audit, sans trigger)
-- =====================================================================================================
-- Le site n'affiche un statut que si sa source est publiée ET figure dans measure_sources pour cette mesure ; sinon aucun badge (et un
-- avertissement en console). Requête d'audit à lancer après chaque saisie de statuts (attendu : 0 ligne) :
--   select m.id, m.title, m.formalization_status
--     from public.measures m
--    where m.formalization_status is not null
--      and (not exists (select 1 from public.measure_sources ms where ms.measure_id = m.id and ms.source_id = m.formalization_source_id)
--           or not exists (select 1 from public.sources s where s.id = m.formalization_source_id and s.publication_status = 'published'));
-- (colonnes measure_sources.measure_id / source_id à confirmer par le contrôle 1g.)
--
-- Variante facultative, plus stricte : imposer l'association au niveau SQL par une clé étrangère composite.
-- Elle exige une contrainte d'unicité sur measure_sources(measure_id, source_id), donc la modification d'une table existante, et échouerait
-- s'il existe des doublons parmi les 3 411 associations. Non recommandée sans contrôle préalable :
--   select measure_id, source_id, count(*) from public.measure_sources group by 1,2 having count(*) > 1;     -- attendu : 0 ligne
--   alter table public.measure_sources add constraint measure_sources_measure_source_uq unique (measure_id, source_id);
--   alter table public.measures add constraint measures_formalization_source_linked_fk
--     foreign key (id, formalization_source_id) references public.measure_sources (measure_id, source_id);
-- Effet : une source ne pourrait plus être détachée d'une mesure tant qu'elle justifie son statut.

-- =====================================================================================================
-- 5. SAISIE / ÉVOLUTION D'UN STATUT (par l'éditeur ; exemple)
-- =====================================================================================================
--   update public.measures
--      set formalization_status='official_program', formalization_status_date='2027-01-15',
--          formalization_source_id='<uuid d''une source déjà associée à la mesure>',
--          formalization_note='Annoncée le 3 mars 2026 ; intégrée au programme publié le 15 janvier 2027.'
--    where id='<uuid de la mesure>';
-- Retirer un statut : mettre les quatre colonnes à NULL dans la même instruction.

-- =====================================================================================================
-- 6. RETOUR ARRIÈRE (supprime uniquement les quatre colonnes ajoutées ; aucune autre donnée n'est touchée)
-- =====================================================================================================
--   begin;
--   drop index if exists public.measures_formalization_source_idx;
--   alter table public.measures drop constraint measures_formalization_orphan_chk, drop constraint measures_formalization_justified_chk, drop constraint measures_formalization_status_chk;
--   alter table public.measures drop column formalization_note, drop column formalization_source_id, drop column formalization_status_date, drop column formalization_status;
--   commit;
