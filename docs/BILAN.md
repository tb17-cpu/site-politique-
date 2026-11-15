# Bilan d'audit — état au 15 novembre 2026

Tests : tous les tests Playwright ont utilisé des réponses Supabase **simulées** ; aucune vérification sur le site publié ni sur la base réelle n'a été possible depuis l'environnement de développement (réseau bloqué). Les migrations ont été exécutées sur une **copie locale PostgreSQL 16 avec tables factices**, pas sur Supabase.

## Priorités
**Indispensable**
1. Exécuter `000_precheck.sql`, puis `001`, puis `002` (voir ci-dessous) ; lancer `supabase/audit_securite.sql` (RLS, droits anon) ; ouvrir `diagnostic.html` sur le site publié.
2. Renseigner les statuts des valeurs chiffrées (observed, projected, target, estimated) après lecture de chaque source.
3. Saisir la photographie de sondages du 15 novembre avec sources vérifiées.

**Important**
4. Compléter les sources manquantes signalées par le diagnostic (mesures, candidatures, résultats chiffrés).
5. Vérifier l'affichage réel Espagne / Italie (candidatures « non confirmées » jamais présentées comme officielles).
6. Remplacer les anciens tests `sb-test2`/`sb-test3` (obsolètes depuis la suppression des données de démonstration) par des tests alignés sur le code actuel.
7. Photos officielles des candidats (celles de Commons sont créditées mais à vérifier) ; mentions légales.

**Amélioration ultérieure**
8. Comparateur par famille de politiques avec cas étrangers associés ; pagination au-delà de 1 000 lignes ; tests sur données réelles automatisés.

## Ordre de traitement
précontrôle → 001 → 002 → audit sécurité → diagnostic publié → saisie des statuts et des sondages → compléments de sources.
