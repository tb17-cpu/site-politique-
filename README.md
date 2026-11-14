# Au résultat

Plateforme d’information et d’analyse des politiques publiques : comparer les expériences internationales et confronter les discours politiques aux résultats observés.

Le nom et l’identité graphique sont provisoires.

## Organisation du projet

```
index.html                       Accueil : promesse, recherche, trois portes d’entrée, thématiques, méthode, ressources
candidats.html / candidat.html   Statuts de candidature, liste (vide), modèle de fiche
thematiques.html                 Onze familles de politiques publiques et leurs sous-thèmes
comparateur.html                 Structure du comparateur (sans donnée)
analyses-internationales.html    Bibliothèque de dossiers : La droite radicale au pouvoir (14 pays + 2 comparaisons), La gauche au pouvoir (en construction)
indicateurs.html                 Quinze domaines d’indicateurs et premiers chiffres des dossiers internationaux
methodologie.html                Principes, faits/déclarations/estimations, sources, limites
modele-page.html                 Modèle pour créer une page (non indexé)
docs/modele-de-donnees.md        Modèle de la base documentaire (phase 2)
assets/css/                      base (identité), home, pages (pages intérieures), dashboard, analyses
assets/js/
  site-config.js                 Nom, menu, pied de page, chiffres de la page Indicateurs
  data-themes.js                 Classification thématique
  data-france2027.js             Élections, statuts, candidats, propositions (listes vides)
  data-indicateurs.js            Domaines et indicateurs
  data-analyses.js / data-gauche.js   Fiches pays des deux dossiers
  layout.js, utils.js, search.js, fiche.js, tabs.js, analyses.js, home.js, candidats.js, candidat.js, thematiques.js, indicateurs.js
```

Le site est statique : aucun outil de compilation. Il suffit de publier ces fichiers (GitHub Pages).

## Opérations courantes

| Je veux… | Je modifie… |
|---|---|
| Changer le nom, la devise ou le pied de page | `assets/js/site-config.js` |
| Changer les couleurs ou les polices | variables en haut de `assets/css/base.css` |
| Ajouter ou renommer une thématique ou un sous-thème | `assets/js/data-themes.js` |
| Ajouter un candidat (avec source officielle) | `CANDIDATES` dans `data-france2027.js` : sa fiche et la recherche se remplissent seules |
| Ajouter une proposition | `PROPOSITIONS` dans `data-france2027.js` |
| Ajouter un indicateur | `INDICATORS` dans `data-indicateurs.js` |
| Corriger un chiffre ou ajouter un pays au dossier « droite radicale » | `data-analyses.js` (tableau `C`) |
| Ajouter un pays au dossier « gauche » | `data-gauche.js` (tableau `G`, même format) |
| Ajouter une page au menu | copier `modele-page.html`, ajouter une ligne dans `nav` de `site-config.js` |

Les listes de candidats, propositions et indicateurs sont vides volontairement : rien n’est publié sans source officielle.

## Fiabilité des données

Un point plein signale un chiffre lu dans une source consultée, un point creux une estimation à confirmer. Dans `data-analyses.js`, le suffixe `^` produit le point plein et `~` le point creux.
