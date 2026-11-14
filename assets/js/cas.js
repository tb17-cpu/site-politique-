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
  const long = (label, v) => has(v) ? `<dt>${e(label)}</dt><dd class="long">${e(typeof v === "object" ? JSON.stringify(v) : v)}</dd>` : "";
  const kv = rows => { const h = rows.map(r => r[2] ? (has(r[1]) ? `<dt>${e(r[0])}</dt><dd class="long">${r[1]}</dd>` : "") : long(r[0], r[1])).join(""); return h ? `<dl class="kv">${h}</dl>` : ""; };
  const rest = (o, used) => { const r = Object.keys(o || {}).filter(k => !used.has(k) && !SKIP.test(k) && has(o[k]) && typeof o[k] !== "object")
    .map(k => [U.humanize(k), o[k]]); return r.length ? `<details class="cs-more"><summary>Autres informations</summary>${kv(r)}</details>` : ""; };

  const srcList = arr => {
    const l = (arr || []).filter(x => x && x.sources);
    return l.length ? `<ul class="refs">${l.map(x => { const s = x.sources;
      return `<li>${U.link(s.url, s.title) || e(s.title || "Source")}<small>${[s.publisher, U.formatSourceType(s.source_type), U.date(x.evidence_date || s.publication_date)].filter(Boolean).map(e).join(" · ")}</small>
        ${x.exact_quote || x.evidence_excerpt ? `<small>« ${e(x.exact_quote || x.evidence_excerpt)} »</small>` : ""}${x.notes ? `<small>${e(x.notes)}</small>` : ""}</li>`; }).join("")}</ul>` : `<p class="quiet">Aucune source publiée.</p>`;
  };
  const srcOf = (o, ...keys) => { for (const k of keys) if (Array.isArray(o[k])) return o[k]; return []; };

  const where = c => {
    const country = c.countries && c.countries.name, scope = pick(c, ["geographic_scope", "scope", "region"]);
    return country || scope || "";
  };
  const period = c => {
    const a = pick(c, ["period_start", "start_date", "start_year", "year_start"]), b = pick(c, ["period_end", "end_date", "end_year", "year_end"]), t = pick(c, ["period", "period_label"]);
    const y = v => String(v).slice(0, 4);
    return t ? String(t) : a && b ? (y(a) === y(b) ? y(a) : `${y(a)}–${y(b)}`) : a ? `depuis ${y(a)}` : b ? `jusqu’en ${y(b)}` : "";
  };

  const outcome = o => {
    const as = pick(o, ["assessment", "evaluation", "overall_assessment", "outcome_assessment", "outcome_type", "result_assessment"]);
    const ev = pick(o, ["evidence_level", "evidence_type", "level_of_evidence", "evidence_strength"]);
    const used = new Set(["assessment", "evaluation", "overall_assessment", "outcome_assessment", "outcome_type", "result_assessment", "evidence_level", "evidence_type", "level_of_evidence", "evidence_strength",
      "title", "outcome_title", "name", "summary", "description", "outcome_description", "observed_result", "result", "direct_effects", "indirect_effects", "side_effects", "secondary_effects", "financial_costs", "financial_cost", "costs", "cost", "methodological_limits", "limitations", "limits", "methodological_limitations"]);
    const title = pick(o, ["title", "outcome_title", "name"]);
    const body = [["Résultat observé", pick(o, ["observed_result", "result", "outcome_description", "description", "summary"])],
      ["Effets directs", pick(o, ["direct_effects"])], ["Effets indirects", pick(o, ["indirect_effects"])],
      ["Effets secondaires", pick(o, ["side_effects", "secondary_effects"])], ["Coûts financiers documentés", pick(o, ["financial_costs", "financial_cost", "costs", "cost"])],
      ["Limites méthodologiques", pick(o, ["methodological_limits", "limitations", "limits", "methodological_limitations"])]];
    return `<article class="cs-out ${as ? tone(as) : ""}"><header>${title ? `<b>${e(title)}</b>` : "<b>Résultat observé</b>"}
        ${as ? `<span class="cs-eval ${tone(as)}">Évaluation : ${e(ASSESS(as).t)}</span>` : ""}${ev ? `<span class="cs-ev">Niveau de preuve : ${e(EVID(ev).t)}</span>` : `<span class="cs-ev">Niveau de preuve : non précisé</span>`}</header>
      ${kv(body)}${rest(o, used)}
      <p class="cs-rel">${U.reliability(o.reliability_level, { notes: o.reliability_notes, checked: o.reliability_checked_at })}</p>
      <h5>Sources de ce résultat</h5>${srcList(srcOf(o, "case_outcome_sources"))}</article>`;
  };

  const oneCase = (rel, n, solo) => {
    const c = rel.policy_cases; if (!c) return "";
    const title = pick(c, ["title", "case_title", "name", "label"]) || "Cas sans intitulé", pl = where(c), per = period(c);
    const type = pick(rel, ["comparison_type", "relation_type", "type"]), outs = Array.isArray(c.case_outcomes) ? c.case_outcomes : [];
    const sums = [...new Set(outs.map(o => pick(o, ["assessment", "evaluation", "overall_assessment", "outcome_assessment", "outcome_type", "result_assessment"])).filter(Boolean))];
    const usedC = new Set(["title", "case_title", "name", "label", "geographic_scope", "scope", "region", "period_start", "start_date", "start_year", "year_start", "period_end", "end_date", "end_year", "year_end", "period", "period_label",
      "authority", "responsible_authority", "government", "responsible_government", "description", "policy_description", "target_population", "affected_population", "population", "institutional_context", "economic_context", "context", "interpretation", "lessons_for_france", "lessons", "implications_for_france", "financial_costs", "financial_cost", "costs", "cost"]);
    const usedR = new Set(["comparison_type", "relation_type", "type", "similarities", "differences", "relevance_for_france", "france_relevance", "relevance", "transferability", "confidence_level", "confidence"]);
    const ctx = [pick(c, ["institutional_context"]), pick(c, ["economic_context"]), pick(c, ["context"])].filter(has);
    return `<details class="cs"${solo ? " open" : ""}><summary><span class="cs-head"><b>${e(title)}</b>
        <small>${[pl, per].filter(Boolean).map(e).join(" · ") || "Pays ou période non précisé"}</small></span>
        <span class="cs-badges">${type ? tag(CMP(type)) : ""}${sums.map(v => `<span class="cs-eval ${tone(v)}">${e(ASSESS(v).t)}</span>`).join("")}</span></summary>
      <div class="cs-body">
        <section class="cs-relbox"><h4>Relation avec cette mesure</h4>
          <p class="quiet">Type de comparaison : ${type ? e(CMP(type).t) : "non précisé"}. ${norm(type) === "direct_application" ? "" : "Une analogie n’est pas une expérience équivalente."}</p>
          ${kv([["Similarités", pick(rel, ["similarities"])], ["Différences", pick(rel, ["differences"])], ["Pertinence pour la France", pick(rel, ["relevance_for_france", "france_relevance", "relevance"])],
            ["Transférabilité", pick(rel, ["transferability"])], ["Niveau de confiance", has(rel.confidence_level || rel.confidence) ? U.reliability(rel.confidence_level || rel.confidence).replace(/<[^>]*data-x[^>]*>/, "") : "", true]])}
          ${rest(rel, usedR)}</section>
        <section><h4>Le cas</h4>
          ${kv([["Pays", c.countries && c.countries.name ? c.countries.name : (pick(c, ["geographic_scope", "scope", "region"]) || "")], ["Période", per],
            ["Autorité ou gouvernement responsable", pick(c, ["authority", "responsible_authority", "government", "responsible_government"])],
            ["Politique appliquée", pick(c, ["description", "policy_description"])], ["Population concernée", pick(c, ["target_population", "affected_population", "population"])],
            ["Contexte institutionnel et économique", ctx.join("\n\n")], ["Coûts financiers documentés", pick(c, ["financial_costs", "financial_cost", "costs", "cost"])]])}
          ${rest(c, usedC)}
          <p class="cs-rel">${U.reliability(c.reliability_level, { notes: c.reliability_notes, checked: c.reliability_checked_at })}</p></section>
        <section><h4>Résultats observés</h4><p class="quiet">Les résultats observés sont distincts des objectifs annoncés. Une corrélation n’est pas une causalité.</p>
          ${outs.length ? outs.map(outcome).join("") : `<p class="quiet">Aucun résultat publié pour ce cas.</p>`}</section>
        ${has(pick(c, ["interpretation", "lessons_for_france", "lessons", "implications_for_france"])) ? `<section class="cs-lesson"><h4>Interprétation et enseignements pour la France</h4><p class="long">${e(pick(c, ["interpretation", "lessons_for_france", "lessons", "implications_for_france"]))}</p></section>` : ""}
        <section><h4>Sources générales du cas</h4>${srcList(srcOf(c, "policy_case_sources"))}</section>
      </div></details>`;
  };

  /* Section complète ; chaîne vide s'il n'y a aucun cas publié (pas de section vide). */
  window.Cases = { section(rels) {
    const l = (rels || []).filter(r => r && r.policy_cases);
    if (!l.length) return "";
    return `<h2 class="cs-h">Comparaisons avec des politiques réellement appliquées</h2>
      <p class="p-sub cs-intro">Cas étrangers ou passés rapprochés de cette mesure, rédigés par Au résultat. Ils ne sont pas la position du candidat. Une analogie n’est pas une expérience équivalente, et un résultat négatif ou mitigé n’est jamais masqué.</p>
      <div class="cs-list">${l.map((r, i) => oneCase(r, i, l.length === 1)).join("")}</div>`;
  } };
})();
