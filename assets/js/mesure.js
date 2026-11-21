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
    const fr = F.get(String(m.id)), fm = UI.formalization(fr);

    let h = fm ? `<div class="m-meta">${fm}</div>` : "";
    h += section("Déclaré par le candidat",
      /* Texte du candidat présenté tel quel, sans mise en forme de citation : les guillemets sont réservés aux extraits exacts sourcés. */
      (m.original_text ? `<p class="decl-text">${UI.richInline(m.original_text)}</p>` : "") +
      kv([["Objectif annoncé", m.announced_objective], ["Coût annoncé", cost], ["Financement annoncé", m.announced_funding]]), "blk--lead");
    /* Source de référence du statut : ajoutée à la liste si elle n'y figure pas déjà (rien n'est perdu en retirant son paragraphe). */
    const ms = (m.measure_sources || []).slice(), has = u => ms.some(x => x.sources && x.sources.url === u);
    if (fr && fr.source && fr.source.url && !has(fr.source.url)) ms.push({ sources: fr.source, evidence_date: fr.date || null });
    const msl = srcList(ms, "exact_quote", "page_reference");
    h += section("Sources et références", msl ? `<details class="m-fold"><summary>Voir les sources (${ms.length})</summary>${msl}</details>` : "");

    /* La méthodologie d'une analyse (colonne analyses.methodology) est une métadonnée interne : conservée en base (critères de travail,
       reprise ultérieure), jamais affichée. La page générale methodologie.html du site est distincte et inchangée. */
    /* Analyses d'Au résultat : « Analyse · Thème · publiée le … ». Sources dans un menu déroulant, avec leurs citations, pages et notes. */
    const an = m.analyses || [];
    h += an.length ? an.map(a => {
      /* Date de publication uniquement (jamais la date de relecture) ; sans elle, le titre reste « Analyse · Thème ». */
      const d = a.published_at || a.publication_date;
      const head = ["Analyse", main && e(main.name), d && UI.date(d) && "publiée le " + e(UI.date(d))].filter(Boolean).join(" · ");
      const srcs = srcList(a.analysis_sources || [], "evidence_excerpt"), n = (a.analysis_sources || []).length;
      return `<section class="blk blk--an"><header><b>${head}</b></header><div>
        ${a.analysis_title ? `<h3 class="an-title">${UI.richInline(a.analysis_title)}</h3>` : ""}
        ${kv([["Évaluation générale", a.assessment], ["Faisabilité", a.feasibility_assessment], ["Effets attendus", a.expected_effects], ["Risques et limites", a.risks_and_limitations], ["Incertitudes", a.uncertainties]])}
        ${srcs ? `<details class="m-fold"><summary>Sources de l’analyse (${n})</summary>${srcs}</details>` : ""}
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
