# Statuts de formalisation des mesures — proposition (version 2, non exécutée)

SQL final : `supabase/proposals/003_measure_formalization_status.sql` (précontrôles, migration, contrôles, retour arrière). **Aucune migration n'a été exécutée** ; le dossier `proposals/` est volontairement distinct de `migrations/` (qui ne contient que des scripts approuvés).

## Valeurs et libellés
`official_program` Programme officiel publié du candidat · `party_position` Position officielle du parti · `candidate_pledge` Engagement public du candidat · `recent_announcement` Annonce récente non intégrée à un programme · `press_reported` Information rapportée par la presse, à confirmer.

## Adaptations par rapport à la migration 003 d'origine (branche `feat/statuts-mesures`)
| Point | Version d'origine | Version 2 |
|---|---|---|
| Schéma | supposé | aligné sur l'audit réel : 1 651 mesures, `sources.publication_date` absente pour 93 sources, 3 411 associations `measure_sources` |
| Date de référence | propre au statut | idem, explicitement indépendante de `sources.publication_date` |
| Source justificative | FK vers `sources` seulement | FK vers `sources` + contrôle que la source est **associée à la mesure** (`measure_sources`) et **publiée**, appliqué par le site et par une requête d'audit (pas de trigger) ; variante SQL stricte documentée, facultative |
| Précontrôles | 6 | 7 : types de clés, colonnes existantes, droits table **et colonne**, politiques RLS, vues dépendantes, repères de comptage, colonnes de `measure_sources` |
| Création des colonnes | `if not exists` | sans `if not exists` : une réexécution échoue (aucun écrasement silencieux) |
| Index | complet | partiel (lignes avec statut uniquement) |
| Cache API | — | `notify pgrst, 'reload schema'` |
| Politiques RLS / permissions | inchangées | inchangées ; précontrôle des droits par colonne |

## Conséquences
- Les 1 651 mesures gardent un statut NULL : aucun badge tant que l'éditorial n'est pas saisi. `reliability_level` n'est ni lu ni modifié.
- Le site affiche un statut seulement s'il est complet (valeur autorisée, date, source publiée et associée) ; sinon rien.
- **Ordre de déploiement :** exécuter la migration, puis déployer le code. Avant la migration, le code est déjà inoffensif (requête séparée ; colonnes absentes → aucun badge, pas d'erreur), mais la fiabilité des mesures n'est plus affichée.
- L'ajout de la clé `measures → sources` ne rend ambigu aucun embed existant (tous passent par des tables de jonction ; le site utilise l'indice `sources!formalization_source_id`).
