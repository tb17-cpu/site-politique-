/* Fiche détaillée d'une candidature (candidat.html#identifiant). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const kv = rows => `<dl class="kv">${rows.filter(r => r[1] !== "" && r[1] != null).map(r => `<dt>${e(r[0])}</dt><dd>${r[2] ? r[1] : e(r[1])}</dd>`).join("")}</dl>`;

  /* Statuts de formalisation (DB.formalizations), chargés avec la page ; vide si indisponibles. */
  let F = new Map();
  const render = c => {
    const name = UI.person(c.people) || "Candidature";
    document.title = name + " · Au résultat";
    $("f-name").textContent = name;
    $("f-lede").textContent = [c.parties && c.parties.name, c.elections && c.elections.name].filter(Boolean).join(" · ");
    const p = c.people || {}, pt = c.parties;
    const has = v => v !== "" && v != null;
    const sponsorBlock = () => {
      const t = c.candidacy_sponsorship_territories || [];
      const any = [c.sponsorship_status, c.sponsorship_count_claimed, c.sponsorship_count_official, c.sponsorship_last_checked_at, c.sponsorship_notes].some(has) || t.length;
      let x = `<section class="blk"><header><b>Parrainages</b><span>Chiffres annoncés par la candidature et chiffres constatés officiellement</span></header><div>`;
      if (!any) return x + `<p class="p-sub quiet">Aucune information de parrainage disponible.</p></div></section>`;
      if (has(c.sponsorship_status)) x += `<p class="sp-status">Statut : ${UI.statusText("spons", c.sponsorship_status)}</p>`;
      x += `<div class="sp-grid">
        <div class="sp sp--claim"><span class="label">Annoncés par la candidature</span><strong>${has(c.sponsorship_count_claimed) ? e(c.sponsorship_count_claimed) : "—"}</strong><small>Déclaratif, non validé</small></div>
        <div class="sp sp--off"><span class="label">Constatés officiellement</span><strong>${has(c.sponsorship_count_official) ? e(c.sponsorship_count_official) : "—"}</strong><small>${has(c.sponsorship_count_official) ? "Source officielle" : "Aucun décompte officiel"}</small></div></div>`;
      x += kv([["Dernière vérification", UI.date(c.sponsorship_last_checked_at)], ["Notes", c.sponsorship_notes]]);
      if (t.length) x += `<h4 class="label sub-h">Par territoire</h4><div class="scroll"><table class="obs"><thead><tr><th scope="col">Territoire</th><th scope="col">Annoncés</th><th scope="col">Officiels</th><th scope="col">Vérifié le</th><th scope="col">Fiabilité</th></tr></thead><tbody>${
        t.map(r => `<tr><td>${e(r.territory_name || r.territory_code || "")}</td><td>${e(r.sponsorship_count_reported ?? "—")}</td><td>${e(r.sponsorship_count_official ?? "—")}</td><td>${e(UI.date(r.checked_at) || "—")}</td><td>${UI.reliability(r.reliability_level, { notes: r.notes })}</td></tr>`).join("")}</tbody></table></div>`;
      return x + `</div></section>`;
    };
    /* Accès au second tour : n'apparaît que lorsque la candidature est qualifiée (aucune mention avant le premier tour). */
    const qualified = String(c.second_round_status || "").toLowerCase() === "qualified" || has(c.second_round_qualified_at);
    const second = qualified ? "Qualifié pour le second tour" + (c.second_round_qualified_at ? ` (${e(UI.date(c.second_round_qualified_at))})` : "") : "";
    let h = `<section class="blk blk--party"${UI.partyColor(pt) ? ` style="--pc:${UI.partyColor(pt)}"` : ""}><header><b>Candidature</b></header><div>
      <div class="fiche-head">${UI.avatar(c.people, true)}<div>${UI.statusBadge("cand", c.candidacy_status)}${pt ? `<p class="fh-party">${UI.partyDot(pt)}${e(pt.name + (pt.acronym ? ` (${pt.acronym})` : ""))}${UI.positionBlock(c)}</p>` : ""}</div></div>
      ${kv([
        ["Candidature annoncée le", UI.date(c.announcement_date)],
        ["Site officiel", UI.safeUrl(p.official_website) ? UI.link(p.official_website, p.official_website) : "", true],
        ["Second tour", second, true]
      ])}
      ${c.description ? `<p class="long desc">${e(c.description)}</p>` : ""}
      ${p.biography ? `<h3 class="h-h3 sub-h">Biographie</h3><p class="long desc">${e(p.biography)}</p>` : ""}
    </div></section>` + sponsorBlock();

    const progs = c.programs || [], seen = [];
    const progHtml = 
      (progs.length ? progs.map(pg => {
        const vs = (pg.program_versions || []).slice().sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
        return `<h3 class="h-h3" style="margin:14px 0 4px">${e(pg.title || "Programme")}</h3>${pg.description ? `<p style="color:var(--fg-2)">${e(pg.description)}</p>` : ""}` +
          (vs.length ? vs.map(v => {
            const ms = (v.measures || []).slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || String(a.title || "").localeCompare(String(b.title || ""), "fr") || String(a.id).localeCompare(String(b.id)));
            const item = m => `<li><a class="t" href="mesure.html#${encodeURIComponent(m.id)}">${e(m.title)}</a>${UI.formalization(F.get(String(m.id)))}</li>`;
            /* Regroupement par thème, FIXE et indépendant de l'ordre renvoyé par la base : une mesure rattachée à plusieurs thèmes va dans
               le thème de plus petit (display_order, nom, id) ; les groupes sont classés dans ce même ordre ; « Autres propositions » en dernier.
               À l'intérieur d'un groupe, les mesures gardent leur ordre d'affichage (display_order, puis titre, puis id). */
            const num = v => (typeof v === "number" && isFinite(v)) ? v : Infinity;
            const cmpTh = (x, y) => (num(x.display_order) - num(y.display_order) || 0) || String(x.name || "").localeCompare(String(y.name || ""), "fr") || String(x.id || "").localeCompare(String(y.id || ""));
            const themeOf = m => { const t = (m.measure_themes || []).map(x => x && x.themes).filter(t => t && t.name).sort(cmpTh)[0]; return t || null; };
            const groups = [], idx = new Map();
            ms.forEach(m => { const t = themeOf(m), k = t ? String(t.id || t.name) : ""; if (!idx.has(k)) { idx.set(k, groups.length); groups.push({ k, t, list: [] }); } groups[idx.get(k)].list.push(m); });
            groups.sort((x, y) => (x.t === null) - (y.t === null) || (x.t && y.t ? cmpTh(x.t, y.t) : 0));
            groups.forEach(g => { g.name = g.t ? g.t.name : ""; });
            const grouped = groups.length > 1 || (groups.length === 1 && groups[0].k !== "");
            const used = ms.map(m => F.get(String(m.id))).filter(Boolean).map(f => f.status);
            seen.push(...used);
            const body = !ms.length ? `<p class="p-sub" style="margin:6px 0">Aucune mesure publiée pour cette version.</p>`
              : grouped ? groups.map(g => `<section class="m-group"><h4>${e(g.name || "Autres propositions")}<small>${g.list.length} ${g.list.length > 1 ? "positions" : "position"}</small></h4><ul class="mlist">${g.list.map(item).join("")}</ul></section>`).join("")
              : `<ul class="mlist">${ms.map(item).join("")}</ul>`;
            return `<h4 class="label" style="margin:16px 0 4px">${[v.version_label && !/^v?\d+$/i.test(String(v.version_label)) ? e(v.version_label) : "", v.publication_date ? e(UI.date(v.publication_date)) : ""].filter(Boolean).join(" · ") || "Propositions"}</h4>${body}`;
          }).join("") : `<p class="p-sub">Aucune proposition détaillée.</p>`);
      }).join("") : `<p class="p-sub" style="margin-top:12px">Aucun programme n’est rattaché à cette candidature.</p>`);
    h += `<section class="blk"><header><b>Programme</b><span>Documents programmatiques et propositions</span></header><div>${UI.formalizationLegend(seen)}${progHtml}</div></section>`;

    const cs = c.candidacy_sources || [];
    h += `<section class="blk"><header><b>Sources justificatives</b><span>Documents de référence</span></header><div>` +
      (cs.length ? `<ul class="refs">${cs.map(s => `<li>${s.sources ? UI.link(s.sources.url, s.sources.title) || e(s.sources.title) : "Source"}
        <small>${[s.sources && s.sources.publisher, s.sources && s.sources.source_type && UI.formatSourceType(s.sources.source_type), s.relation_type && UI.formatSourceLink(s.relation_type), UI.date(s.evidence_date || (s.sources && s.sources.publication_date))].filter(Boolean).map(e).join(" · ")}</small>
        ${s.evidence_excerpt ? `<small>« ${e(s.evidence_excerpt)} »</small>` : ""}${s.notes ? `<small>${e(s.notes)}</small>` : ""}
        <small>${UI.reliability(s.reliability_level)}</small></li>`).join("")}</ul>` : `<p class="p-sub" style="margin-top:12px">Aucune source disponible pour cette candidature.</p>`) + `</div></section>`;
    return h;
  };

  const run = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) { $("f-name").textContent = "Fiche candidat"; $("f-lede").textContent = ""; $("f-body").innerHTML = UI.emptyHtml("Aucune candidature sélectionnée. <a href=\"candidats.html\">Voir la liste des candidats</a>."); return; }
    F = new Map();
    UI.mount($("f-body"), async () => { const c = await DB.candidacy(id); if (c) Election.use(c.election_id); F = await DB.formalizations(); return c; }, render, { loading: "Chargement de la fiche…", empty: "Cette candidature n’existe pas ou n’est pas publiée. <a href=\"candidats.html\">Voir la liste des candidats</a>." });
  };
  run();
  window.addEventListener("hashchange", run);
})();
