/* Page « Les candidats » : candidatures publiées de l'élection par défaut (Supabase). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const card = c => {
    const name = UI.person(c.people) || "Candidature";
    const party = c.parties ? (c.parties.name + (c.parties.acronym ? ` (${c.parties.acronym})` : "")) : "";
    return `<a class="cand"${UI.partyColor(c.parties) ? ` style="--pc:${UI.partyColor(c.parties)}"` : ""} href="candidat.html#${encodeURIComponent(c.id)}">${UI.avatar(c.people)}
      <div>${UI.statusBadge("cand", c.candidacy_status)}
      <h3>${e(name)}</h3><p>${UI.partyDot(c.parties)}${party ? e(party) : '<span class="quiet">Parti non renseigné</span>'}</p>
      ${c.updated_at ? `<p>Actualisé le ${e(UI.date(c.updated_at))}</p>` : ""}
      ${UI.reliability(c.reliability_level)}</div></a>`;
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
    return `<p class="rk-note">Les candidatures sont présentées dans l’ordre établi par la rédaction. Le statut de chaque candidature est indiqué sur sa fiche : une fiche publiée ne signifie pas qu’une candidature est officiellement déclarée.</p>
      <div class="cand-grid">${d.list.map(card).join("")}</div>`;
  }, {
    loading: "Chargement des candidatures…",
    isEmpty: d => !d.list.length,
    empty: "<p><b>Aucune candidature n’est publiée pour cette élection pour l’instant.</b></p><p style=\"margin-top:8px\">Une candidature n’apparaît ici qu’après vérification de ses sources officielles. Visibilité médiatique et candidature officielle ne sont jamais confondues.</p>"
  }); });
  const lg = $("c-legend"); if (lg) lg.innerHTML = UI.reliabilityLegend();
})();
