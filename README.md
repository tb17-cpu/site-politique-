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

## Apparence : clair, sombre, automatique
- **Une seule source de couleurs :** `assets/css/tokens.css` (clair par défaut ; `:root[data-theme="dark"]` pour le sombre). Aucun autre fichier CSS ne contient de couleur en dur ; la seule exception est hors CSS : `assets/js/theme-init.js` écrit en dur les deux couleurs de la barre du navigateur mobile (`<meta name="theme-color">`, qui ne lit pas les variables CSS) ; elles doivent suivre `--header-bg`. Changer l'identité = changer `tokens.css` (et ces deux valeurs).
- **Choix de l'utilisateur :** sélecteur « Apparence » de l'en-tête (Automatique, Clair, Sombre), construit par `assets/js/layout.js`. Le choix est mémorisé dans `localStorage` (clé `ar.theme`) ; sans choix, ou si le stockage est bloqué, le site suit le système et réagit en direct à son changement.
- **Pas de flash :** `assets/js/theme-init.js` est chargé en tête de chaque page, de façon synchrone, avant les feuilles de style ; il pose `<html data-theme>` avant le premier affichage. Sans JavaScript, la page reste en clair.
- **Les cinq statuts de formalisation** gardent leurs libellés et les couleurs de la version en production : `#86aee8` (programme officiel), `#6fbcc8` (position du parti), `#aa9bdb` (engagement du candidat), `#d4a47e` (annonce récente), `#c791a6` (presse). En clair, la teinte est le fond de la pastille (texte `--fs-ink`) ; en sombre, c'est le texte et le contour sur un fond très sombre teinté. Contraste texte/pastille ≥ 7:1 dans les deux modes ; `tests/statuts.test.js` vérifie les valeurs exactes.
- **Focus clavier :** contour de 3 px (`--focus`, `--focus-bar` sur les bandeaux marine et le pied de page).
- **Regroupement des mesures d'une fiche candidat :** une mesure multi-thèmes va dans le thème de plus petit `display_order` (puis nom, puis id) ; ordre des groupes fixe, « Autres propositions » en dernier. Aucune dépendance à l'ordre renvoyé par la base.
- **Tests :** `tests/apparence.test.js` (thème, mémorisation, flash, focus) et `tests/regroupement.test.js` (multi-thèmes, ordres aléatoires, repli de jointure). Comme les autres tests Playwright, ils attendent un serveur sur `http://localhost:8765/site-politique-/`.

## Textes éditoriaux en Markdown
Les champs rédigés dans Supabase restent du **Markdown** (jamais du HTML) ; le site les met en forme automatiquement.
- **Moteur unique :** `assets/js/markdown.js` (sans dépendance). Il échappe tout le HTML avant mise en forme, n'accepte que les éléments Markdown prévus et des liens `http(s)`/ancres ; `javascript:`, `data:` etc. sont neutralisés (le texte du lien reste).
- **Point d'entrée commun :** `UI.rich(texte)` (blocs : paragraphes, `## Sous-titre`, listes `- ` et `1. `, `**gras**`, retours à la ligne) et `UI.richInline(texte)` (contextes sans bloc : citation, chapô, carte), dans `assets/js/ui.js`. Aucune page ne contient de traitement Markdown propre ; sans le moteur, le texte est simplement échappé.
- **Champs compatibles :** profil et biographie des candidats, description des programmes et des thématiques/familles, tous les champs d'une mesure (objectif, mécanisme, publics, modalités, évaluations des analyses…), cellules du comparateur, définition et méthodologie des indicateurs, descriptions d'élection (chapô, accueil, choix d'élection), notes de sources, textes des cas et dossiers pays. Les textes sans Markdown s'affichent comme avant.
- **Style :** `assets/css/markdown.css` (variables de `tokens.css` uniquement). Gras et puces : couleur identitaire `--accent` ; vraies puces (`::marker`) ; sous-titres en serif avec filet `--accent-dim`.
- **Tests :** `tests/markdown.test.js` (moteur, 100 contenus malveillants, 8 pages en clair/sombre, desktop/mobile, rétrocompatibilité).

## Cache des fichiers statiques
GitHub Pages met JS et CSS en cache dans le navigateur. Chaque page référence donc ses fichiers avec une empreinte de contenu
(`assets/js/db.js?v=1a2b3c4d`) : l'URL ne change que si le fichier change. **Après toute modification d'un fichier de `assets/`,
lancer `node tools/cache-bust.js` avant de commiter** ; `node tools/cache-bust.js --check` vérifie (code 1 si une référence est périmée).

## Migrations Supabase (supabase/migrations)

- `000_precheck.sql` : contrôles en lecture seule à lancer avant (valeurs autorisées réelles, types uuid).
- `001_case_outcomes_value_status.sql` : statuts par valeur (observed, projected, target, estimated, unknown) pour la référence, la valeur chiffrée, le coût et les recettes. Additive : les lignes existantes restent NULL (« Statut non vérifié »).
- `002_poll_snapshots.sql` : photographies de sondages (sondages et moyennes séparés ; partis, candidatures, personnalités ou libellé libre). Le rang est calculé à l'affichage.

Le site n'écrit jamais en base : ces scripts s'exécutent dans l'éditeur SQL Supabase. Le frontend est compatible avant et après leur exécution (colonnes absentes = statut non vérifié ; table absente = aucun bloc de sondages).
- `supabase/audit_securite.sql` : audit en lecture seule (RLS, politiques, droits anon/authenticated, vues, fonctions).
- `docs/BILAN.md` : bilan d'audit et priorités.

## Candidats et sondage

- Ordre de la page Candidats : `candidacies.display_order` (saisi dans Supabase), sans aucun calcul ; les lignes sans ordre viennent après.
- Page élection : un seul sondage (OpinionWay, scénario « Hypothèse 1 ») en graphique, scores tels que publiés ; une valeur inférieure à 1 s’affiche « moins de 1 % ». Critères de sélection : constante `FEATURED` dans `assets/js/election-vue.js`.
