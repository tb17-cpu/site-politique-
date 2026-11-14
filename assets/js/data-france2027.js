/* ==========================================================================
   BASE DOCUMENTAIRE : ÉLECTIONS, CANDIDATS, PROGRAMMES, PROPOSITIONS
   Cette version contient la STRUCTURE, volontairement sans données :
   aucun candidat, programme ou proposition n’est publié tant qu’il n’est pas
   établi à partir d’une source officielle citée.
   Le modèle complet (champs, relations) est décrit dans docs/modele-de-donnees.md.
   Les listes ci-dessous sont indépendantes d’un pays : une autre élection s’ajoute dans ELECTIONS.
   ========================================================================== */

/* Élections couvertes. Le premier périmètre est la présidentielle française de 2027. */
const ELECTIONS = [
  { id: "fr-pres-2027", country: "FR", countryName: "France", type: "Élection présidentielle", year: 2027,
    label: "Élection présidentielle française de 2027" }
];

/* Statuts de candidature : ne jamais confondre visibilité médiatique et candidature officielle. */
const CANDIDACY_STATUS = [
  { id: "declaree", label: "Candidature déclarée",
    text: "La personne a annoncé publiquement sa candidature. Déclarer ne vaut pas être candidat : la liste officielle des candidats est arrêtée par le Conseil constitutionnel, après le dépôt des parrainages d’élus." },
  { id: "investie", label: "Investiture ou soutien d’un parti",
    text: "Un parti ou un mouvement a investi ou officiellement soutenu la personne, par un vote interne, une primaire ou une décision publique de ses instances." },
  { id: "pressentie", label: "Personnalité pressentie",
    text: "La presse, des sondages ou des responsables politiques évoquent une candidature que l’intéressé n’a ni confirmée ni exclue." },
  { id: "non-confirmee", label: "Candidature non confirmée",
    text: "Une candidature a été évoquée, démentie, retirée ou reste sans confirmation vérifiable. Elle est signalée pour la traçabilité, pas présentée comme probable." }
];

/* Candidats. Format d’une entrée :
   { id:"nom-prenom", election:"fr-pres-2027", name:"Prénom Nom", party:"…", status:"declaree",
     statusSince:"AAAA-MM-JJ", intro:"présentation courte",
     programme:{ summary:"…", url:"…" },
     sources:[{ label:"…", url:"…" }], verifiedOn:"AAAA-MM-JJ",
     history:[{ date:"AAAA-MM-JJ", text:"évolution du programme ou de la candidature", source:"url" }] } */
const CANDIDATES = [];

/* Propositions : { id, candidate, election, theme (id de THEMES), sub, text, mechanism, objective, financing,
   sources:[{label,url}], publishedOn, verifiedOn, history:[…] } */
const PROPOSITIONS = [];
