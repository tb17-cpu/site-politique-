/* Connexion Supabase (lecture seule).
   La clé « publishable » est publique par conception : elle peut figurer dans le code.
   Ne jamais mettre ici une clé « service_role », une clé secrète ou un identifiant administrateur.
   Les contenus visibles sont ceux que les politiques RLS autorisent (publication_status). */
window.SUPABASE_CONFIG = {
  url: "https://yucpwplvgbpixdkbkboh.supabase.co",
  key: "sb_publishable_3I-XQ_VcOQxp--dGPVZGbQ_uA9HiJZi",
  timeoutMs: 12000,
  /* Résultats électoraux (migration 005). Mettre false AVANT l'application de la migration pour désactiver explicitement la rubrique (aucune requête, aucun
     message) ; true (défaut) : la table est attendue. Une table introuvable dans le cache de schéma PostgREST (PGRST205) est alors signalée comme
     problème, jamais traitée comme une absence certaine. */
  electionResults: true
};
