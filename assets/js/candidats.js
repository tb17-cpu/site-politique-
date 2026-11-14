/* Page « Les candidats » : candidatures publiées de l'élection par défaut (Supabase). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const card = c => {
    const name = UI.person(c.people) || "Candidature";
    const party = c.parties ? (c.parties.name + (c.parties.acronym ? ` (${c.parties.acronym})` : "")) : "";
    return `<a class="cand" href="candidat.html#${encodeURIComponent(c.id)}">${UI.avatar(c.people)}
      <div><span class="statut">${e(UI.humanize(c.candidacy_status))}</span>
      <h3>${e(name)}</h3><p>${e(party)}</p>${c.updated_at ? `<p>Actualisé le ${e(UI.date(c.updated_at))}</p>` : ""}
      ${UI.reliability(c.reliability_level)}</div></a>`;
  };
  UI.mount($("c-list"), async () => {
    const el = await DB.election();
    return { election: el, list: el ? await DB.candidacies(el.id) : [] };
  }, d => {
    if (d.election && $("c-election")) $("c-election").textContent = d.election.name;
    const groups = [...new Set(d.list.map(c => c.candidacy_status || ""))];
    return groups.map(g => `<h3 class="h-h3" style="font-size:21px;margin:24px 0 10px">${e(UI.humanize(g) || "Statut non précisé")}</h3>
      <div class="cand-grid">${d.list.filter(c => (c.candidacy_status || "") === g).map(card).join("")}</div>`).join("");
  }, {
    loading: "Chargement des candidatures…",
    isEmpty: d => !d.list.length,
    empty: "<p><b>Aucune candidature n’est publiée pour l’instant.</b></p><p style=\"margin-top:8px\">Une candidature n’apparaît ici qu’après vérification de ses sources officielles. Visibilité médiatique et candidature officielle ne sont jamais confondues.</p>"
  });
  const lg = $("c-legend"); if (lg) lg.innerHTML = UI.reliabilityLegend();
})();
