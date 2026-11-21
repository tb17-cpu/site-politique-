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
- **Choix de l'utilisateur :** sélecteur « Apparence » de l'en-tête (Automatique, Clair, Sombre), construit par `assets/js/layout.js`. Le choix est mémorisé dans `localStorage` (clé `ar.theme`) ; sans choix enregistré, ou si le stockage est bloqué, le site s'ouvre en **clair**, quel que soit le réglage du système. « Automatique » (suivre le système et réagir en direct à son changement) n'est actif que si le visiteur le choisit.
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

## Présentation des programmes (variante A)

- **Cartes de mesures** : chaque mesure est une carte entièrement cliquable (`.mcard` dans `.mlist`, `assets/css/data.css`), sur deux colonnes (une sur mobile). Le statut de formalisation y est en libellé court (`UI.formalization(f, { short: true })`) ; le libellé complet reste dans l'infobulle, le texte pour lecteur d'écran et la légende dépliable « Comment lire les statuts ». Les fiches mesure et la comparaison gardent le libellé complet.
- **Groupes par thème** : filet marine de 3 px, intitulé, compteur ; « Autres propositions » plus discret (`.m-group--autres`). La règle de regroupement (thème de plus petit `display_order`, nom, id) est inchangée.
- **Fiche candidat** : identité à gauche, panneau programme à droite. Les raccourcis (thèmes, « Parcourir le programme ») défilent par script (`data-jump`) : le fragment d'URL est l'identifiant de la candidature, jamais une ancre. Parrainages et sources vides sont masqués.
- **Fiche mesure** : champs vides masqués (aucun message « non documenté »), « Déclaré par le candidat », « Description », « Analyse · Thème · publiée le … » (date : `published_at` ou `publication_date` uniquement, jamais `reviewed_at` ; sans date : « Analyse · Thème »), sources des mesures et de l'analyse repliées, sources de l'analyse dans un menu déroulant. Aucun indicateur « Fiabilité » sur ces pages.
- **Contrastes** : fond clair `#edf0f6`, filets `--line` / `--rule`, texte secondaire `--muted` à 7:1 sur blanc. Mode sombre : pastilles de statut sur fond teinté (texte ≥ 4,5:1), teintes de production inchangées.
- **Mobile** : bandeau réduit (logo, apparence, Menu), navigation et choix de l'élection dans le menu, titre d'élection sur une ligne, onglets défilants.
- Test : `node tests/refonte.test.js` (serveur statique sur 8765).

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


## Sondages, résultats et carte de statut évolutive

- **Sélecteur de sondages** (accueil de chaque élection uniquement) : un sondage à la fois, flèches « plus ancien / plus récent », liste déroulante, du plus récent au plus ancien. Chaque sondage reste indépendant (institut, date, terrain, échantillon, méthode, source propres).
- **Rubrique « Résultats officiels »** (accueil de l'élection) : onglets par tour, scores (% et voix), élu et qualifiés, participation, abstention, blancs, nuls, date, caractère provisoire/définitif. Invisible tant qu'aucun résultat n'est publié.
- **Carte de statut** (fiche candidat) : statut de la candidature, résultats officiels des tours passés (trait plein) et estimations de sondages (trait pointillé, mention « Estimation d’après sondages », date de référence). Intentions de 1er tour tant que ce tour n'a pas de résultat ; intentions de 2nd tour seulement pour les qualifiés ; aucun score pour un tour non tenu.
- **Tour d'un sondage** : lu uniquement dans la colonne explicite `poll_snapshots.round` (migration proposée `supabase/proposals/006_poll_round.sql`, non appliquée). Le texte du scénario n'est jamais interprété. Tour absent, NULL ou contradictoire : sondage consultable (« Tour non précisé ») mais jamais utilisé pour une estimation. La 006 remplit les anciennes lignes seulement si le scénario mentionne explicitement un seul tour ; le reste est listé dans la vue de revue `poll_snapshots_round_review` (propriétaire uniquement).
- **Estimation** : dernier sondage pertinent (fin de terrain la plus récente) ; moyenne simple si au moins deux instituts distincts sont comparables : même tour, mêmes candidats, même libellé de scénario non vide (casse et espaces ignorés), fenêtre de 21 jours ; un institut compte une fois (« pour … » ignoré). Pas de pondération. **Fraîcheur** (règle distincte) : si le sondage de référence date de plus de 30 jours, aucune estimation n'est présentée (le sondage reste consultable dans le sélecteur).
- **Statuts électoraux (règle unique, `Scrutin.status` dans `assets/js/scrutin.js`, utilisée par la fiche, la liste et la carte de statut)** : une valeur brute de candidature (`elected`, `winner`, `eliminated`, `defeated`, `second_round`, `second_round_status`…) n'est **jamais** une preuve. Élu, qualifié, éliminé et battu ne viennent que des résultats : résultat définitif cohérent → « Élu », « Qualifié pour le tour suivant », « Éliminé au … », « Battu » ; résultat provisoire cohérent → « Élu provisoire » (trait pointillé) ou « Qualifié » avec mention ; aucune conclusion négative sur résultat provisoire. Incohérence (un élu ET des qualifiés dans le même tour, statut de résultat inconnu, qualifié absent d'un tour suivant publié) → aucun statut issu de ce tour. Le nombre d'élus n'est pas limité. Le statut de candidature (déclarée, validée…) n'est pertinent que tant qu'aucun résultat n'existe ; retraits et désistements restent affichés.
- **Affichage dynamique** : pas d'information = pas d'affichage. Aucun bloc, titre, emplacement ni texte de remplacement (« non renseigné », « statut inconnu », « à préciser », « aucun sondage »…) : carte de statut, résultats, sondages, calendrier, situation de l'élection. Seules les erreurs techniques (chargement refusé ou en échec) restent signalées, distinctement d'une absence.
- **Données** : résultats dans `election_round_results` et `election_candidate_results` (migration **proposée** `supabase/proposals/005_election_results.sql`, non appliquée : cohérence publication tour/scores, entités, doublons, totaux, provisoire → définitif, contrainte différée inter-lignes : jamais d'élu avec des qualifiés dans un même tour). Tant qu'elle ne l'est pas, la rubrique reste inactive sans erreur. Logique partagée : `assets/js/scrutin.js`.
- **Contrôle des migrations** : `PGHOST=… PGPORT=… PGUSER=… sh tests/sql/run.sh` les rejoue sur une base PostgreSQL jetable (jamais Supabase) avec des données fictives.
- **Analyses** : la méthodologie d'une analyse (`analyses.methodology`) est une métadonnée interne conservée en base et non affichée ; la page générale `methodologie.html` est inchangée.

### Écritures concurrentes, parcours multi-tours, colonnes déclaratives (propositions 005/006, non appliquées)

- **Concurrence.** Les contrôles différés (totaux, élu/qualifié d'un même tour) ne voient pas une transaction concurrente non validée. Les écritures d'un même tour sont donc sérialisées par un verrou `FOR UPDATE` sur la ligne parente `election_round_results` (pris avant le contrôle de clé étrangère), et celles d'un même sondage par un verrou consultatif de transaction (`poll_round_lock`). Aucune limite sur le nombre d'élus ou de qualifiés. Test : `tests/sql/concurrence.sh` (lancé par `tests/sql/run.sh`, PostgreSQL local jetable uniquement).
- **Parcours d'un candidat sur plusieurs tours.** Un candidat ayant une issue terminale à un tour (élu, ou non qualifié sur un résultat final) et réapparaissant dans un autre tour n'a aucun statut d'issue : un statut ultérieur n'écrase donc pas silencieusement une victoire, et une victoire ne masque pas un résultat contradictoire. Les scores restent affichés. Aucune contrainte SQL ne l'interdit (scrutins à plusieurs élus ou configurations particulières restent possibles) ; la vue propriétaire `election_result_path_conflicts` permet de repérer et corriger les données. « Qualifié » puis présent au tour suivant est normal.
- **Colonnes `second_round_status` / `second_round_qualified_at`.** Déclaratives (sans source ni date de vérification) : conservées, jamais une preuve, jamais affichées comme qualification. Rapprochement informatif avec les résultats : vue propriétaire `candidacy_second_round_reconciliation`, contrôle « Qualifications » de `diagnostic.html`, `Scrutin.qualificationAudit`.
