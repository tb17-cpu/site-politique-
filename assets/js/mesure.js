/* Fiche détaillée d'une mesure (mesure.html#identifiant) : déclarations du candidat, description structurée et analyses d'Au résultat, distinguées visuellement. */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  /* Champs vides : jamais présentés comme « le candidat n'a rien proposé » ; ils sont simplement signalés comme non documentés. */
  const kv = (rows, who) => {
    const r = rows.filter(x => x[1] !== "" && x[1] != null), miss = rows.filter(x => x[1] === "" || x[1] == null).map(x => x[0]);
    const note = miss.length ? `<p class="p-sub quiet">${r.length ? "Pas encore documenté" : "Aucune information documentée pour l’instant"} : ${e(miss.join(", ").toLowerCase())}.${who === "decl" ? " Cela ne signifie pas que le candidat n’a rien proposé : l’information n’a simplement pas encore été saisie." : ""}</p>` : "";
    return (r.length ? `<dl class="kv">${r.map(x => `<dt>${e(x[0])}</dt><dd class="long">${x[2] ? x[1] : e(x[1])}</dd>`).join("")}</dl>` : "") + note;
  };
  const srcList = (arr, quoteKey, locKey) => arr.length ? `<ul class="refs">${arr.map(s => `<li>${s.sources ? (UI.link(s.sources.url, s.sources.title) || e(s.sources.title)) : "Source"}
      <small>${[s.sources && s.sources.publisher, s.sources && UI.formatSourceType(s.sources.source_type), locKey && s[locKey], UI.date(s.evidence_date || (s.sources && s.sources.publication_date))].filter(Boolean).map(e).join(" · ")}</small>
      ${quoteKey && s[quoteKey] ? `<small>« ${e(s[quoteKey])} »</small>` : ""}${s.notes ? `<small>${e(s.notes)}</small>` : ""}
      <small>${UI.reliability(s.reliability_level)}</small></li>`).join("")}</ul>` : `<p class="p-sub" style="margin:12px 0">Aucune source publiée.</p>`;

  const render = m => {
    document.title = m.title + " · Au résultat";
    $("f-name").textContent = m.title;
    const pv = m.program_versions, pg = pv && pv.programs, cd = pg && pg.candidacies, who = cd && UI.person(cd.people);
    $("f-lede").innerHTML = cd ? `Proposition de <a href="candidat.html#${encodeURIComponent(cd.id)}">${e(who || "ce candidat")}</a>${cd.parties ? " · " + e(cd.parties.name) : ""}` : "";
    const cost = m.announced_cost != null && m.announced_cost !== "" ? `${m.announced_cost}${m.cost_currency ? " " + m.cost_currency : ""}${m.cost_period ? " · " + m.cost_period : ""}` : "";
    const themes = (m.measure_themes || []).map(x => x.themes).filter(Boolean);
    let h = `<p style="margin-bottom:18px">${UI.reliability(m.reliability_level, { notes: m.reliability_notes, checked: m.reliability_checked_at, full: true })}</p>
      <section class="blk blk--decl"><header><b>Déclaré par le candidat</b><span>Formulation et éléments annoncés dans le programme</span></header><div>
        ${m.original_text ? `<blockquote class="quote">${e(m.original_text)}</blockquote>` : ""}
        ${kv([["Objectif annoncé", m.announced_objective], ["Coût annoncé", cost], ["Financement annoncé", m.announced_funding]], "decl")}
        ${pv ? `<p class="p-sub" style="margin:8px 0 0;font-size:13px">${e(pg && pg.title || "Programme")} · version ${e(pv.version_label || pv.version_number || "")}${pv.publication_date ? " · " + e(UI.date(pv.publication_date)) : ""}</p>` : ""}
      </div></section>
      <section class="blk blk--ar"><header><b>Description structurée par Au résultat</b><span>Reformulation et mise en forme éditoriales, sans jugement</span></header><div>
        ${kv([["Reformulation explicative", m.reformulation], ["Type de mesure", UI.humanize(m.measure_type)], ["Mécanisme", m.mechanism], ["Publics concernés", m.target_groups], ["Modalités d’application", m.implementation_details], ["Précisions", m.additional_details]])}
      </div></section>`;
    if (themes.length) h += `<p class="label" style="margin:0 0 8px">Thématiques</p><ul class="fam-sub" style="margin-bottom:26px">${themes.map(t => `<li><a href="thematiques.html#${encodeURIComponent(t.slug)}">${e(t.name)}</a></li>`).join("")}</ul>`;
    h += `<section class="blk"><header><b>Sources et références</b><span>Où retrouver cette proposition</span></header><div>${srcList(m.measure_sources || [], "exact_quote", "page_reference")}</div></section>`;

    const an = m.analyses || [];
    h += `<h2 style="font-size:26px;margin:34px 0 8px">Analyses</h2><p class="p-sub" style="margin-bottom:16px">Les analyses ci-dessous sont celles d’Au résultat. Elles ne sont jamais la position du candidat.</p>` +
      (an.length ? an.map(a => `<section class="blk blk--an"><header><b>Analyse d’Au résultat</b><span>${e(UI.humanize(a.analysis_type))}${a.reviewed_at ? " · relue le " + e(UI.date(a.reviewed_at)) : ""}</span></header><div>
        ${a.analysis_title ? `<h3 style="font-size:22px;margin:12px 0 4px">${e(a.analysis_title)}</h3>` : ""}
        <p style="margin:6px 0">${UI.reliability(a.reliability_level, { notes: a.reliability_notes, checked: a.reliability_checked_at })}</p>
        ${kv([["Évaluation générale", a.assessment], ["Faisabilité", a.feasibility_assessment], ["Effets attendus", a.expected_effects], ["Risques et limites", a.risks_and_limitations], ["Incertitudes", a.uncertainties], ["Méthodologie", a.methodology]])}
        <h4 class="label" style="margin:14px 0 4px">Sources de l’analyse</h4>${srcList(a.analysis_sources || [], "evidence_excerpt")}
      </div></section>`).join("") : UI.emptyHtml("Aucune analyse publiée pour cette mesure."));
    h += Cases.section(m.case_measure_relations);
    return h;
  };

  const run = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) { $("f-name").textContent = "Mesure"; $("f-lede").textContent = ""; $("f-body").innerHTML = UI.emptyHtml("Aucune mesure sélectionnée. <a href=\"thematiques.html\">Parcourir les thématiques</a>."); return; }
    UI.mount($("f-body"), async () => { const m = await DB.measure(id); const cd = m && m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies; if (cd) Election.use(cd.election_id); return m; }, render, { loading: "Chargement de la mesure…", empty: "Cette mesure n’existe pas ou n’est pas publiée. <a href=\"thematiques.html\">Parcourir les thématiques</a>." });
  };
  run();
  window.addEventListener("hashchange", run);
})();
