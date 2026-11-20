-- PROPOSITION (non exécutée) : résultats officiels des élections, tour par tour.
-- À relire puis appliquer manuellement. Tant qu'elle n'est pas appliquée, le site n'affiche aucune rubrique « Résultats »
-- (DB.results traite l'absence de table comme « aucun résultat », sans erreur).
-- Principe : une ligne par tour (participation, caractère provisoire/définitif, date) et une ligne par candidat ou liste et par tour.
-- Les cartes de statut des candidats et la rubrique de l'accueil lisent ces mêmes lignes : aucune duplication.

create table if not exists public.election_round_results (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  round_number integer not null check (round_number >= 1),
  held_on date not null,
  result_status text not null check (result_status in ('provisional','final')),
  registered_voters bigint check (registered_voters >= 0),
  voters bigint check (voters >= 0),
  abstentions bigint check (abstentions >= 0),
  blank_votes bigint check (blank_votes >= 0),
  null_votes bigint check (null_votes >= 0),
  expressed_votes bigint check (expressed_votes >= 0),
  source_id uuid references public.sources(id),
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, round_number)
);

create table if not exists public.election_candidate_results (
  id uuid primary key default gen_random_uuid(),
  round_result_id uuid not null references public.election_round_results(id) on delete cascade,
  entity_kind text not null check (entity_kind in ('candidacy','party','person','other')),
  candidacy_id uuid references public.candidacies(id),
  party_id uuid references public.parties(id),
  person_id uuid references public.people(id),
  entity_label text,
  votes bigint check (votes >= 0),
  percent_expressed numeric(5,2) check (percent_expressed >= 0 and percent_expressed <= 100),
  qualified_next_round boolean not null default false,
  elected boolean not null default false,
  publication_status text not null default 'draft' check (publication_status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ecr_round_idx on public.election_candidate_results(round_result_id);
create index if not exists ecr_candidacy_idx on public.election_candidate_results(candidacy_id);

alter table public.election_round_results enable row level security;
alter table public.election_candidate_results enable row level security;
create policy "lecture publique des résultats publiés" on public.election_round_results for select using (publication_status = 'published');
create policy "lecture publique des scores publiés" on public.election_candidate_results for select using (publication_status = 'published');
