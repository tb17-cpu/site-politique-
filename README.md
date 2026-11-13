# Au résultat

Plateforme d’information et d’analyse des politiques publiques : comparer les expériences internationales et confronter les discours politiques aux résultats observés.

Le nom et l’identité graphique sont provisoires.

## Organisation du projet

```
index.html                       Page d’accueil
analyses-internationales.html    Deux onglets : L’extrême droite au pouvoir (14 pays + 2 comparaisons) et La gauche au pouvoir (en construction)
modele-page.html                 Modèle pour créer une nouvelle page (non indexé)
assets/
  css/base.css                   Identité visuelle (variables de couleur et de police), bandeau, pied de page
  css/home.css                   Style de l’accueil
  css/analyses.css               Style des fiches pays
  js/site-config.js              Configuration centrale : nom, menu, publications, indicateurs de l’accueil, thèmes, pied de page
  js/layout.js                   Bandeau et pied de page partagés
  js/utils.js                    Fonctions communes (mise en forme, marqueurs de fiabilité)
  js/data-analyses.js            Données de l’onglet « L’extrême droite au pouvoir » et constats transversaux
  js/data-gauche.js              Données de l’onglet « La gauche au pouvoir » (liste G, vide pour l’instant)
  js/tabs.js                     Gestion des onglets de la page d’analyses
  js/analyses.js                 Affichage de la page d’analyses
  js/home.js                     Affichage de l’accueil (lit data-analyses.js et site-config.js)
  img/logo.svg                   Logo provisoire
```

Le site est statique : aucun outil de compilation n’est nécessaire. Il suffit de publier ces fichiers (GitHub Pages).

## Opérations courantes

| Je veux… | Je modifie… |
|---|---|
| Changer le nom, la devise ou le pied de page | `assets/js/site-config.js` |
| Changer les couleurs ou les polices | variables en haut de `assets/css/base.css` |
| Ajouter une publication dans « Dernières analyses » | liste `updates` de `site-config.js` |
| Changer les chiffres marquants de l’accueil | liste `featured` de `site-config.js` (pays + rang de l’indicateur) |
| Ajouter ou modifier un thème | liste `themes` de `site-config.js` |
| Corriger un chiffre ou ajouter un pays à l’onglet « extrême droite » | `assets/js/data-analyses.js` (le tableau `C`) |
| Ajouter un pays à l’onglet « gauche » | `assets/js/data-gauche.js` (le tableau `G`, même format que `C`) |
| Ajouter une page au menu | copier `modele-page.html`, puis ajouter une ligne dans `nav` de `site-config.js` |

Les chiffres de l’accueil ne sont jamais recopiés : ils sont lus dans `data-analyses.js`. Corriger un chiffre à cet endroit le corrige partout.

## Fiabilité des données

Un point plein signale un chiffre lu dans une source consultée, un point creux une estimation à confirmer. Dans `data-analyses.js`, le suffixe `^` produit le point plein et `~` le point creux.
