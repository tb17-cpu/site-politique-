/* ==========================================================================
   CONFIGURATION CENTRALE DU SITE
   C’est le seul fichier à modifier pour :
   - changer le nom et la devise du projet (identité provisoire) ;
   - ajouter une page au menu (liste « nav ») ;
   - changer les chiffres mis en avant sur la page Indicateurs (liste « featured ») ;
   - changer les thématiques : voir data-themes.js ;
   - modifier les textes du pied de page (« footer »).
   Les chiffres affichés sont lus dans data-analyses.js : ils ne sont jamais recopiés ici.
   ========================================================================== */
window.SITE = {
  name: "Au résultat",
  tagline: "Comprendre · Comparer · Évaluer",
  dataAsOf: "12 novembre 2026",

  /* Menu principal. Pour ajouter une page : une ligne ici + un fichier HTML (voir modele-page.html). */
  nav: [
    { id: "home",        label: "Accueil",                  href: "index.html" },
    { id: "analyses",    label: "Analyses internationales", href: "analyses-internationales.html" },
    { id: "methodologie",label: "Méthodologie",             href: "methodologie.html" }
  ],

  /* Rubriques propres à l'élection active (barre sous l'en-tête). Chaque lien reçoit ?e=<élection>. */
  electionNav: [
    { id: "election",    label: "Vue d’ensemble", href: "election.html" },
    { id: "candidats",   label: "Candidats",      href: "candidats.html" },
    { id: "programmes",  label: "Programmes",     href: "programmes.html" },
    { id: "thematiques", label: "Thématiques",    href: "thematiques.html" },
    { id: "comparateur", label: "Comparateur",    href: "comparateur.html" },
    { id: "indicateurs", label: "Indicateurs",    href: "indicateurs.html" }
  ],

  /* Chiffres de la page Indicateurs : { id du pays, rang de l’indicateur dans sa liste « k » }.
     Valeurs, libellés et sources viennent de data-analyses.js. */
  featured: [
    { id: "hu", k: 0 }, { id: "in", k: 0 }, { id: "ar", k: 0 }, { id: "it", k: 0 },
    { id: "br", k: 0 }, { id: "fi", k: 0 }, { id: "fr", k: 0 }, { id: "es", k: 0 }
  ],

  footer: {
    about: "Plateforme indépendante d’information et de comparaison des programmes politiques et des politiques publiques. Chaque élection dispose de ses candidats, programmes, mesures et indicateurs.",
    method: "Même grille de lecture pour tous les candidats, sources traçables, distinction entre faits, déclarations et estimations. Un point plein signale un chiffre lu dans une source consultée, un point creux une estimation à confirmer.",
    sources: "Chaque fiche des analyses internationales liste ses sources en bas de page. Les propositions des candidats seront publiées avec leurs sources officielles.",
    sourcesSlot: "Page de sources consolidée : à venir.",
    legal: "Mentions légales : à compléter avant diffusion large.",
    identity: "Nom et identité graphique provisoires."
  }
};
