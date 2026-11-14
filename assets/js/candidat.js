/* Fiche d’un candidat (candidat.html#identifiant) ; sans identifiant valide : modèle vide. */
(function () {
  const $ = id => document.getElementById(id);
  const render = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const c = CANDIDATES.find(x => x.id === id);
    if (c) {
      const st = CANDIDACY_STATUS.find(s => s.id === c.status);
      $("f-name").textContent = c.name;
      $("f-lede").textContent = [c.party, st && st.label].filter(Boolean).join(" · ");
      document.title = c.name + " · Au résultat";
    } else {
      $("f-name").textContent = "Modèle de fiche";
      $("f-lede").textContent = id
        ? "Aucun candidat enregistré ne correspond à cet identifiant. Voici la structure commune à toutes les fiches."
        : "Structure commune à toutes les fiches. Elle se remplit à partir de la liste des candidats : ajouter un candidat suffit à créer sa fiche.";
    }
    $("f-body").innerHTML = renderFiche(c || null);
  };
  render();
  window.addEventListener("hashchange", render);
})();
