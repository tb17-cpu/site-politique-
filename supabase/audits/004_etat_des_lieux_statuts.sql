-- ÉTAT DES LIEUX (LECTURE SEULE) — candidats aux statuts de formalisation des mesures
-- Aucune écriture, aucun remplissage : ce fichier ne contient que des SELECT, à lancer par le propriétaire dans l'éditeur SQL.
-- Il PROPOSE, il ne décide pas : toute valeur de statut reste soumise à validation éditoriale avant un UPDATE manuel (cf. §5 de la migration 003 v3).

-- A. Répartition des mesures par type de source associée (relation historique measure_sources_measure_id_fkey)
select s.source_type, s.publication_status, count(*) as associations, count(distinct ms.measure_id) as mesures
  from public.measure_sources ms join public.sources s on s.id = ms.source_id
 group by 1,2 order by 3 desc;

-- B. Une ligne par (mesure, source) avec statut PROPOSÉ et niveau de vérifiabilité
--    - 'direct'     : source publiée, de type programme officiel, avec date de publication : le statut official_program et sa date sont lisibles tels quels.
--    - 'editorial'  : tout le reste (type ambigu, source sans date, source non publiée, article de presse, document officiel autre qu'un programme…) : décision humaine requise.
--    La proposition de statut n'est qu'un point de départ ; elle n'est jamais déduite de reliability_level.
select m.id as measure_id, m.title, ms.id as measure_source_id, ms.page_reference,
       s.id as source_id, s.title as source_title, s.source_type, s.publisher, s.publication_date, s.publication_status as source_status,
       case s.source_type
         when 'official_program'  then 'official_program'
         when 'press_article'     then 'press_reported'
         when 'official_document' then null        -- à qualifier : programme, position de parti, engagement ?
         else null end as statut_propose,
       case when s.source_type = 'official_program' and s.publication_status = 'published' and s.publication_date is not null then 'direct'
            else 'editorial' end as verifiabilite,
       (select count(*) from public.measure_sources x where x.measure_id = m.id) as nb_sources_de_la_mesure
  from public.measures m
  join public.measure_sources ms on ms.measure_id = m.id
  join public.sources s on s.id = ms.source_id
 where m.formalization_status is null and m.publication_status = 'published'
 order by verifiabilite, s.source_type, m.title;

-- C. Mesures dont UNE SEULE source candidate de type programme officiel publiée et datée existe (cas le moins ambigu)
select m.id as measure_id, m.title, min(ms.id::text) as measure_source_id_propose, min(s.publication_date) as date_proposee
  from public.measures m
  join public.measure_sources ms on ms.measure_id = m.id
  join public.sources s on s.id = ms.source_id and s.source_type = 'official_program' and s.publication_status = 'published' and s.publication_date is not null
 where m.formalization_status is null and m.publication_status = 'published'
 group by m.id, m.title having count(*) = 1;

-- D. Mesures sans aucune source exploitable (aucun statut possible tant qu'aucune ligne justificative n'existe)
select m.id, m.title from public.measures m
 where m.publication_status = 'published'
   and not exists (select 1 from public.measure_sources ms join public.sources s on s.id = ms.source_id where ms.measure_id = m.id and s.publication_status = 'published');

-- E. Décompte global
select count(*) as mesures_publiees,
       count(*) filter (where formalization_status is not null) as avec_statut,
       count(*) filter (where exists (select 1 from public.measure_sources ms join public.sources s on s.id=ms.source_id where ms.measure_id=m.id and s.source_type='official_program' and s.publication_status='published' and s.publication_date is not null)) as avec_programme_officiel_date
  from public.measures m where publication_status = 'published';
