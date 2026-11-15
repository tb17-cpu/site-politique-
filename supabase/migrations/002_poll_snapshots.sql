-- Migration 002 — photographies de sondages (nouvelle table ; aucune table ni donnée existante modifiée)
-- Prérequis vérifiés sur le schéma réel : elections.id, sources.id, candidacies.id, parties.id, people.id sont de type uuid.
begin;
create table public.poll_snapshots (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id),
  snapshot_date date not null,                 -- date de la « photographie » éditoriale (ex. 2026-11-15)
  record_kind text not null default 'poll',    -- sondage individuel ou moyenne : jamais mélangés
  poll_date date,                              -- date (ou fin de terrain) du sondage / date de la moyenne
  fieldwork_start date,
  pollster text,                               -- institut (Ifop, CIS…) ou agrégateur
  source_id uuid references public.sources(id),
  entity_kind text not null,                   -- ce que désigne la ligne
  candidacy_id uuid references public.candidacies(id),
  party_id uuid references public.parties(id),
  person_id uuid references public.people(id),
  entity_label text,                           -- libellé libre (ex. « Futuro Nazionale ») : uniquement pour entity_kind = 'other'
  value_percent numeric(5,2) not null,
  scenario text,                               -- périmètre et configuration testée
  methodology text,
  aggregation_note text,                       -- moyenne : sondages inclus, pondération, exclusions (ex. hors CIS)
  sample_size integer,
  notes text,
  publication_status text not null default 'draft',
  reliability_level text,
  reliability_notes text,
  created_at timestamptz not null default now(),

  constraint poll_value_percent_chk check (value_percent >= 0 and value_percent <= 100),
  constraint poll_sample_size_chk   check (sample_size is null or sample_size > 0),
  constraint poll_record_kind_chk   check (record_kind in ('poll','average')),
  constraint poll_entity_kind_chk   check (entity_kind in ('party','candidacy','person','other')),
  -- Valeurs autorisées alignées sur le reste de la base (cf. contrôle ci-dessous avant exécution)
  constraint poll_publication_status_chk check (publication_status in ('draft','published','archived')),
  constraint poll_reliability_level_chk  check (reliability_level is null or reliability_level in ('high','medium','low','unverified')),
  -- Une et une seule référence, qui correspond exactement à entity_kind ; « other » : libellé seul, aucune référence.
  constraint poll_entity_ref_chk check (
    (entity_kind = 'candidacy' and candidacy_id is not null and party_id is null     and person_id is null     and entity_label is null) or
    (entity_kind = 'party'     and party_id     is not null and candidacy_id is null and person_id is null     and entity_label is null) or
    (entity_kind = 'person'    and person_id    is not null and candidacy_id is null and party_id is null      and entity_label is null) or
    (entity_kind = 'other'     and entity_label is not null and candidacy_id is null and party_id is null and person_id is null)),
  constraint poll_average_note_chk check (record_kind <> 'average' or aggregation_note is not null)
);
create index poll_snapshots_election_idx on public.poll_snapshots (election_id, snapshot_date desc);
comment on table public.poll_snapshots is 'Photographies de sondages datées. Un sondage n''est ni une candidature ni un résultat. Le rang n''est pas stocké : il est calculé à l''affichage.';

alter table public.poll_snapshots enable row level security;

-- Lecture publique : la ligne ET tout ce qu'elle référence doivent être publiés (aucune fuite indirecte via l'API REST).
-- La candidature référencée doit en outre appartenir à la même élection que la ligne.
create policy poll_snapshots_public_read on public.poll_snapshots
  for select to anon, authenticated
  using (
    publication_status = 'published'
    and exists (select 1 from public.elections e where e.id = poll_snapshots.election_id and e.publication_status = 'published')
    and (poll_snapshots.source_id is null
         or exists (select 1 from public.sources s where s.id = poll_snapshots.source_id and s.publication_status = 'published'))
    and case poll_snapshots.entity_kind
          when 'candidacy' then exists (select 1 from public.candidacies c
                                         where c.id = poll_snapshots.candidacy_id and c.publication_status = 'published'
                                           and c.election_id = poll_snapshots.election_id)
          when 'party'     then exists (select 1 from public.parties p
                                         where p.id = poll_snapshots.party_id and p.publication_status = 'published')
          when 'person'    then exists (select 1 from public.people pe
                                         where pe.id = poll_snapshots.person_id and pe.publication_status = 'published')
          when 'other'     then true
          else false
        end
  );

grant select on public.poll_snapshots to anon, authenticated;   -- lecture seule ; aucun droit d'écriture pour anon/authenticated
commit;
-- Retour arrière : drop table public.poll_snapshots;
