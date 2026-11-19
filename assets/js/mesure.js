/* Fiche détaillée d'une mesure (mesure.html#identifiant) : déclarations du candidat, description structurée et analyses d'Au résultat, distinguées visuellement. */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  /* Champs vides : simplement masqués (aucun message « non documenté »). Une section sans contenu n'est pas affichée. */
  const kv = (rows) => {
    const r = rows.filter(x => x[1] !== "" && x[1] != null);
    return r.length ? `<dl class="kv">${r.map(x => `<dt>${e(x[0])}</dt><dd>${x[2] ? x[1] : UI.rich(x[1])}</dd>`).join("")}</dl>` : "";
  };
  /* Sources : référence, éditeur, type, localisation (page), date, citation et note, sans indicateur de fiabilité. */
  const srcList = (arr, quoteKey, locKey) => arr.length ? `<ul class="refs">${arr.map(s => `<li>${s.sources ? (UI.link(s.sources.url, s.sources.title) || e(s.sources.title)) : "Source"}
      <small>${[s.sources && s.sources.publisher, s.sources && UI.formatSourceType(s.sources.source_type), locKey && s[locKey], UI.date(s.evidence_date || (s.sources && s.sources.publication_date))].filter(Boolean).map(e).join(" · ")}</small>
      ${quoteKey && s[quoteKey] ? `<small>« ${e(s[quoteKey])} »</small>` : ""}${s.notes ? `<small>${UI.richInline(s.notes)}</small>` : ""}</li>`).join("")}</ul>` : "";
  const section = (title, inner, cls) => inner ? `<section class="blk${cls ? " " + cls : ""}"><header><b>${title}</b></header><div>${inner}</div></section>` : "";

  /* Statuts de formalisation (DB.formalizations), chargés avec la page ; vide si indisponibles. */
  let F = new Map();
  const render = m => {
    document.title = m.title + " · Au résultat";
    $("f-name").textContent = m.title;
    const pv = m.program_versions, pg = pv && pv.programs, cd = pg && pg.candidacies, who = cd && UI.person(cd.people);
    $("f-lede").innerHTML = cd ? `Proposition de <a href="candidat.html#${encodeURIComponent(cd.id)}">${e(who || "ce candidat")}</a>${cd.parties ? " · " + e(cd.parties.name) : ""}` : "";
    const cost = m.announced_cost != null && m.announced_cost !== "" ? `${m.announced_cost}${m.cost_currency ? " " + m.cost_currency : ""}${m.cost_period ? " · " + m.cost_period : ""}` : "";
    /* Thème de référence : le même choix déterministe que sur la fiche candidat (display_order, nom, id). */
    const num = v => (typeof v === "number" && isFinite(v)) ? v : Infinity;
    const cmpTh = (x, y) => (num(x.display_order) - num(y.display_order) || 0) || String(x.name || "").localeCompare(String(y.name || ""), "fr") || String(x.id || "").localeCompare(String(y.id || ""));
    const themes = (m.measure_themes || []).map(x => x && x.themes).filter(Boolean);
    const main = themes.filter(t => t.name).sort(cmpTh)[0];
    const fm = UI.formalization(F.get(String(m.id)), { full: true });

    let h = fm ? `<div class="m-meta">${fm}</div>` : "";
    h += section("Déclaré par le candidat",
      (m.original_text ? `<blockquote class="quote">${UI.richInline(m.original_text)}</blockquote>` : "") +
      kv([["Objectif annoncé", m.announced_objective], ["Coût annoncé", cost], ["Financement annoncé", m.announced_funding]]), "blk--lead");
    h += section("Description", kv([["Reformulation explicative", m.reformulation], ["Mécanisme", m.mechanism], ["Publics concernés", m.target_groups], ["Modalités d’application", m.implementation_details], ["Précisions", m.additional_details]]));
    if (themes.length) h += `<section class="blk"><header><b>Thématiques</b></header><ul class="fam-sub">${themes.map(t => `<li><a href="thematiques.html#${encodeURIComponent(t.slug)}">${e(t.name)}</a></li>`).join("")}</ul></section>`;
    h += section("Sources et références", srcList(m.measure_sources || [], "exact_quote", "page_reference"));

    /* Analyses d'Au résultat : « Analyse · Thème · publiée le … ». Sources dans un menu déroulant, avec leurs citations, pages et notes. */
    const an = m.analyses || [];
    h += an.length ? an.map(a => {
      const d = a.published_at || a.publication_date || a.reviewed_at;
      const head = ["Analyse", main && e(main.name), d && UI.date(d) && "publiée le " + e(UI.date(d))].filter(Boolean).join(" · ");
      const srcs = srcList(a.analysis_sources || [], "evidence_excerpt"), n = (a.analysis_sources || []).length;
      const rn = a.reliability_notes ? `<p class="quiet">${UI.richInline(a.reliability_notes)}</p>` : "";
      return `<section class="blk blk--an"><header><b>${head}</b></header><div>
        ${a.analysis_title ? `<h3 class="an-title">${UI.richInline(a.analysis_title)}</h3>` : ""}
        ${kv([["Évaluation générale", a.assessment], ["Faisabilité", a.feasibility_assessment], ["Effets attendus", a.expected_effects], ["Risques et limites", a.risks_and_limitations], ["Incertitudes", a.uncertainties], ["Méthodologie", a.methodology]])}
        ${srcs || rn ? `<details class="m-fold"><summary>Sources de l’analyse${n ? ` (${n})` : ""}</summary>${srcs}${rn}</details>` : ""}
      </div></section>`;
    }).join("") : "";
    h += Cases.section(m.case_measure_relations);
    return h;
  };

  const run = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) { $("f-name").textContent = "Mesure"; $("f-lede").textContent = ""; $("f-body").innerHTML = UI.emptyHtml("Aucune mesure sélectionnée. <a href=\"thematiques.html\">Parcourir les thématiques</a>."); return; }
    F = new Map();
    UI.mount($("f-body"), async () => { const m = await DB.measure(id); const cd = m && m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies; if (cd) Election.use(cd.election_id); F = await DB.formalizations(); return m; }, render, { loading: "Chargement de la mesure…", empty: "Cette mesure n’existe pas ou n’est pas publiée. <a href=\"thematiques.html\">Parcourir les thématiques</a>." });
  };
  run();
  window.addEventListener("hashchange", run);
})();
