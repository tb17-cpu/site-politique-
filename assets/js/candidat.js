/* Fiche détaillée d'une candidature (candidat.html#identifiant). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const kv = rows => `<dl class="kv">${rows.filter(r => r[1] !== "" && r[1] != null).map(r => `<dt>${e(r[0])}</dt><dd>${r[2] ? r[1] : UI.rich(r[1])}</dd>`).join("")}</dl>`;

  /* Statuts de formalisation (DB.formalizations), chargés avec la page ; vide si indisponibles. */
  let F = new Map();
  const render = c => {
    const name = UI.person(c.people) || "Candidature";
    document.title = name + " · Au résultat";
    $("f-name").textContent = name;
    $("f-lede").textContent = [c.parties && c.parties.name, c.elections && c.elections.name].filter(Boolean).join(" · ");
    /* Le nom et le parti figurent dans l'en-tête de la fiche (à gauche) : l'en-tête générique de la page est masqué. */
    const ph = document.querySelector(".p-head"); if (ph) ph.hidden = true;
    const p = c.people || {}, pt = c.parties;
    const has = v => v !== "" && v != null;
    /* ---- Programmes : groupes par thème (déterministe), cartes, panneau de synthèse ---- */
    const progs = c.programs || [], seen = [], themeKeys = new Set(); let nMeasures = 0, lastPub = "", gid = 0;
    const item = m => `<li><a class="mcard" href="mesure.html#${encodeURIComponent(m.id)}"><b>${e(m.title)}</b>${UI.formalization(F.get(String(m.id)), { short: true })}</a></li>`;
    const progHtml =
      (progs.length ? progs.map(pg => {
        const vs = (pg.program_versions || []).slice().sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
        return `${progs.length > 1 ? `<h3 class="h-h3 m-vh">${e(pg.title || "Programme")}</h3>` : ""}` +
          (vs.length ? vs.map(v => {
            const ms = (v.measures || []).slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || String(a.title || "").localeCompare(String(b.title || ""), "fr") || String(a.id).localeCompare(String(b.id)));
            /* Regroupement par thème, FIXE et indépendant de l'ordre renvoyé par la base : une mesure rattachée à plusieurs thèmes va dans
               le thème de plus petit (display_order, nom, id) ; les groupes sont classés dans ce même ordre ; « Autres propositions » en dernier.
               À l'intérieur d'un groupe, les mesures gardent leur ordre d'affichage (display_order, puis titre, puis id). */
            const num = v => (typeof v === "number" && isFinite(v)) ? v : Infinity;
            const cmpTh = (x, y) => (num(x.display_order) - num(y.display_order) || 0) || String(x.name || "").localeCompare(String(y.name || ""), "fr") || String(x.id || "").localeCompare(String(y.id || ""));
            const themeOf = m => { const t = (m.measure_themes || []).map(x => x && x.themes).filter(t => t && t.name).sort(cmpTh)[0]; return t || null; };
            const groups = [], idx = new Map();
            ms.forEach(m => { const t = themeOf(m), k = t ? String(t.id || t.name) : ""; if (!idx.has(k)) { idx.set(k, groups.length); groups.push({ k, t, list: [] }); } groups[idx.get(k)].list.push(m); });
            groups.sort((x, y) => (x.t === null) - (y.t === null) || (x.t && y.t ? cmpTh(x.t, y.t) : 0));
            groups.forEach(g => { g.name = g.t ? g.t.name : ""; g.dom = "mg-" + (++gid); if (g.t && v === vs[0]) themeKeys.add(g.k); });
            const grouped = groups.length > 1 || (groups.length === 1 && groups[0].k !== "");
            if (v === vs[0]) { nMeasures += ms.length; if (v.publication_date && String(v.publication_date) > lastPub) lastPub = String(v.publication_date); }
            seen.push(...ms.map(m => F.get(String(m.id))).filter(Boolean).map(f => f.status));
            const nl = n => `${n} ${n > 1 ? "propositions" : "proposition"}`;
            const jump = grouped && groups.length > 1 ? `<nav class="m-jump" aria-label="Thèmes du programme">${groups.map(g => `<button type="button" data-jump="${g.dom}">${e(g.name || "Autres propositions")} <small>${g.list.length}</small></button>`).join("")}</nav>` : "";
            const body = !ms.length ? `<p class="p-sub">Aucune mesure publiée pour cette version.</p>`
              : grouped ? jump + groups.map(g => `<section class="m-group${g.t ? "" : " m-group--autres"}" id="${g.dom}"><h4>${e(g.name || "Autres propositions")}<small>${nl(g.list.length)}</small></h4><ul class="mlist">${g.list.map(item).join("")}</ul></section>`).join("")
              : `<ul class="mlist">${ms.map(item).join("")}</ul>`;
            const vh = [v.version_label && !/^v?\d+$/i.test(String(v.version_label)) ? e(v.version_label) : "", v.publication_date ? e(UI.date(v.publication_date)) : ""].filter(Boolean).join(" · ");
            return (vh || vs.length > 1 ? `<h4 class="label m-vh">${vh || "Propositions"}</h4>` : "") + body;
          }).join("") : `<p class="p-sub">Aucune proposition détaillée.</p>`);
      }).join("") : `<p class="p-sub">Aucun programme n’est rattaché à cette candidature.</p>`);

    const nThemes = themeKeys.size;
    const stat = (n, l, c) => `<div class="stat${c ? " " + c : ""}"><b>${n}</b><span>${e(l)}</span></div>`;
    const panel = progs.length ? `<aside class="prog-panel" aria-label="Programme"><p class="label">Programme</p>
        <h2>${progs.length === 1 ? e(progs[0].title || "Programme") : progs.length + " programmes"}</h2>
        <div class="stats">${nMeasures ? stat(nMeasures, nMeasures > 1 ? "propositions" : "proposition") : ""}${nThemes ? stat(nThemes, nThemes > 1 ? "thèmes" : "thème") : ""}${lastPub ? stat(e(UI.date(lastPub)), "dernière publication", "stat--date") : ""}</div>
        ${nMeasures ? `<button type="button" class="btn btn--primary" data-jump="programme">Parcourir le programme</button>` : ""}</aside>` : "";

    const facts = [
      UI.safeUrl(p.official_website) ? `<span>${UI.link(p.official_website, p.official_website)}</span>` : ""].filter(Boolean).join("");
    const stage = UI.candidacyStage(c);
    const stageCard = stage ? `<div class="status-card" role="status"><b>${e(stage.label)}</b>${stage.note ? `<small>${e(stage.note)}</small>` : ""}</div>` : "";
    let h = `<section class="cand-head${panel ? "" : " cand-head--solo"}" aria-label="Candidat">
      <div class="cand-id">${UI.avatar(c.people, true)}<div>
        <h1>${e(name)}</h1>
        ${pt ? `<p class="fh-party">${UI.partyDot(pt)}<span>${e(pt.name + (pt.acronym ? ` (${pt.acronym})` : ""))}</span>${UI.positionBlock(c)}</p>` : ""}
        ${stageCard}${facts ? `<div class="cand-facts">${facts}</div>` : ""}</div></div>${panel}</section>
      ${c.description ? `<div class="cand-bio">${UI.rich(c.description)}</div>` : ""}
      ${p.biography ? `<div class="cand-bio">${UI.rich(p.biography)}</div>` : ""}`;

    const counts = [nMeasures ? `${nMeasures} ${nMeasures > 1 ? "propositions" : "proposition"}` : "", nThemes ? `${nThemes} ${nThemes > 1 ? "thèmes" : "thème"}` : ""].filter(Boolean).join(" · ");
    h += `<section class="blk" id="programme"><header><b>Programme</b>${counts ? `<span>${counts}</span>` : ""}</header><div>${UI.formalizationLegend(seen)}${progHtml}</div></section>`;

    const cs = c.candidacy_sources || [];
    if (cs.length) h += `<section class="blk"><header><b>Sources justificatives</b><span>Documents de référence</span></header><div><details class="m-fold"><summary>Voir les sources (${cs.length})</summary><ul class="refs">${cs.map(s => `<li>${s.sources ? UI.link(s.sources.url, s.sources.title) || e(s.sources.title) : "Source"}
        <small>${[s.sources && s.sources.publisher, s.sources && s.sources.source_type && UI.formatSourceType(s.sources.source_type), s.relation_type && UI.formatSourceLink(s.relation_type), UI.date(s.evidence_date || (s.sources && s.sources.publication_date))].filter(Boolean).map(e).join(" · ")}</small>
        ${s.evidence_excerpt ? `<small>« ${e(s.evidence_excerpt)} »</small>` : ""}${s.notes ? `<small>${UI.richInline(s.notes)}</small>` : ""}</li>`).join("")}</ul></details></div></section>`;
    return h;
  };

  const run = () => {
    const ph = document.querySelector(".p-head"); if (ph) ph.hidden = false;
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) { $("f-name").textContent = "Fiche candidat"; $("f-lede").textContent = ""; $("f-body").innerHTML = UI.emptyHtml("Aucune candidature sélectionnée. <a href=\"candidats.html\">Voir la liste des candidats</a>."); return; }
    F = new Map();
    UI.mount($("f-body"), async () => { const c = await DB.candidacy(id); if (c) Election.use(c.election_id); F = await DB.formalizations(); return c; }, render, { loading: "Chargement de la fiche…", empty: "Cette candidature n’existe pas ou n’est pas publiée. <a href=\"candidats.html\">Voir la liste des candidats</a>." });
  };
  /* Raccourcis (thèmes, « Parcourir le programme ») : défilement par script, jamais par ancre : le fragment d'URL est l'identifiant de la candidature. */
  $("f-body").addEventListener("click", ev => {
    const b = ev.target.closest("[data-jump]"); if (!b) return;
    const t = document.getElementById(b.dataset.jump); if (!t) return;
    t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  run();
  window.addEventListener("hashchange", run);
})();
