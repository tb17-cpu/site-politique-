/* ==========================================================================
   CONFIGURATION CENTRALE DU SITE
   C’est le seul fichier à modifier pour :
   - changer le nom et la devise du projet (identité provisoire) ;
   - ajouter une page au menu (liste « nav ») ;
   - ajouter une publication récente (liste « updates ») ;
   - changer les indicateurs mis en avant sur l’accueil (liste « featured ») ;
   - changer les thématiques (liste « themes ») ;
   - modifier les textes du pied de page (« footer »).
   Les chiffres affichés sur l’accueil sont lus dans data-analyses.js : ils ne sont jamais recopiés ici.
   ========================================================================== */
window.SITE = {
  name: "Au résultat",
  tagline: "Politiques publiques · comparaisons internationales",
  dataAsOf: "12 novembre 2026",

  /* Menu principal. Pour ajouter une page : une ligne ici + un fichier HTML (voir modele-page.html). */
  nav: [
    { id: "home",     label: "Accueil",                 href: "index.html" },
    { id: "analyses", label: "Analyses internationales", href: "analyses-internationales.html" }
  ],

  /* Dernières analyses et mises à jour, de la plus récente à la plus ancienne. */
  updates: [
    { date: "2026-11-13", tag: "Plateforme",
      title: "Analyses internationales : deux onglets",
      desc: "« La droite radicale au pouvoir » reprend les analyses existantes. « La gauche au pouvoir » est créé et attend le choix des pays.",
      href: "analyses-internationales.html#gauche" },
    { date: "2026-11-13", tag: "Plateforme",
      title: "Mise en ligne de la page d’accueil et du menu de navigation",
      desc: "Nouvelle page d’accueil, menu à deux entrées et identité graphique provisoire. Les analyses existantes sont inchangées.",
      href: "analyses-internationales.html" },
    { date: "2026-11-12", tag: "Comparaison",
      title: "France (dix ans de Macron) et Espagne (gauche de Sánchez)",
      desc: "Deux fiches hors périmètre, au même format que les autres, pour servir de points de repère.",
      href: "analyses-internationales.html#fr" },
    { date: "2026-11-11", tag: "Analyses internationales",
      title: "Quatorze pays dans leur période « droite radicale »",
      desc: "Situation avant le mandat, indicateurs, indices de libertés et bilan positif, mitigé et négatif pour chaque pays.",
      href: "analyses-internationales.html#overview" },
    { placeholder: true,
      title: "Emplacement éditorial : prochaine publication",
      desc: "Ajouter une entrée dans la liste « updates » de assets/js/site-config.js pour la faire apparaître ici." }
  ],

  /* Indicateurs de l’accueil : { id du pays, rang de l’indicateur dans sa liste « k » }.
     Valeurs, libellés et sources viennent de data-analyses.js. */
  featured: [
    { id: "hu", k: 0 }, { id: "in", k: 0 }, { id: "ar", k: 0 }, { id: "it", k: 0 },
    { id: "br", k: 0 }, { id: "fi", k: 0 }, { id: "fr", k: 0 }, { id: "es", k: 0 }
  ],

  /* Grandes thématiques : chaque entrée renvoie vers les fiches pays concernées. */
  themes: [
    { title: "Économie et finances publiques",
      text: "Croissance, inflation, dette, déficit : ce qui s’est amélioré ou dégradé par rapport à la tendance d’avant mandat.",
      ids: ["pl", "in", "ar", "hr", "fr", "es"] },
    { title: "Institutions, justice et libertés",
      text: "Freedom House, RSF, Transparency International, V-Dem : ce que mesurent les indices indépendants.",
      ids: ["hu", "pl", "in", "us", "sk"] },
    { title: "Migrations et sécurité",
      text: "Arrivées par mer, violence armée, politiques d’asile et de sécurité.",
      ids: ["it", "se", "nl", "fi", "il"] },
    { title: "Environnement et société",
      text: "Amazonie, natalité, politique familiale, pauvreté des enfants.",
      ids: ["br", "hu", "pl"] },
    { placeholder: true,
      title: "Nouvelle thématique : emplacement réservé",
      text: "Ajouter une entrée dans la liste « themes » de assets/js/site-config.js." }
  ],

  footer: {
    about: "Plateforme d’information et d’analyse des politiques publiques. Elle compare les expériences internationales et confronte les discours politiques aux résultats observés.",
    method: "Chaque chiffre est présenté avec son niveau de fiabilité : un point plein pour un chiffre lu dans une source consultée, un point creux pour une estimation à confirmer. Les indices sont des perceptions d’experts, pas des faits comptables.",
    sources: "Chaque fiche pays liste ses sources en bas de page. Les prévisions de la Commission européenne datent de mai 2026.",
    sourcesSlot: "Page de sources consolidée : à venir.",
    legal: "Mentions légales : à compléter avant diffusion large.",
    identity: "Nom et identité graphique provisoires."
  }
};
