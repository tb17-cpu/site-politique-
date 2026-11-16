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
- L'ajout de la clé composite `measures → measure_sources` crée une seconde relation entre ces deux tables : le site utilise l'indice explicite `measure_sources!measures_formalization_measure_source_fk` ; les embeds existants `measure_sources(...)` sont inchangés (à surveiller : un embed `measure_sources` sans indice sous `measures` pourrait devenir ambigu ; aucun n'existe côté site, où ils passent par `DB.measure` avec la relation un-à-plusieurs).
