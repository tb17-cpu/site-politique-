/* ==========================================================================
   CLASSIFICATION THÉMATIQUE (première base, non définitive)
   Une famille = une grande politique publique ; « subs » = ses sous-thèmes.
   « ids » = fiches pays des analyses internationales qui éclairent la famille
   (voir data-analyses.js). Une liste vide signifie : pas encore de dossier lié.
   La même classification doit pouvoir servir à d’autres pays : elle ne contient
   aucune référence à la France.
   Pour modifier : ajouter, retirer ou renommer une entrée ; les pages se mettent à jour seules.
   ========================================================================== */
const THEMES = [
  { id: "economie", title: "Économie et finances",
    subs: ["Fiscalité", "Dépenses publiques", "Dette et déficit", "Politique monétaire et financière", "Entreprises et compétitivité", "Pouvoir d’achat", "Commerce extérieur"],
    ids: ["pl", "in", "ar", "hr", "fr", "es"] },
  { id: "travail", title: "Travail et protection sociale",
    subs: ["Emploi et chômage", "Salaires", "Retraites", "Assurance chômage", "Prestations sociales", "Conditions de travail", "Formation professionnelle"],
    ids: ["hu", "pl"] },
  { id: "immigration", title: "Immigration et intégration",
    subs: ["Immigration légale", "Immigration irrégulière", "Asile", "Naturalisation", "Intégration", "Politique migratoire européenne"],
    ids: ["it", "se", "nl", "fi", "il"] },
  { id: "securite", title: "Sécurité et justice",
    subs: ["Police et gendarmerie", "Justice et prisons", "Délinquance", "Criminalité organisée", "Terrorisme", "Sécurité civile"],
    ids: ["se"] },
  { id: "education", title: "Éducation et recherche",
    subs: ["École primaire et secondaire", "Enseignement supérieur", "Formation professionnelle", "Recherche et innovation", "Niveau scolaire et résultats éducatifs"],
    ids: [] },
  { id: "sante", title: "Santé et services publics",
    subs: ["Hôpital", "Médecine de ville", "Accès aux soins", "Déserts médicaux", "Organisation des services publics", "Fonction publique", "Décentralisation et collectivités territoriales"],
    ids: [] },
  { id: "industrie", title: "Industrie et production",
    subs: ["Réindustrialisation", "Politique industrielle", "Innovation", "Relocalisation", "Agriculture", "Souveraineté productive", "Commerce international"],
    ids: [] },
  { id: "energie", title: "Énergie et environnement",
    subs: ["Électricité", "Nucléaire", "Énergies renouvelables", "Hydrocarbures", "Mix énergétique", "Réseaux et infrastructures", "Émissions de CO2", "Biodiversité", "Politique environnementale"],
    ids: ["br"] },
  { id: "logement", title: "Logement et aménagement",
    subs: ["Construction", "Logement social", "Accès à la propriété", "Urbanisme", "Transports", "Aménagement du territoire"],
    ids: [] },
  { id: "institutions", title: "Institutions et souveraineté",
    subs: ["Constitution", "Organisation de l’État", "Fonctionnement démocratique", "Décentralisation", "Union européenne", "Souveraineté nationale"],
    ids: ["hu", "pl", "in", "us", "sk"] },
  { id: "defense", title: "Défense et politique étrangère",
    subs: ["Défense nationale", "Budget militaire", "Industrie de défense", "Diplomatie", "Relations internationales", "Alliances et coopération"],
    ids: [] }
];
