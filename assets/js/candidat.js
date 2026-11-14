/* Fiche détaillée d'une candidature (candidat.html#identifiant). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const kv = rows => `<dl class="kv">${rows.filter(r => r[1] !== "" && r[1] != null).map(r => `<dt>${e(r[0])}</dt><dd>${r[2] ? r[1] : e(r[1])}</dd>`).join("")}</dl>`;

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
      let x = `<section class="blk"><header><b>Parrainages</b><span>Annoncés par la candidature et constatés officiellement : deux informations distinctes</span></header><div>`;
      if (!any) return x + `<p class="p-sub quiet">Aucune information de parrainage publiée pour l’instant.</p></div></section>`;
      if (has(c.sponsorship_status)) x += `<p class="sp-status">Statut : ${UI.statusText("spons", c.sponsorship_status)}</p>`;
      x += `<div class="sp-grid">
        <div class="sp sp--claim"><span class="label">Annoncés par la candidature</span><strong>${has(c.sponsorship_count_claimed) ? e(c.sponsorship_count_claimed) : "—"}</strong><small>Déclaratif, non validé</small></div>
        <div class="sp sp--off"><span class="label">Constatés officiellement</span><strong>${has(c.sponsorship_count_official) ? e(c.sponsorship_count_official) : "—"}</strong><small>${has(c.sponsorship_count_official) ? "Source officielle" : "Pas encore de décompte officiel publié"}</small></div></div>`;
      x += kv([["Dernière vérification", UI.date(c.sponsorship_last_checked_at)], ["Notes", c.sponsorship_notes]]);
      if (t.length) x += `<h4 class="label sub-h">Par territoire</h4><div class="scroll"><table class="obs"><thead><tr><th scope="col">Territoire</th><th scope="col">Annoncés</th><th scope="col">Officiels</th><th scope="col">Vérifié le</th><th scope="col">Fiabilité</th></tr></thead><tbody>${
        t.map(r => `<tr><td>${e(r.territory_name || r.territory_code || "")}</td><td>${e(r.sponsorship_count_reported ?? "—")}</td><td>${e(r.sponsorship_count_official ?? "—")}</td><td>${e(UI.date(r.checked_at) || "—")}</td><td>${UI.reliability(r.reliability_level, { notes: r.notes })}</td></tr>`).join("")}</tbody></table></div>`;
      return x + `</div></section>`;
    };
    const second = has(c.second_round_status) ? UI.statusText("second", c.second_round_status) + (c.second_round_qualified_at ? ` (${e(UI.date(c.second_round_qualified_at))})` : "") : "";
    let h = `<section class="blk"><header><b>Candidature</b><span>${UI.reliability(c.reliability_level, { notes: c.reliability_notes })}</span></header><div>
      <div class="fiche-head">${UI.avatar(c.people, true)}<div>${UI.statusBadge("cand", c.candidacy_status)}${pt ? `<p class="fh-party">${e(pt.name + (pt.acronym ? ` (${pt.acronym})` : ""))}</p>` : ""}</div></div>
      ${kv([
        ["Candidature annoncée le", UI.date(c.announcement_date)],
        ["Site officiel", UI.safeUrl(p.official_website) ? UI.link(p.official_website, p.official_website) : "", true],
        ["Accès au second tour", second, true],
        ["Dernière actualisation", UI.date(c.updated_at)]
      ])}
      ${c.description ? `<p class="long desc">${e(c.description)}</p>` : ""}
      ${p.biography ? `<h3 class="h-h3 sub-h">Biographie</h3><p class="long desc">${e(p.biography)}</p>` : ""}
    </div></section>` + sponsorBlock();

    const progs = c.programs || [];
    h += `<section class="blk"><header><b>Programme</b><span>Propositions publiées, par version du programme</span></header><div>` +
      (progs.length ? progs.map(pg => {
        const vs = (pg.program_versions || []).slice().sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
        return `<h3 class="h-h3" style="margin:14px 0 4px">${e(pg.title || "Programme")}</h3>${pg.description ? `<p style="color:var(--fg-2)">${e(pg.description)}</p>` : ""}` +
          (vs.length ? vs.map(v => {
            const ms = (v.measures || []).slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            return `<h4 class="label" style="margin:16px 0 4px">Version ${e(v.version_label || v.version_number || "")}${v.publication_date ? " · " + e(UI.date(v.publication_date)) : ""}</h4>
              ${v.change_summary ? `<p style="font-size:13.5px;color:var(--muted)">${e(v.change_summary)}</p>` : ""}
              ${ms.length ? `<ul class="mlist">${ms.map(m => `<li><a class="t" href="mesure.html#${encodeURIComponent(m.id)}">${e(m.title)}</a>${UI.reliability(m.reliability_level)}</li>`).join("")}</ul>` : `<p class="p-sub" style="margin:6px 0">Aucune mesure publiée pour cette version.</p>`}`;
          }).join("") : `<p class="p-sub">Aucune version publiée.</p>`);
      }).join("") : `<p class="p-sub" style="margin-top:12px">Aucun programme publié pour cette candidature.</p>`) + `</div></section>`;

    const cs = c.candidacy_sources || [];
    h += `<section class="blk"><header><b>Sources justificatives</b><span>Documents sur lesquels repose la fiche</span></header><div>` +
      (cs.length ? `<ul class="refs">${cs.map(s => `<li>${s.sources ? UI.link(s.sources.url, s.sources.title) || e(s.sources.title) : "Source"}
        <small>${[s.sources && s.sources.publisher, s.relation_type && UI.formatSourceLink(s.relation_type), UI.date(s.evidence_date || (s.sources && s.sources.publication_date))].filter(Boolean).map(e).join(" · ")}</small>
        ${s.evidence_excerpt ? `<small>« ${e(s.evidence_excerpt)} »</small>` : ""}${s.notes ? `<small>${e(s.notes)}</small>` : ""}
        <small>${UI.reliability(s.reliability_level)}</small></li>`).join("")}</ul>` : `<p class="p-sub" style="margin-top:12px">Aucune source publiée pour cette candidature.</p>`) + `</div></section>`;
    return h;
  };

  const run = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) { $("f-name").textContent = "Fiche candidat"; $("f-lede").textContent = ""; $("f-body").innerHTML = UI.emptyHtml("Aucune candidature sélectionnée. <a href=\"candidats.html\">Voir la liste des candidats</a>."); return; }
    UI.mount($("f-body"), () => DB.candidacy(id), render, { loading: "Chargement de la fiche…", empty: "Cette candidature n’existe pas ou n’est pas publiée. <a href=\"candidats.html\">Voir la liste des candidats</a>." });
  };
  run();
  window.addEventListener("hashchange", run);
})();
