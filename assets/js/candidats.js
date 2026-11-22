/* Page « Les candidats » : candidatures publiées de l'élection par défaut (Supabase). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  /* Pastille de statut : strictement Scrutin.status (même logique que la fiche et la carte de statut). Rien à afficher -> aucune pastille. */
  const badge = (c, R) => { const st = R && R.error ? UI.closedStage(c) && Object.assign({ provisional: false }, UI.closedStage(c)) : Scrutin.status(c, R);
    return st ? `<span class="statut${st.provisional ? " statut--prov" : ""}">${e(st.label)}</span>` : ""; };
  const card = (c, R) => {
    const name = UI.person(c.people) || "Candidature";
    const party = c.parties ? (c.parties.name + (c.parties.acronym ? ` (${c.parties.acronym})` : "")) : "";
    const meta = (c.parties ? UI.partyDot(c.parties) + e(party) : "") + UI.positionBlock(c);   /* rien à dire : aucune ligne, aucun « non renseigné » */
    return `<a class="cand" style="--pc:${UI.candidacyColor(c)}" href="candidat.html#${encodeURIComponent(c.id)}">${UI.avatar(c.people)}
      <div>${badge(c, R)}
      <h3>${e(name)}</h3>${meta ? `<p>${meta}</p>` : ""}</div></a>`;
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
  UI.mount(mount, async () => ({ election: el, list: (await DB.candidacies(el.id)).slice().sort(byOrder), results: await DB.settle(DB.results(el.id), { rounds: [] }, "Résultats") }), d => {
    return (d.results.error ? UI.loadNotice("results", d.results.error) : "") + `<div class="cand-grid">${d.list.map(c => card(c, d.results)).join("")}</div>`;
  }, {
    loading: "Chargement des candidatures…",
    isEmpty: d => !d.list.length,
    empty: "<p><b>Aucune candidature n’est enregistrée pour cette élection.</b></p>"
  }); });
})();
