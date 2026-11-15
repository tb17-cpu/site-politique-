/* Vue d'ensemble d'une élection : dates, description, compteurs réels, accès aux rubriques. Données : Supabase. */
(function () {
  const $ = id => document.getElementById(id), e = esc, mount = $("e-main");
  const kv = rows => { const r = rows.filter(x => x[1]); return r.length ? `<dl class="kv">${r.map(x => `<dt>${e(x[0])}</dt><dd>${e(x[1])}</dd>`).join("")}</dl>` : ""; };
  const plural = (n, s, p) => `${n} ${n > 1 ? p : s}`;

  const pname = x => [x.first_name, x.last_name].filter(Boolean).join(" ");
  const who = r => {
    if (r.entity_kind === "candidacy") { const c = r.candidacies, pt = c.people ? pname(c.people) : "", party = c.parties && c.parties.name;
      return `<b>${e(pt)}</b>${party ? ` <small>${e(party)}</small>` : ""} <small class="quiet">${e(UI.formatCandidacyStatus(c.candidacy_status) || "")}</small>`; }
    if (r.entity_kind === "party") return `<b>${e(r.parties.name)}</b>`;
    if (r.entity_kind === "person") return `<b>${e(pname(r.people))}</b> <small class="quiet">Personnalité, sans candidature enregistrée</small>`;
    return `<b>${e(r.entity_label)}</b> <small class="quiet">Sans candidature ni parti enregistré</small>`;
  };
  /* Sondages : le classement est calculé ici (pourcentage décroissant), jamais stocké. Un bloc par photographie la plus récente,
     par type (sondage / moyenne), institut et scénario : des mesures de natures différentes ne sont jamais fusionnées. */
  const pollBlock = P => {
    if (P.missing || !P.rows.length) return "";
    const snap = P.rows[0].snapshot_date, cur = P.rows.filter(r => r.snapshot_date === snap), groups = new Map();
    cur.forEach(r => { const k = [r.record_kind, r.pollster, r.scenario, r.poll_date].join("|"); (groups.get(k) || groups.set(k, []).get(k)).push(r); });
    const blocks = [...groups.values()].sort((a, b) => (a[0].record_kind === "average" ? 0 : 1) - (b[0].record_kind === "average" ? 0 : 1)).map(g => {
      const r0 = g[0], list = g.slice().sort((a, b) => b.value_percent - a.value_percent), src = r0.sources;
      return `<section class="poll"><h3>${r0.record_kind === "average" ? "Moyenne de sondages" : "Sondage"}${r0.pollster ? " · " + e(r0.pollster) : ""}</h3>
        <p class="quiet">${[r0.scenario, r0.poll_date ? "Date : " + UI.date(r0.poll_date) : "", r0.sample_size ? "Échantillon : " + r0.sample_size : ""].filter(Boolean).map(e).join(" · ")}</p>
        <ol class="poll-list">${list.map(r => `<li><span class="poll-v">${e(Number(r.value_percent).toFixed(1).replace(".", ","))} %</span> ${who(r)}</li>`).join("")}</ol>
        ${r0.methodology || r0.aggregation_note ? `<p class="quiet">${e([r0.methodology, r0.aggregation_note].filter(Boolean).join(" — "))}</p>` : ""}
        ${src ? `<p class="quiet">Source : ${UI.link(src.url, src.title) || e(src.title)}</p>` : ""}</section>`; }).join("");
    return `<h2 class="ov-h">Tendances agrégées — photographie du ${e(UI.date(snap))}</h2>
      <p class="quiet">Photographie éditoriale datée, mise à jour manuellement : ce n’est ni un classement permanent, ni une donnée en temps réel. Un sondage n’est ni une candidature officielle ni un résultat électoral. Classement complet des candidats : <a href="candidats.html">page Candidats</a>.</p>${blocks}`;
  };

  Election.need(mount).then(el => {
    if (!el) return;
    const st = Election.status(el);
    document.title = Election.name(el) + " · Au résultat";
    $("p-title").textContent = Election.name(el);
    $("p-label").textContent = "Vue d’ensemble · " + st.label;
    $("p-lede").textContent = el.description || "Candidatures, programmes, thématiques, comparateur et indicateurs de cette élection.";
    UI.mount(mount, async () => ({ cands: await DB.candidacies(el.id), progs: await DB.programs(el.id), polls: await DB.polls(el.id).catch(() => ({ missing: true, rows: [] })) }), d => {
      const nm = d.progs.reduce((n, p) => n + (p.program_versions || []).reduce((k, v) => k + (v.measures || []).length, 0), 0);
      const sections = [
        ["candidats", "Candidats", d.cands.length ? plural(d.cands.length, "candidature publiée", "candidatures publiées") : "Aucune candidature publiée pour l’instant"],
        ["programmes", "Programmes", d.progs.length ? plural(d.progs.length, "programme publié", "programmes publiés") : "Aucun programme publié pour l’instant"],
        ["thematiques", "Thématiques", nm ? plural(nm, "mesure publiée", "mesures publiées") : "Aucune mesure publiée pour l’instant"],
        ["comparateur", "Comparateur", "Comparer les mesures de candidats différents"],
        ["indicateurs", "Indicateurs", "Données et sources du pays"]];
      const hrefs = { candidats: "candidats.html", programmes: "programmes.html", thematiques: "thematiques.html", comparateur: "comparateur.html", indicateurs: "indicateurs.html" };
      return `<div class="p-grid">${sections.map(s => `<a class="p-cell" href="${hrefs[s[0]]}"><span class="tag">${e(s[1])}</span><h3>${e(s[2])}</h3></a>`).join("")}</div>
        ${pollBlock(d.polls)}
        <h2 class="ov-h">Calendrier</h2>
        ${kv([["Pays", el.countries && el.countries.name], ["Type de scrutin", UI.humanize(el.election_type)], ["Année", el.year],
          ["Date du scrutin", UI.date(el.scheduled_date)], ["Date effective", UI.date(el.actual_date)], ["Second tour", UI.date(el.second_round_date)],
          ["Date limite des parrainages", UI.date(el.sponsorship_deadline)], ["Situation", st.label]]) || `<p class="p-sub quiet">Calendrier non renseigné.</p>`}`;
    }, { loading: "Chargement de l’élection…", isEmpty: () => false });
  });
})();
