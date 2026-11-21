do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create table elections(id uuid primary key default gen_random_uuid(), publication_status text default 'published');
create table sources(id uuid primary key default gen_random_uuid(), publication_status text default 'published');
create table parties(id uuid primary key default gen_random_uuid(), publication_status text default 'published');
create table people(id uuid primary key default gen_random_uuid(), publication_status text default 'published');
create table candidacies(id uuid primary key default gen_random_uuid(), election_id uuid references elections(id), publication_status text default 'published', second_round_status text, second_round_qualified_at timestamptz);
grant select on elections, sources, parties, people, candidacies to anon, authenticated;
