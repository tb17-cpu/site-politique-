# Modèle de données de la base documentaire (phase 2)

Ce document décrit la structure à remplir. Rien n’est inventé : les listes sont vides tant qu’une source officielle n’est pas citée.
Les fichiers concernés sont dans `assets/js/` : `data-france2027.js`, `data-themes.js`, `data-indicateurs.js`.

## Entités et relations

```
Pays ── Élection ── Candidat ── Programme ── Proposition ── Thématique (+ sous-thème)
                                                   │
                                                   └── Source (une ou plusieurs, avec date)
Indicateur ── Domaine ── Source, unité, définition, date
Dossier international ── Pays étudié ── fiche (data-analyses.js)
```

| Entité | Champs principaux | Remarque |
|---|---|---|
| Élection | id, pays, type, année | « fr-pres-2027 » aujourd’hui ; d’autres pays et scrutins s’ajoutent sans changer le modèle |
| Candidat | id, nom, parti, statut, date du statut, présentation, sources, date de vérification, historique | statut parmi : déclarée, investie ou soutenue, pressentie, non confirmée |
| Programme | candidat, élection, résumé, URL officielle | une personne peut avoir un programme par élection |
| Proposition | candidat, élection, thématique, sous-thème, contenu précis, mécanisme, objectifs annoncés, financement annoncé ou estimé, sources, date de publication, date de vérification, historique | cœur de la base |
| Thématique | id, titre, sous-thèmes | indépendante du pays (`data-themes.js`) |
| Indicateur | id, domaine, nom, définition, unité, source, date, valeurs | publié seulement si les quatre mentions sont présentes |
| Relation entre propositions | proposition A, proposition B, type, justification | types : similaires, complémentaires, opposées, sans équivalent direct. Fondée sur le contenu et le mécanisme, jamais sur l’intitulé seul |

## Règles éditoriales

- Distinguer le fait (chiffre lu dans une source), la déclaration (ce qu’un acteur annonce) et l’estimation (ordre de grandeur à confirmer).
- Toute donnée importante renvoie à une source accessible et porte une date de dernière vérification.
- Une proposition est enregistrée avec le texte et le mécanisme annoncés, sans jugement dans le champ de description.
- Mêmes champs et même exigence pour tous les candidats et toutes les familles politiques.
- Une veille assistée par IA peut proposer des ajouts ou des modifications. Rien n’est publié sans vérification humaine.

## Ajouter un candidat

Ajouter une entrée à `CANDIDATES` dans `data-france2027.js` (format en commentaire du fichier). La page « Les candidats » et la fiche `candidat.html#identifiant` se remplissent seules. Ne renseigner que ce qui est établi par une source officielle citée.
