/* Vue d'ensemble d'une élection : dates, description, compteurs réels, accès aux rubriques. Données : Supabase. */
(function () {
  const $ = id => document.getElementById(id), e = esc, mount = $("e-main");
  const kv = rows => { const r = rows.filter(x => x[1]); return r.length ? `<dl class="kv">${r.map(x => `<dt>${e(x[0])}</dt><dd>${e(x[1])}</dd>`).join("")}</dl>` : ""; };
  const plural = (n, s, p) => `${n} ${n > 1 ? p : s}`;

  Election.need(mount).then(el => {
    if (!el) return;
    const st = Election.status(el);
    document.title = Election.name(el) + " · Au résultat";
    $("p-title").textContent = Election.name(el);
    $("p-label").textContent = "Vue d’ensemble · " + st.label;
    $("p-lede").textContent = el.description || "Candidatures, programmes, thématiques, comparateur et indicateurs de cette élection.";
    UI.mount(mount, async () => ({ cands: await DB.candidacies(el.id), progs: await DB.programs(el.id) }), d => {
      const nm = d.progs.reduce((n, p) => n + (p.program_versions || []).reduce((k, v) => k + (v.measures || []).length, 0), 0);
      const sections = [
        ["candidats", "Candidats", d.cands.length ? plural(d.cands.length, "candidature publiée", "candidatures publiées") : "Aucune candidature publiée pour l’instant"],
        ["programmes", "Programmes", d.progs.length ? plural(d.progs.length, "programme publié", "programmes publiés") : "Aucun programme publié pour l’instant"],
        ["thematiques", "Thématiques", nm ? plural(nm, "mesure publiée", "mesures publiées") : "Aucune mesure publiée pour l’instant"],
        ["comparateur", "Comparateur", "Comparer les mesures de candidats différents"],
        ["indicateurs", "Indicateurs", "Données et sources du pays"]];
      const hrefs = { candidats: "candidats.html", programmes: "programmes.html", thematiques: "thematiques.html", comparateur: "comparateur.html", indicateurs: "indicateurs.html" };
      return `<div class="p-grid">${sections.map(s => `<a class="p-cell" href="${hrefs[s[0]]}"><span class="tag">${e(s[1])}</span><h3>${e(s[2])}</h3></a>`).join("")}</div>
        <h2 class="ov-h">Calendrier</h2>
        ${kv([["Pays", el.countries && el.countries.name], ["Type de scrutin", UI.humanize(el.election_type)], ["Année", el.year],
          ["Date du scrutin", UI.date(el.scheduled_date)], ["Date effective", UI.date(el.actual_date)], ["Second tour", UI.date(el.second_round_date)],
          ["Date limite des parrainages", UI.date(el.sponsorship_deadline)], ["Situation", st.label]]) || `<p class="p-sub quiet">Calendrier non renseigné.</p>`}`;
    }, { loading: "Chargement de l’élection…", isEmpty: () => false });
  });
})();
