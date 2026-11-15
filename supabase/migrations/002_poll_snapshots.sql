-- Migration 002 — photographies de sondages (nouvelle table, aucune table existante touchée)
-- PRÉREQUIS : vérifier que elections.id, sources.id, candidacies.id, parties.id, people.id sont bien de type uuid :
--   select table_name, data_type from information_schema.columns where table_schema='public' and column_name='id'
--     and table_name in ('elections','sources','candidacies','parties','people');
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
  entity_label text,                           -- libellé libre (ex. « Futuro Nazionale ») sans candidature ni parti enregistré
  value_percent numeric(5,2) not null check (value_percent >= 0 and value_percent <= 100),
  scenario text,                               -- périmètre et configuration testée (ex. « 1er tour, hors Retailleau »)
  methodology text,
  aggregation_note text,                       -- pour une moyenne : sondages inclus, pondération, exclusions (ex. hors CIS)
  sample_size integer check (sample_size is null or sample_size > 0),
  notes text,
  publication_status text not null default 'draft',
  reliability_level text,
  reliability_notes text,
  created_at timestamptz not null default now(),
  constraint poll_record_kind_chk check (record_kind in ('poll','average')),
  constraint poll_entity_kind_chk check (entity_kind in ('party','candidacy','person','other')),
  -- cohérence : la référence correspond au type déclaré ; « other » exige un libellé
  constraint poll_entity_ref_chk check (
    (entity_kind = 'candidacy' and candidacy_id is not null) or
    (entity_kind = 'party'     and party_id     is not null) or
    (entity_kind = 'person'    and person_id    is not null) or
    (entity_kind = 'other'     and entity_label is not null)),
  -- une moyenne documente sa méthode
  constraint poll_average_note_chk check (record_kind <> 'average' or aggregation_note is not null)
);
create index poll_snapshots_election_idx on public.poll_snapshots (election_id, snapshot_date desc);
comment on table public.poll_snapshots is 'Photographies de sondages datées. Un sondage n''est ni une candidature ni un résultat. Le rang n''est pas stocké : il est calculé à l''affichage.';

alter table public.poll_snapshots enable row level security;
create policy poll_snapshots_public_read on public.poll_snapshots for select to anon, authenticated using (publication_status = 'published');
grant select on public.poll_snapshots to anon, authenticated;   -- lecture seule : aucun droit d'écriture pour anon
commit;
-- Retour arrière : drop table public.poll_snapshots;
