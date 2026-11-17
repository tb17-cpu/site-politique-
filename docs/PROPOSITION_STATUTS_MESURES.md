# Statuts de formalisation des mesures — proposition (version 3, non exécutée)

SQL final : `supabase/proposals/003_measure_formalization_status.sql` (précontrôles, migration, contrôles, retour arrière). **Aucune migration n'a été exécutée** ; le dossier `proposals/` est volontairement distinct de `migrations/` (qui ne contient que des scripts approuvés).

## Valeurs et libellés
`official_program` Programme officiel publié du candidat · `party_position` Position officielle du parti · `candidate_pledge` Engagement public du candidat · `recent_announcement` Annonce récente non intégrée à un programme · `press_reported` Information rapportée par la presse, à confirmer.

## Version 3 : l'association à la mesure est garantie par la base
Le statut est rattaché à la **ligne précise de `measure_sources`** qui le justifie (schéma confirmé : `measure_sources.id` uuid PK, `measure_id` FK, `source_id` FK ; unicité existante sur `(measure_id, source_id, page_reference)`).
- Une seule colonne de référence : `formalization_measure_source_id` (plus de `formalization_source_id`, donc aucune contradiction possible).
- Clé étrangère composite `measures(id, formalization_measure_source_id)` → `measure_sources(measure_id, id)` : la base refuse une ligne justificative appartenant à une autre mesure. Non appliquée tant que la colonne est NULL (mesures sans statut).
- Cible requise : contrainte `UNIQUE (measure_id, id)` sur `measure_sources`. Triviale (`id` est déjà unique) : aucune donnée modifiée, aucun doublon possible, et plusieurs pages d'une même source restent possibles.
- Le statut exige toujours une date de référence propre (`formalization_status_date`, indépendante de `sources.publication_date`) et l'association (CHECK).
- La source se lit à travers la ligne : `measure_sources.source_id` → `sources`. Le site n'affiche le statut que si cette source est **publiée** ; une source dépubliée supprime le badge. Pas de trigger : contrôle applicatif + requête d'audit §4 du SQL.
- Effet de bord à connaître : tant qu'une ligne de `measure_sources` justifie un statut, elle ne peut pas être supprimée (clé étrangère). Les autres lignes (autres pages) restent supprimables.
- Aucune donnée, politique RLS ni permission modifiée ; les colonnes ajoutées à `measures` suivent le modèle d'accès existant (précontrôle des droits par colonne conservé).

## Rappel des adaptations par rapport à la migration 003 d'origine
- Schéma aligné sur l'audit réel ; précontrôles étendus (types, colonnes existantes, droits table et colonne, politiques RLS, vues dépendantes, contraintes de `measure_sources`).
- Colonnes créées sans `if not exists` : une réexécution échoue au lieu d'écraser silencieusement.
- Index partiel (lignes avec statut) ; `notify pgrst, 'reload schema'`.

## Conséquences
- Les 1 651 mesures gardent un statut NULL : aucun badge tant que l'éditorial n'est pas saisi. `reliability_level` n'est ni lu ni modifié.
- Le site affiche un statut seulement s'il est complet (valeur autorisée, date, ligne justificative de cette mesure dont la source est publiée) ; sinon rien. Présentation neutre : même pastille et même couleur pour les cinq statuts.
- **Ordre de déploiement :** exécuter la migration, puis déployer le code. Avant la migration, le code est déjà inoffensif (requête séparée ; colonnes absentes → aucun badge, pas d'erreur), mais la fiabilité des mesures n'est plus affichée.
- **Embeds ambigus (constaté après application de la v3)** : la clé composite crée une 2e relation `measures` ↔ `measure_sources`, donc `measure_sources(*,sources(*))` seul est rejeté par PostgREST (PGRST201). Le site désigne désormais la relation historique partout : `measure_sources!measure_sources_measure_id_fkey(...)` (db.js `DB.measure`, diagnostic.js) ; les statuts utilisent `measure_sources!measures_formalization_measure_source_fk(...)`. Test de non-régression : `tests/embed.test.js`. Tout nouvel embed `measure_sources` doit porter un indice.


## État constaté après application (communiqué par le propriétaire, lecture seule)
- Migration v3 appliquée : 1 628 mesures ont un statut renseigné, 21 mesures publiées n'en ont pas encore. Ces 21 n'affichent aucun badge (comportement voulu) ; leur fiche doit rester pleinement accessible.
- Cause du message « La base de données a refusé la requête » : l'embed `measure_sources(*,sources(*))` sans indice devenait ambigu (PostgREST répond 300 / PGRST201, que `db.js` range dans « requête refusée »). Corrigé par l'indice de relation (voir plus haut) ; la branche `fix/embed-measure-sources` n'est pas encore déployée, le site en ligne reste en erreur jusqu'au déploiement.
- Non-régression : `tests/embed.test.js` simule cette volumétrie (1 649 mesures, 1 628 statuts, serveur plafonné à 1 000 lignes) : tous les statuts sont récupérés par pagination, sans doublon, sans ambiguïté.
- L'état des lieux `supabase/audits/004_etat_des_lieux_statuts.sql` sert désormais surtout à contrôler les 21 mesures restantes (requête B : `formalization_status is null`) et à auditer les sources dépubliées parmi les 1 628 statuts (audit §4 de la migration).
