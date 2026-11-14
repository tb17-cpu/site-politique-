/* ==========================================================================
   INDICATEURS : domaines couverts et indicateurs publiés
   Un indicateur n’est publié que s’il a une définition, une unité, une source et une date.
   Format : { id, domain, name, definition, unit, source:{label,url}, asOf:"AAAA-MM-JJ", values:[{ place, period, value }] }
   La liste INDICATORS est vide à ce stade : les premiers chiffres disponibles sont ceux des
   dossiers internationaux (voir indicateurs.js), affichés avec leur propre mention de fiabilité.
   ========================================================================== */
const INDIC_DOMAINS = [
  { id: "eco", title: "Économie et finances publiques", ex: "croissance, dette, déficit, prélèvements" },
  { id: "emploi", title: "Emploi et chômage", ex: "taux d’emploi, chômage, durée du travail" },
  { id: "niveau-vie", title: "Pouvoir d’achat et niveau de vie", ex: "revenus, inflation, pauvreté" },
  { id: "education", title: "Éducation et résultats scolaires", ex: "acquis des élèves, diplômes, dépense par élève" },
  { id: "sante", title: "Santé et accès aux soins", ex: "espérance de vie, densité médicale, délais" },
  { id: "securite", title: "Sécurité et criminalité", ex: "faits constatés, victimation, homicides" },
  { id: "justice", title: "Justice", ex: "délais, population carcérale, moyens" },
  { id: "immigration", title: "Immigration", ex: "titres de séjour, asile, flux" },
  { id: "energie", title: "Énergie", ex: "production, mix, prix, dépendance" },
  { id: "environnement", title: "Environnement et émissions", ex: "émissions de gaz à effet de serre, biodiversité" },
  { id: "industrie", title: "Industrie et production", ex: "valeur ajoutée, emploi industriel, balance commerciale" },
  { id: "agriculture", title: "Agriculture", ex: "exploitations, revenus, production" },
  { id: "services", title: "Services publics", ex: "effectifs, accessibilité, satisfaction" },
  { id: "demographie", title: "Démographie", ex: "natalité, vieillissement, solde migratoire" },
  { id: "libertes", title: "Libertés et institutions", ex: "Freedom House, RSF, Transparency International", live: true }
];
const INDICATORS = [];
