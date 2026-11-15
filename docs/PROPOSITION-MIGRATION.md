# Proposition de migration — À VALIDER avant toute exécution

Rien de ce qui suit n'a été exécuté. Aucune modification de schéma, de RLS ni de données.

## 1. Statut des valeurs chiffrées (`case_outcomes`)

Constat : aucune colonne équivalente n'existe (`result_assessment` qualifie l'effet, pas la nature du chiffre).
Une même ligne peut mélanger des chiffres de natures différentes : un statut par valeur, sans nouvelle table.

```sql
alter table case_outcomes
  add column baseline_value_status text,
  add column observed_value_status text,
  add column fiscal_value_status  text;   -- coût et recette, un seul statut ; scinder en deux colonnes si besoin
alter table case_outcomes
  add constraint cov_status_chk check (
    coalesce(baseline_value_status,'unknown') in ('observed','projected','target','estimated','unknown') and
    coalesce(observed_value_status,'unknown') in ('observed','projected','target','estimated','unknown') and
    coalesce(fiscal_value_status,'unknown')   in ('observed','projected','target','estimated','unknown'));
```
Les lignes existantes restent NULL (= « Statut non vérifié ») ; chaque statut est ensuite renseigné à la main
après lecture de la source. Aucune mise à jour en masse déduite des dates.
Frontend : `cas.js` lit déjà ces trois colonnes si elles existent ; sans elles, tout s'affiche « Statut non vérifié ».
La règle fondée sur la date a été supprimée. Aucune requête ne dépend des nouvelles colonnes (`select=*`).

## 2. Photographies de sondages (nouvelle table)

```sql
create table poll_snapshots (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id),
  snapshot_date date not null,            -- date de la photographie (ex. 2026-11-15)
  poll_date date,                         -- date du sondage ou de la moyenne
  pollster text,                          -- institut ou agrégateur
  source_id uuid references sources(id),
  candidacy_id uuid references candidacies(id),   -- présidentielle : personnalité
  party_id uuid references parties(id),           -- législatives : parti
  label text,                             -- libellé s'il n'y a ni candidature ni parti (ex. Futuro Nazionale)
  value_percent numeric(5,2) not null,
  scenario text,                          -- périmètre et configuration testée
  methodology text,
  is_average boolean not null default false,
  sample_size integer,
  notes text,
  publication_status text not null default 'draft',
  reliability_level text, reliability_notes text,
  created_at timestamptz default now(),
  check (candidacy_id is not null or party_id is not null or label is not null)
);
alter table poll_snapshots enable row level security;
create policy poll_snapshots_read on poll_snapshots for select to anon using (publication_status = 'published');
```
Le rang se calcule à l'affichage (tri par `value_percent` décroissant dans la dernière `snapshot_date` d'une
élection) : jamais stocké. Le CIS espagnol et la moyenne privée sont deux lignes avec des `pollster`/`scenario`
distincts, donc la divergence reste visible. Aucune candidature n'est créée pour Futuro Nazionale (ligne `label`).
Frontend après validation : bloc « Sondages — photographie du <date> » sur la page élection, classement des candidats
par cette table, mention « sondage ≠ candidature ≠ résultat ».
Les valeurs de la photographie du 15 novembre sont à saisir avec leur source vérifiée : je ne les insère pas sans votre accord.
