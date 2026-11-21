-- PROPOSITION — NON EXÉCUTÉE — Résultats officiels des élections, tour par tour (version 2 : cohérence garantie par la base).
-- À relire puis à exécuter uniquement par le propriétaire du projet. Ni le site ni Claude ne l'exécutent. Nouvelles tables seulement :
-- aucune table, ligne, politique ou permission existante n'est modifiée. Tant qu'elle n'est pas appliquée, le site n'affiche aucune rubrique
-- « Résultats » (DB.results traite l'absence de table comme « aucun résultat », sans erreur).
-- Prérequis (schéma réel, vérifié pour la migration 002) : candidacies.second_round_status et second_round_qualified_at existent (vue de rapprochement) ; elections.id, sources.id, candidacies.id, parties.id, people.id sont de type uuid ;
-- candidacies.election_id existe.
--
-- Modèle : une ligne par tour (election_round_results : participation, date, provisoire/définitif) et une ligne par candidat, liste ou parti
-- et par tour (election_candidate_results). Les cartes de statut des candidats et la rubrique de l'accueil lisent ces mêmes lignes.
--
-- Garanties :
--  1. Publication : un score ne peut être publié que si son tour l'est ; un tour ne peut pas être dépublié tant qu'il a des scores publiés ;
--     un tour n'est publié que s'il est sourcé, et (tour > 1) que si le tour précédent est publié ET définitif. La lecture publique (RLS)
--     exige en plus que le tour parent soit publié : aucun score orphelin n'est jamais visible.
--  2. Entités : exactement une référence cohérente avec entity_kind (comme poll_snapshots) ; une candidature doit appartenir à l'élection du tour.
--  3. Doublons : une seule ligne par (tour, candidature), (tour, parti), (tour, personne) et (tour, libellé libre normalisé) ; un seul résultat par (élection, n° de tour).
--  4. Chiffres : votants ≤ inscrits ; blancs + nuls ≤ votants ; identités abstentions = inscrits − votants et exprimés = votants − blancs − nuls
--     lorsque toutes les valeurs sont renseignées ; somme des pourcentages ≤ 100,5 % et somme des voix ≤ suffrages exprimés (contrôle différé :
--     fin de transaction, aussi déclenché par toute modification de expressed_votes du tour) ; élu et qualifié pour le tour suivant s'excluent, ligne par ligne ET à l'échelle du tour (contrainte différée
--     inter-lignes : aucun élu avec des qualifiés dans un même tour ; aucune limite sur le nombre d'élus).
--  4bis. Séquence : un tour publié et définitif ne peut être supprimé ni dépublié tant que le tour suivant reste publié (contrôle différé, y compris
--     en concurrence avec la publication du tour suivant).
--  5. Provisoire puis définitif : le passage définitif → provisoire est interdit ; l'élection et le n° de tour d'un résultat sont immuables ;
--     le tour parent d'un score est immuable.
begin;

create table public.election_round_results (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id),
  round_number smallint not null,
  held_on date not null,
  result_status text not null,
  registered_voters bigint,
  voters bigint,
  abstentions bigint,
  blank_votes bigint,
  null_votes bigint,
  expressed_votes bigint,
  source_id uuid references public.sources(id),
  notes text,
  publication_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint err_unique_round unique (election_id, round_number),
  constraint err_round_number_chk check (round_number between 1 and 9),
  constraint err_result_status_chk check (result_status in ('provisional','final')),
  constraint err_publication_status_chk check (publication_status in ('draft','published','archived')),
  constraint err_counts_chk check (coalesce(registered_voters,0) >= 0 and coalesce(voters,0) >= 0 and coalesce(abstentions,0) >= 0
                                   and coalesce(blank_votes,0) >= 0 and coalesce(null_votes,0) >= 0 and coalesce(expressed_votes,0) >= 0),
  constraint err_voters_le_registered_chk check (voters is null or registered_voters is null or voters <= registered_voters),
  constraint err_blank_null_le_voters_chk check (voters is null or blank_votes is null or null_votes is null or blank_votes + null_votes <= voters),
  constraint err_abstentions_identity_chk check (registered_voters is null or voters is null or abstentions is null or abstentions = registered_voters - voters),
  constraint err_expressed_identity_chk check (voters is null or blank_votes is null or null_votes is null or expressed_votes is null
                                               or expressed_votes = voters - blank_votes - null_votes),
  constraint err_published_needs_source_chk check (publication_status <> 'published' or source_id is not null)
);
comment on table public.election_round_results is 'Résultats officiels d''un tour de scrutin (votes réellement exprimés). Distinct des sondages (poll_snapshots).';

create table public.election_candidate_results (
  id uuid primary key default gen_random_uuid(),
  round_result_id uuid not null references public.election_round_results(id) on delete cascade,
  entity_kind text not null,
  candidacy_id uuid references public.candidacies(id),
  party_id uuid references public.parties(id),
  person_id uuid references public.people(id),
  entity_label text,
  votes bigint,
  percent_expressed numeric(5,2),
  qualified_next_round boolean not null default false,
  elected boolean not null default false,
  publication_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecr_entity_kind_chk check (entity_kind in ('candidacy','party','person','other')),
  constraint ecr_entity_ref_chk check (
    (entity_kind = 'candidacy' and candidacy_id is not null and party_id is null     and person_id is null     and entity_label is null) or
    (entity_kind = 'party'     and party_id     is not null and candidacy_id is null and person_id is null     and entity_label is null) or
    (entity_kind = 'person'    and person_id    is not null and candidacy_id is null and party_id is null      and entity_label is null) or
    (entity_kind = 'other'     and entity_label is not null and btrim(entity_label) <> '' and candidacy_id is null and party_id is null and person_id is null)),
  constraint ecr_votes_chk check (votes is null or votes >= 0),
  constraint ecr_percent_chk check (percent_expressed is null or (percent_expressed >= 0 and percent_expressed <= 100)),
  constraint ecr_score_present_chk check (votes is not null or percent_expressed is not null),
  constraint ecr_elected_xor_qualified_chk check (not (elected and qualified_next_round)),
  constraint ecr_publication_status_chk check (publication_status in ('draft','published','archived'))
);
comment on table public.election_candidate_results is 'Score d''un candidat, d''une liste ou d''un parti pour un tour. Un score publié exige un tour publié.';

-- Doublons
create unique index ecr_unique_candidacy on public.election_candidate_results (round_result_id, candidacy_id) where candidacy_id is not null;
create unique index ecr_unique_party     on public.election_candidate_results (round_result_id, party_id)     where party_id is not null;
create unique index ecr_unique_person    on public.election_candidate_results (round_result_id, person_id)    where person_id is not null;
create unique index ecr_unique_label     on public.election_candidate_results (round_result_id, lower(btrim(entity_label))) where entity_label is not null;
create index ecr_round_idx on public.election_candidate_results (round_result_id);
create index err_election_idx on public.election_round_results (election_id, round_number);

-- updated_at
create function public.election_results_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger err_touch before update on public.election_round_results for each row execute function public.election_results_touch();
create trigger ecr_touch before update on public.election_candidate_results for each row execute function public.election_results_touch();

-- Garde des tours : immuabilité, provisoire/définitif, ordre et cohérence de publication
create function public.election_round_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.election_id <> old.election_id or new.round_number <> old.round_number then
      raise exception 'election_id et round_number d''un résultat sont immuables (créer un nouveau tour plutôt)';
    end if;
    if old.result_status = 'final' and new.result_status = 'provisional' then
      raise exception 'un résultat définitif ne peut pas redevenir provisoire';
    end if;
    if old.publication_status = 'published' and new.publication_status <> 'published' then
      if exists (select 1 from public.election_candidate_results s where s.round_result_id = old.id and s.publication_status = 'published') then
        raise exception 'dépublier d''abord les scores publiés de ce tour';
      end if;
      if exists (select 1 from public.election_round_results r where r.election_id = old.election_id and r.round_number > old.round_number and r.publication_status = 'published') then
        raise exception 'dépublier d''abord les tours suivants';
      end if;
    end if;
  end if;
  if new.publication_status = 'published' and new.round_number > 1 then
    -- FOR SHARE : le tour précédent est verrouillé jusqu'à la fin de la transaction ; une suppression ou une dépublication concurrente de ce tour
    -- attend, puis le contrôle différé election_round_sequence_verify() voit le tour suivant validé (voir plus bas).
    perform 1 from public.election_round_results p where p.election_id = new.election_id and p.round_number = new.round_number - 1
                      and p.publication_status = 'published' and p.result_status = 'final' for share;
    if not found then
      raise exception 'le tour % ne peut être publié que si le tour précédent est publié et définitif', new.round_number;
    end if;
  end if;
  return new;
end $$;
create trigger err_guard before insert or update on public.election_round_results for each row execute function public.election_round_guard();

-- Séquence des tours : on ne peut ni supprimer, ni dépublier, ni repasser en provisoire un tour publié tant que le tour SUIVANT reste publié.
-- Contrôle DIFFÉRÉ (fin de transaction) : l'ordre des opérations dans une transaction est indifférent (supprimer le tour 2 puis le tour 1 est accepté),
-- et la suppression d'une élection entière (cascade) ou d'un tour sans suite publiée n'est jamais gênée. Une opération sur un tour non publié ne
-- crée aucune incohérence et n'est pas contrôlée. Les scores d'un tour supprimé le sont par cascade (leurs propres gardes s'appliquent).
create function public.election_round_sequence_verify(eid uuid, n smallint) returns void language plpgsql as $$
begin
  if exists (select 1 from public.election_round_results s where s.election_id = eid and s.round_number = n + 1 and s.publication_status = 'published')
     and not exists (select 1 from public.election_round_results p where p.election_id = eid and p.round_number = n
                       and p.publication_status = 'published' and p.result_status = 'final') then
    raise exception 'le tour % reste publié alors que le tour % n''est plus publié et définitif : supprimer ou dépublier d''abord le tour %', n + 1, n, n + 1;
  end if;
end $$;
create function public.election_round_sequence_check() returns trigger language plpgsql as $$
begin perform public.election_round_sequence_verify(old.election_id, old.round_number); return null; end $$;
create constraint trigger err_sequence_del after delete on public.election_round_results
  deferrable initially deferred for each row when (old.publication_status = 'published') execute function public.election_round_sequence_check();
create constraint trigger err_sequence_upd after update of publication_status, result_status on public.election_round_results
  deferrable initially deferred for each row when (old.publication_status = 'published' and old.result_status = 'final'
                                                    and (new.publication_status <> 'published' or new.result_status <> 'final'))
  execute function public.election_round_sequence_check();

-- Garde des scores : tour parent publié, candidature de la bonne élection, tour parent immuable
create function public.election_candidate_guard() returns trigger language plpgsql as $$
declare r public.election_round_results%rowtype;
begin
  -- Verrou du tour parent dès la première écriture (BEFORE, avant la vérification de clé étrangère : pas d'interblocage KEY SHARE / UPDATE).
  select * into r from public.election_round_results where id = new.round_result_id for update;
  if tg_op = 'UPDATE' and new.round_result_id <> old.round_result_id then
    raise exception 'le tour d''un score est immuable';
  end if;
  if new.publication_status = 'published' and r.publication_status <> 'published' then
    raise exception 'un score ne peut être publié que si son tour est publié';
  end if;
  if new.candidacy_id is not null and not exists (select 1 from public.candidacies c where c.id = new.candidacy_id and c.election_id = r.election_id) then
    raise exception 'la candidature % n''appartient pas à l''élection de ce tour', new.candidacy_id;
  end if;
  return new;
end $$;
create trigger ecr_guard before insert or update on public.election_candidate_results for each row execute function public.election_candidate_guard();

-- Totaux d'un tour (contrôles différés : tolérants à l'insertion ligne par ligne dans une même transaction).
-- Déclenchés par un changement des scores (table enfant) ET par une modification de expressed_votes sur le tour (table parente) :
-- on ne peut pas réduire les suffrages exprimés sous la somme des voix déjà enregistrées.
create function public.election_round_totals_verify(rid uuid) returns void language plpgsql as $$
declare sp numeric; sv numeric; ev bigint;
begin
  perform 1 from public.election_round_results where id = rid for update;   -- sérialise les écritures concurrentes sur ce tour (voir election_candidate_guard)
  select coalesce(sum(percent_expressed),0), coalesce(sum(votes),0) into sp, sv from public.election_candidate_results where round_result_id = rid;
  select expressed_votes into ev from public.election_round_results where id = rid;
  if sp > 100.5 then raise exception 'la somme des pourcentages du tour dépasse 100,5 %% (%)', sp; end if;
  if ev is not null and sv > ev then raise exception 'la somme des voix (%) dépasse les suffrages exprimés (%)', sv, ev; end if;
end $$;
create function public.election_round_totals_check() returns trigger language plpgsql as $$
begin perform public.election_round_totals_verify(coalesce(new.round_result_id, old.round_result_id)); return null; end $$;
create function public.election_round_totals_parent_check() returns trigger language plpgsql as $$
begin perform public.election_round_totals_verify(new.id); return null; end $$;
create constraint trigger ecr_totals after insert or update or delete on public.election_candidate_results
  deferrable initially deferred for each row execute function public.election_round_totals_check();
create constraint trigger err_totals after update of expressed_votes on public.election_round_results
  deferrable initially deferred for each row execute function public.election_round_totals_parent_check();

-- Cohérence ENTRE lignes d'un même tour : un tour ne peut pas comporter à la fois un candidat élu et un ou plusieurs candidats qualifiés pour le
-- tour suivant (toutes lignes du tour, publiées ou non). Aucune limite sur le NOMBRE d'élus ni de qualifiés (scrutins à plusieurs élus).
-- Contrainte différée : l'ordre d'insertion dans une même transaction est libre ; le contrôle a lieu à la fin de la transaction.
create function public.election_round_outcomes_verify(rid uuid) returns void language plpgsql as $$
begin
  -- Concurrence : deux transactions qui écrivent dans le même tour (l'une un élu, l'autre un qualifié) ne se voient pas avant leur validation.
  -- Le verrou FOR UPDATE du tour parent (pris dès la première écriture par election_candidate_guard, conservé jusqu'à la fin de la
  -- transaction) les SÉRIALISE : la seconde attend la première, puis ce contrôle différé lit les lignes validées par la première (READ COMMITTED,
  -- niveau par défaut de Supabase : chaque requête voit les validations antérieures). Reverrouillage ici par sécurité (sans attente si déjà détenu).
  perform 1 from public.election_round_results where id = rid for update;
  if exists (select 1 from public.election_candidate_results where round_result_id = rid and elected)
     and exists (select 1 from public.election_candidate_results where round_result_id = rid and qualified_next_round) then
    raise exception 'incohérence : le tour % comporte à la fois un élu et des candidats qualifiés pour le tour suivant', rid;
  end if;
end $$;
create function public.election_round_outcomes_check() returns trigger language plpgsql as $$
begin perform public.election_round_outcomes_verify(new.round_result_id); return null; end $$;
create constraint trigger ecr_outcomes after insert or update of elected, qualified_next_round, round_result_id on public.election_candidate_results
  deferrable initially deferred for each row execute function public.election_round_outcomes_check();


-- Vues de CONTRÔLE éditorial (propriétaire uniquement, jamais exposées à l'API publique ; security_invoker).
-- a) Même candidat : issue terminale (élu, ou éliminé/battu sur résultat définitif) à un tour PUIS présent dans un tour ultérieur. Ce n'est pas
--    interdit en base (aucune règle universelle : scrutins à plusieurs élus, dépouillements particuliers) ; le site neutralise l'affichage
--    (aucun statut d'issue pour ce candidat) et cette vue permet de retrouver et corriger la donnée.
create view public.election_result_path_conflicts with (security_invoker = true) as
  with e as (
    select r.id as round_id, r.election_id, r.round_number, r.result_status, s.id as score_id, s.entity_kind,
           coalesce(s.candidacy_id::text, s.party_id::text, s.person_id::text, lower(btrim(s.entity_label))) as entity_key,
           s.elected, s.qualified_next_round,
           (select bool_or(x.elected) from public.election_candidate_results x where x.round_result_id = r.id) as round_has_elected,
           (select bool_or(x.qualified_next_round) from public.election_candidate_results x where x.round_result_id = r.id) as round_has_qualified
      from public.election_round_results r join public.election_candidate_results s on s.round_result_id = r.id)
  select a.election_id, a.entity_kind, a.entity_key, a.round_number as terminal_round,
         case when a.elected then 'élu' else 'éliminé ou battu' end as terminal_outcome, b.round_number as later_round
    from e a join e b on b.election_id = a.election_id and b.entity_kind = a.entity_kind and b.entity_key = a.entity_key and b.round_number > a.round_number
   where a.elected or (a.result_status = 'final' and not a.qualified_next_round and (a.round_has_elected or a.round_has_qualified));
revoke all on public.election_result_path_conflicts from anon, authenticated, public;

-- b) Anciennes colonnes candidacies.second_round_status / second_round_qualified_at : informations DÉCLARATIVES (aucune source, aucune provenance,
--    aucun lien avec les résultats). Le site ne les traite pas comme une preuve. Cette vue les rapproche des résultats enregistrés pour
--    permettre la vérification éditoriale : « confirmé » (le résultat du tour 1 qualifie bien le candidat), « déclaré sans résultat
--    confirmant » (à vérifier ou à saisir dans les résultats), « résultat sans déclaration ». Aucune donnée n'est modifiée ni supprimée.
create view public.candidacy_second_round_reconciliation with (security_invoker = true) as
  select c.id as candidacy_id, c.election_id, c.second_round_status::text as declared_status, c.second_round_qualified_at::text as declared_at,
         q.qualified as result_qualified,
         case when (lower(coalesce(c.second_round_status::text,'')) = 'qualified' or c.second_round_qualified_at is not null) and coalesce(q.qualified,false) then 'confirmé par les résultats'
              when (lower(coalesce(c.second_round_status::text,'')) = 'qualified' or c.second_round_qualified_at is not null) then 'déclaré sans résultat confirmant'
              when coalesce(q.qualified,false) then 'résultat sans déclaration'
              else null end as verdict
    from public.candidacies c
    left join lateral (select bool_or(s.qualified_next_round) as qualified
                         from public.election_round_results r join public.election_candidate_results s on s.round_result_id = r.id
                        where r.election_id = c.election_id and s.candidacy_id = c.id and r.publication_status = 'published') q on true
   where lower(coalesce(c.second_round_status::text,'')) = 'qualified' or c.second_round_qualified_at is not null or coalesce(q.qualified,false);
revoke all on public.candidacy_second_round_reconciliation from anon, authenticated, public;

alter table public.election_round_results enable row level security;
alter table public.election_candidate_results enable row level security;

-- Lecture publique : la ligne ET tout ce qu'elle référence doivent être publiés ; un score exige son tour publié.
create policy election_round_results_public_read on public.election_round_results
  for select to anon, authenticated
  using (publication_status = 'published'
    and exists (select 1 from public.elections e where e.id = election_round_results.election_id and e.publication_status = 'published')
    and (source_id is null or exists (select 1 from public.sources s where s.id = election_round_results.source_id and s.publication_status = 'published')));

create policy election_candidate_results_public_read on public.election_candidate_results
  for select to anon, authenticated
  using (publication_status = 'published'
    and exists (select 1 from public.election_round_results r
                 join public.elections e on e.id = r.election_id
                where r.id = election_candidate_results.round_result_id and r.publication_status = 'published' and e.publication_status = 'published')
    and case election_candidate_results.entity_kind
          when 'candidacy' then exists (select 1 from public.candidacies c join public.election_round_results r on r.id = election_candidate_results.round_result_id
                                         where c.id = election_candidate_results.candidacy_id and c.publication_status = 'published' and c.election_id = r.election_id)
          when 'party'     then exists (select 1 from public.parties p where p.id = election_candidate_results.party_id and p.publication_status = 'published')
          when 'person'    then exists (select 1 from public.people pe where pe.id = election_candidate_results.person_id and pe.publication_status = 'published')
          when 'other'     then true
          else false end);

revoke insert, update, delete, truncate, references, trigger on public.election_round_results, public.election_candidate_results from anon, authenticated;
revoke all on public.election_round_results, public.election_candidate_results from anon, authenticated, public;
grant select on public.election_round_results, public.election_candidate_results to anon, authenticated;
commit;
-- Retour arrière (ordre à respecter : vues, tables, fonctions) : drop view public.candidacy_second_round_reconciliation, public.election_result_path_conflicts;
--                  drop table public.election_candidate_results, public.election_round_results;
--                  drop function public.election_round_sequence_check(), public.election_round_sequence_verify(uuid, smallint), public.election_candidate_guard(), public.election_round_guard(), public.election_round_totals_check(), public.election_round_totals_parent_check(), public.election_round_totals_verify(uuid), public.election_round_outcomes_check(), public.election_round_outcomes_verify(uuid), public.election_results_touch();
