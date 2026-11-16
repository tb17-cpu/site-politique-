/* Page « Les candidats » : candidatures publiées de l'élection par défaut (Supabase). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const card = c => {
    const name = UI.person(c.people) || "Candidature";
    const party = c.parties ? (c.parties.name + (c.parties.acronym ? ` (${c.parties.acronym})` : "")) : "";
    return `<a class="cand"${UI.partyColor(c.parties) ? ` style="--pc:${UI.partyColor(c.parties)}"` : ""} href="candidat.html#${encodeURIComponent(c.id)}">${UI.avatar(c.people)}
      <div>${UI.statusBadge("cand", c.candidacy_status)}
      <h3>${e(name)}</h3><p>${UI.partyDot(c.parties)}${party ? e(party) : '<span class="quiet">Parti non renseigné</span>'}${UI.positionBlock(c)}</p></div></a>`;
  };
  /* Ordre éditorial : candidacies.display_order (saisi dans Supabase), strictement respecté. Les lignes sans ordre
     viennent après les lignes ordonnées ; à ordre égal, ordre alphabétique stable. Aucun calcul à partir des sondages. */
  const byOrder = (a, b) => {
    const x = a.display_order == null ? Infinity : Number(a.display_order), y = b.display_order == null ? Infinity : Number(b.display_order);
    return x === y ? (UI.person(a.people) || "").localeCompare(UI.person(b.people) || "", "fr") : x - y;
  };
  const mount = $("c-list");
  Election.need(mount).then(el => { if (!el) return;
  if ($("c-election")) $("c-election").textContent = Election.name(el);
  UI.mount(mount, async () => ({ election: el, list: (await DB.candidacies(el.id)).slice().sort(byOrder) }), d => {
    return `<div class="cand-grid">${d.list.map(card).join("")}</div>`;
  }, {
    loading: "Chargement des candidatures…",
    isEmpty: d => !d.list.length,
    empty: "<p><b>Aucune candidature n’est enregistrée pour cette élection.</b></p>"
  }); });
})();
