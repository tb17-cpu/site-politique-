/* Comparaisons avec des politiques réellement appliquées : cas (policy_cases), résultats (case_outcomes),
   relation cas-mesure (case_measure_relations) et sources de chacun.
   Les noms de colonnes sont résolus avec tolérance (plusieurs noms possibles par information) ; toute colonne
   publiée non reconnue est affichée dans « Autres informations » plutôt que perdue. Aucune valeur n'est inventée. */
(function () {
  const e = esc, U = window.UI;
  const has = v => v !== "" && v != null && !(Array.isArray(v) && !v.length);
  const pick = (o, names) => { for (const n of names) if (o && has(o[n])) return o[n]; return null; };
  const norm = v => String(v == null ? "" : v).toLowerCase().trim().replace(/[\s-]+/g, "_");

  /* Libellés français ; valeur inconnue : valeur technique lisible + infobulle, jamais masquée. */
  const lab = map => v => { const k = norm(v); return map[k] ? { t: map[k], known: true } : { t: U.humanize(String(v)), known: false, raw: String(v) }; };
  const ASSESS = lab({ positive: "Positif", negative: "Négatif", mixed: "Mitigé", no_significant_effect: "Aucun effet significatif", no_effect: "Aucun effet significatif", none: "Aucun effet significatif", uncertain: "Incertain", inconclusive: "Incertain", unknown: "Incertain" });
  const EVID = lab({ experimental: "Expérimental", quasi_experimental: "Quasi-expérimental", quasiexperimental: "Quasi-expérimental", observational: "Observationnel", descriptive: "Descriptif", modeled: "Modélisé", modelled: "Modélisé", modeling: "Modélisé", expert: "Expertise", expertise: "Expertise", expert_opinion: "Expertise", unknown: "Inconnu" });
  const CMP = lab({ direct_application: "Application directe", direct: "Application directe", close_analogy: "Analogie proche", partial_analogy: "Analogie partielle", counterexample: "Contre-exemple", counter_example: "Contre-exemple", contextual_reference: "Référence contextuelle", contextual: "Référence contextuelle" });
  const LEVEL = lab({ high: "Élevée", medium: "Moyenne", low: "Faible", unverified: "Non vérifiée", unknown: "Non précisée" });
  const tag = (f, v) => `<span class="cs-tag"${f.known ? "" : ` title="${e("Valeur technique : " + f.raw)}"`}>${e(f.t)}</span>`;
  const tone = v => ({ positive: "pos", negative: "neg", mixed: "mix" })[norm(v)] || "";

  const SKIP = /(^id$|_id$|^created_at$|^updated_at$|publication_status|^reliability|_checked_at$|^display_order$|^policy_cases$|^countries$|^case_outcomes$|_sources$|^sources$)/;
  const text = v => e(typeof v === "object" ? JSON.stringify(v) : v);
  /* Lignes [libellé, valeur] ; r[2] = valeur déjà en HTML. Une ligne sans valeur n'est jamais affichée. */
  const kv = rows => { const h = rows.map(r => has(r[1]) ? `<dt>${e(r[0])}</dt><dd class="long">${r[2] ? r[1] : text(r[1])}</dd>` : "").join(""); return h ? `<dl class="kv">${h}</dl>` : ""; };
  /* Colonnes publiées non reconnues : conservées, affichées dans « Informations complémentaires ». */
  const restKv = (o, used) => kv(Object.keys(o || {}).filter(k => !used.has(k) && !SKIP.test(k) && has(o[k]) && typeof o[k] !== "object").map(k => [U.humanize(k), o[k]]));
  /* Niveau (élevé, moyen…) traduit s'il est connu ; sinon le texte tel quel. */
  const lv = v => { const f = LEVEL(v); return f.known ? f.t : String(v); };
  const num = (v, unit) => has(v) ? `${v}${has(unit) ? " " + unit : ""}` : "";
  /* Statut d'une valeur chiffrée (observée, projetée, objectif, estimée) : lu UNIQUEMENT dans une colonne dédiée,
     jamais déduit de la date. Sans colonne renseignée : « Statut non vérifié ». */
  const VST = { observed: ["Résultat observé", "obs"], projected: ["Projection", "proj"], target: ["Objectif annoncé", "tgt"], estimated: ["Estimation", "est"] };
  const vst = v => VST[norm(v)] || ["Statut non vérifié", "unk"];
  const vbadge = v => { const x = vst(v); return `<span class="vs vs-${x[1]}">${x[0]}</span>`; };

  const srcOf = (o, k) => Array.isArray(o[k]) ? o[k] : [];

  const territory = c => { const country = c.countries && c.countries.name, scope = c.geographic_scope;
    return country && scope && norm(country) !== norm(scope) ? `${country} · ${scope}` : (country || scope || ""); };
  const period = c => { const a = c.start_year, b = c.end_year;
    return has(a) && has(b) ? (String(a) === String(b) ? String(a) : `${a}–${b}`) : has(a) ? `depuis ${a}` : has(b) ? `jusqu’en ${b}` : ""; };

  const OUT_USED = new Set(["title", "result_assessment", "baseline_value", "baseline_period", "observed_value", "observed_period", "value_unit", "effect_magnitude", "fiscal_cost", "fiscal_revenue", "fiscal_currency", "fiscal_period",
    "baseline_value_status", "observed_value_status", "fiscal_cost_status", "fiscal_revenue_status", "direct_effects", "indirect_effects", "side_effects", "causal_evidence_level", "methodology", "limitations", "interpretation"]);
  const CASE_USED = new Set(["title", "geographic_scope", "start_year", "end_year", "government_or_authority", "policy_design", "target_population", "implementation_context", "institutional_context", "economic_context", "implementation_duration", "summary", "known_limitations"]);
  const REL_USED = new Set(["relation_type", "similarity_level", "shared_mechanisms", "key_differences", "relevance_to_france", "transferability_assessment", "explanation", "confidence_level"]);

  /* Texte rédigé : paragraphes (lignes vides), jamais de HTML brut. */
  const prose = v => has(v) ? String(v).split(/\n{2,}/).map(t => t.trim()).filter(Boolean).map(t => `<p>${e(t).replace(/\n/g, "<br>")}</p>`).join("") : "";
  const lead = (label, v) => has(v) ? `<p><span class="cs-lead">${e(label)}.</span> ${e(String(v)).replace(/\n+/g, " ")}</p>` : "";

  /* Sources du cas et de ses résultats, regroupées sans doublon (même source = une seule ligne). */
  const sid = s => String(s.id != null ? s.id : (s.url || s.title || ""));
  const gather = (c, outs) => { const m = new Map();
    const add = (arr, where) => (arr || []).forEach(x => { if (!x || !x.sources) return; const k = sid(x.sources); if (!m.has(k)) m.set(k, { s: x.sources, uses: [] }); m.get(k).uses.push({ where, x }); });
    add(srcOf(c, "policy_case_sources"), "Cas"); outs.forEach(o => add(srcOf(o, "case_outcome_sources"), o.title || "Résultat")); return [...m.values()]; };
  const srcBlock = g => g.length
    ? `<details class="cs-fold"><summary>Sources (${g.length})</summary><ul class="refs">${g.map(({ s }) => `<li>${U.link(s.url, s.title) || e(s.title || "Source")}<small>${[s.publisher, U.formatSourceType(s.source_type), U.date(s.publication_date)].filter(Boolean).map(e).join(" · ")}</small></li>`).join("")}</ul></details>`
    : `<p class="quiet">Aucune source publiée.</p>`;
  /* Rôle, page, citation et fiabilité de chaque source : conservés, mais hors de l'affichage principal. */
  const srcMeta = g => g.map(({ s, uses }) => {
    const l = uses.map(({ where, x }) => [where, x.source_role ? "rôle : " + U.humanize(x.source_role) : "", x.page_reference ? "p. " + x.page_reference : "", U.date(x.evidence_date)].filter(Boolean).map(e).join(" · ")
      + (x.exact_quote || x.evidence_excerpt ? ` <i>« ${e(x.exact_quote || x.evidence_excerpt)} »</i>` : "") + (x.notes ? ` ${e(x.notes)}` : "") + (x.reliability_level ? ` ${U.reliability(x.reliability_level)}` : ""));
    return `<li>${e(s.title || "Source")}${l.map(t => `<small>${t}</small>`).join("")}</li>`; }).join("");

  const outcome = o => {
    const as = o.result_assessment, unit = o.value_unit;
    const fp = has(o.fiscal_period) ? ` (${o.fiscal_period})` : "";
    const cost = has(o.fiscal_cost) ? e(num(o.fiscal_cost, o.fiscal_currency) + fp) + " " + vbadge(o.fiscal_cost_status) : "";
    const rev = has(o.fiscal_revenue) ? e(num(o.fiscal_revenue, o.fiscal_currency) + fp) + " " + vbadge(o.fiscal_revenue_status) : "";
    const base = has(o.baseline_value) ? num(o.baseline_value, unit) + (has(o.baseline_period) ? ` (${o.baseline_period})` : "") : "";
    const obs = has(o.observed_value) ? num(o.observed_value, unit) + (has(o.observed_period) ? ` (${o.observed_period})` : "") : "";
    return `<article class="cs-out ${as ? tone(as) : ""}"><header><b>${e(o.title || "Résultat")}</b>${as ? `<span class="cs-eval ${tone(as)}">Évaluation : ${e(ASSESS(as).t)}</span>` : ""}</header>
      ${kv([["Situation de référence", base ? e(base) + " " + vbadge(o.baseline_value_status) : "", true], ["Valeur chiffrée", obs ? e(obs) + " " + vbadge(o.observed_value_status) : "", true], ["Ampleur de l’effet", o.effect_magnitude], ["Coût budgétaire", cost, true], ["Recettes", rev, true]])}
      <div class="cs-prose">${lead("Effets directs", o.direct_effects)}${lead("Effets indirects", o.indirect_effects)}${lead("Effets secondaires", o.side_effects)}${lead("Limites", o.limitations)}${lead("Interprétation", o.interpretation)}</div></article>`;
  };
  /* Métadonnées d'un résultat (preuve causale, méthode, fiabilité, colonnes non reconnues) : repliées. */
  const outcomeMeta = o => { const b = [kv([["Niveau de preuve causale", o.causal_evidence_level ? EVID(o.causal_evidence_level).t : "non précisé"], ["Méthodologie", o.methodology]]), restKv(o, OUT_USED),
      o.reliability_level ? `<p class="cs-rel">${U.reliability(o.reliability_level, { notes: o.reliability_notes, checked: o.reliability_checked_at })}</p>` : ""].join("");
    return b.trim() ? `<h5>${e(o.title || "Résultat")}</h5>${b}` : ""; };

  const oneCase = (rel, n, solo) => {
    const c = rel.policy_cases; if (!c) return "";
    const title = c.title || "Cas sans intitulé", pl = territory(c), per = period(c), type = rel.relation_type;
    const outs = Array.isArray(c.case_outcomes) ? c.case_outcomes : [], sums = [...new Set(outs.map(o => o.result_assessment).filter(Boolean))];
    const facts = [pl, per, c.government_or_authority].filter(has).map(e).join(" · ");
    const g = gather(c, outs);
    const dispositif = prose(c.policy_design) + lead("Population concernée", c.target_population) + lead("Mise en œuvre", c.implementation_context)
      + lead("Contexte institutionnel", c.institutional_context) + lead("Contexte économique", c.economic_context) + lead("Limites connues", c.known_limitations);
    const meta = [kv([["Durée de mise en œuvre", c.implementation_duration]]), restKv(c, CASE_USED),
      c.reliability_level ? `<p class="cs-rel">${U.reliability(c.reliability_level, { notes: c.reliability_notes, checked: c.reliability_checked_at })}</p>` : "",
      has(rel.confidence_level) ? kv([["Niveau de confiance de la relation", U.reliability(rel.confidence_level), true]]) : "", restKv(rel, REL_USED),
      outs.map(outcomeMeta).join(""), g.length ? `<h5>Rôle des sources</h5><ul class="refs">${srcMeta(g)}</ul>` : ""].join("");
    return `<details class="cs"${solo ? " open" : ""}><summary><span class="cs-head"><b>${e(title)}</b>
        <small>${[pl, per].filter(Boolean).map(e).join(" · ") || "Pays ou période non précisé"}</small></span>
        <span class="cs-badges">${type ? tag(CMP(type)) : ""}${sums.map(v => `<span class="cs-eval ${tone(v)}">${e(ASSESS(v).t)}</span>`).join("")}</span></summary>
      <div class="cs-body">
        <section class="cs-sum">${has(c.summary) ? `<div class="cs-prose cs-lede">${prose(c.summary)}</div>` : ""}${facts ? `<p class="cs-facts">${facts}</p>` : ""}</section>
        ${dispositif ? `<section class="cs-sec"><h4>Le dispositif</h4><div class="cs-prose">${dispositif}</div></section>` : ""}
        <section class="cs-sec"><h4>Résultats</h4><p class="quiet">Les résultats sont distincts des objectifs annoncés. Une corrélation n’est pas une causalité.</p>
          ${outs.length ? outs.map(outcome).join("") : `<p class="quiet">Aucun résultat publié pour ce cas.</p>`}</section>
        <section class="cs-sec cs-relbox"><h4>Relation avec la mesure politique</h4>
          <p class="quiet">Type de comparaison : ${type ? e(CMP(type).t) : "non précisé"}. ${norm(type) === "direct_application" ? "" : "Une analogie n’est pas une expérience équivalente."}</p>
          <div class="cs-prose">${prose(rel.explanation)}</div>
          ${kv([["Degré de similarité", has(rel.similarity_level) ? lv(rel.similarity_level) : ""], ["Mécanismes communs", rel.shared_mechanisms], ["Différences", rel.key_differences], ["Pertinence pour la France", rel.relevance_to_france], ["Transférabilité", has(rel.transferability_assessment) ? lv(rel.transferability_assessment) : ""]])}</section>
        ${srcBlock(g)}
        ${meta.trim() ? `<details class="cs-fold"><summary>Informations complémentaires</summary><div class="cs-meta">${meta}</div></details>` : ""}
      </div></details>`;
  };

  /* Section complète ; chaîne vide s'il n'y a aucun cas publié (pas de section vide). */
  window.Cases = { section(rels) {
    const l = (rels || []).filter(r => r && r.policy_cases);
    if (!l.length) return "";
    return `<h2 class="cs-h">Comparaisons avec des politiques réellement appliquées</h2>
      <p class="p-sub cs-intro">Cas étrangers ou passés rapprochés de cette mesure, rédigés par <span class="brand-inline">Au résultat</span>. Ils ne sont pas la position du candidat. Une analogie n’est pas une expérience équivalente, et un résultat négatif ou mitigé n’est jamais masqué.</p>
      <div class="cs-list">${l.map((r, i) => oneCase(r, i, l.length === 1)).join("")}</div>`;
  } };
})();
