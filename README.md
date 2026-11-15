# Au résultat

Plateforme d’information et d’analyse des politiques publiques : comparer les expériences internationales et confronter les discours politiques aux résultats observés.

Le nom et l’identité graphique sont provisoires.

## Architecture

- **GitHub** : code et historique. **GitHub Pages** : hébergement (chemins relatifs, le site fonctionne sous `/site-politique-/`).
- **Supabase** : source unique de vérité des contenus politiques. Le navigateur lit l’API REST en lecture seule, avec la clé publique « publishable » uniquement. Les règles RLS décident de ce qui est visible ; les brouillons ne sont jamais récupérés. Aucune clé secrète dans le dépôt.
- Aucun framework ni dépendance : HTML, CSS, JavaScript.

```
index.html                       Accueil (accès dynamiques, recherche)
candidats.html / candidat.html   Candidatures publiées, fiche détaillée
thematiques.html                 Familles et sous-thématiques, mesures liées
mesure.html                      Fiche d’une mesure : déclaration du candidat, analyses d’Au résultat, sources
comparateur.html                 Comparaison des mesures d’une sous-thématique
indicateurs.html                 Indicateurs et observations
analyses-internationales.html    Dossiers internationaux (contenu statique conservé)
methodologie.html, diagnostic.html (contrôle de la connexion), modele-page.html
assets/js/supabase-config.js     URL et clé publishable
assets/js/db.js                  Module unique d’accès aux données (lecture seule)
assets/js/ui.js                  États (chargement, vide, erreur), composant de fiabilité, formats
assets/js/data-analyses.js, data-gauche.js   Fiches des analyses internationales
assets/css/                      base, home, pages, data, dashboard, analyses
```

## Élection active

Le sélecteur de l'en-tête liste les élections publiées de Supabase (aucune n'est codée en dur). L'élection active vient de `?e=<id>` dans l'URL, sinon de la dernière consultée, sinon de l'unique élection publiée. Les rubriques Vue d'ensemble, Candidats, Programmes, Thématiques, Comparateur et Indicateurs n'affichent que l'élection active. Les analyses internationales et la méthodologie n'en dépendent pas. Une nouvelle élection publiée dans la base apparaît seule.

## Portraits et positionnement politique

- Portrait : `people.photo_url` s'il est publié, sinon un emplacement neutre explicite. Aucune image n'est inventée.
- Positionnement gauche-droite (cinq niveaux, libellé toujours affiché) : aucune colonne dédiée n'existe encore. L’échelle lit `political_position`, `political_position_note` et `political_position_uncertain` sur la candidature ; la couleur du parti vient de `parties.political_color`, le crédit de `people.photo_credit` et `photo_source_url`. Données lues dans la base (`candidacies.political_position*`).

## Opérations courantes

| Je veux… | Je modifie… |
|---|---|
| Ajouter ou corriger un contenu politique (candidat, mesure, analyse, source, indicateur) | Supabase, pas le code |
| Changer le nom, la devise ou le pied de page | `assets/js/site-config.js` |
| Changer les couleurs ou les polices | variables en haut de `assets/css/base.css` |
| Corriger une fiche des analyses internationales | `data-analyses.js` (ou `data-gauche.js`) |
| Vérifier la connexion à la base | ouvrir `diagnostic.html` sur le site publié |

## Fiabilité des données

Un point plein signale un chiffre lu dans une source consultée, un point creux une estimation à confirmer. Dans `data-analyses.js`, le suffixe `^` produit le point plein et `~` le point creux.

## Migrations Supabase (supabase/migrations)

- `000_precheck.sql` : contrôles en lecture seule à lancer avant (valeurs autorisées réelles, types uuid).
- `001_case_outcomes_value_status.sql` : statuts par valeur (observed, projected, target, estimated, unknown) pour la référence, la valeur chiffrée, le coût et les recettes. Additive : les lignes existantes restent NULL (« Statut non vérifié »).
- `002_poll_snapshots.sql` : photographies de sondages (sondages et moyennes séparés ; partis, candidatures, personnalités ou libellé libre). Le rang est calculé à l'affichage.

Le site n'écrit jamais en base : ces scripts s'exécutent dans l'éditeur SQL Supabase. Le frontend est compatible avant et après leur exécution (colonnes absentes = statut non vérifié ; table absente = aucun bloc de sondages).
- `supabase/audit_securite.sql` : audit en lecture seule (RLS, politiques, droits anon/authenticated, vues, fonctions).
- `docs/BILAN.md` : bilan d'audit et priorités.

## Candidats et sondage

- Ordre de la page Candidats : `candidacies.display_order` (saisi dans Supabase), sans aucun calcul ; les lignes sans ordre viennent après.
- Page élection : un seul sondage (OpinionWay, scénario « Hypothèse 1 ») en graphique, scores tels que publiés ; une valeur inférieure à 1 s’affiche « moins de 1 