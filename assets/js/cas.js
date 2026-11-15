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
  const rest = (o, used) => { const r = Object.keys(o || {}).filter(k => !used.has(k) && !SKIP.test(k) && has(o[k]) && typeof o[k] !== "object")
    .map(k => [U.humanize(k), o[k]]); return r.length ? `<details class="cs-more"><summary>Autres informations</summary>${kv(r)}</details>` : ""; };
  /* Niveau (élevé, moyen…) traduit s'il est connu ; sinon le texte tel quel. */
  const lv = v => { const f = LEVEL(v); return f.known ? f.t : String(v); };
  const num = (v, unit) => has(v) ? `${v}${has(unit) ? " " + unit : ""}` : "";
  /* Une valeur chiffrée est observée si sa période est passée ; prévisionnelle (objectif, projection) si elle se situe dans le futur. */
  const futureYear = p => { const m = String(p == null ? "" : p).match(/\d{4}/g); return !!m && Math.max(...m.map(Number)) > new Date().getFullYear(); };

  const srcList = arr => {
    const l = (arr || []).filter(x => x && x.sources);
    return l.length ? `<ul class="refs">${l.map(x => { const s = x.sources, role = x.source_role;
      return `<li>${U.link(s.url, s.title) || e(s.title || "Source")}<small>${[s.publisher, U.formatSourceType(s.source_type), role ? "rôle : " + U.humanize(role) : "", x.page_reference ? "p. " + x.page_reference : "", U.date(x.evidence_date || s.publication_date)].filter(Boolean).map(e).join(" · ")}</small>
        ${x.exact_quote || x.evidence_excerpt ? `<small>« ${e(x.exact_quote || x.evidence_excerpt)} »</small>` : ""}${x.notes ? `<small>${e(x.notes)}</small>` : ""}
        ${x.reliability_level ? `<small>${U.reliability(x.reliability_level)}</small>` : ""}</li>`; }).join("")}</ul>` : `<p class="quiet">Aucune source publiée.</p>`;
  };
  const srcOf = (o, k) => Array.isArray(o[k]) ? o[k] : [];

  const territory = c => { const country = c.countries && c.countries.name, scope = c.geographic_scope;
    return country && scope && norm(country) !== norm(scope) ? `${country} · ${scope}` : (country || scope || ""); };
  const period = c => { const a = c.start_year, b = c.end_year;
    return has(a) && has(b) ? (String(a) === String(b) ? String(a) : `${a}–${b}`) : has(a) ? `depuis ${a}` : has(b) ? `jusqu’en ${b}` : ""; };

  const OUT_USED = new Set(["title", "result_assessment", "baseline_value", "baseline_period", "observed_value", "observed_period", "value_unit", "effect_magnitude", "fiscal_cost", "fiscal_revenue", "fiscal_currency", "fiscal_period",
    "direct_effects", "indirect_effects", "side_effects", "causal_evidence_level", "methodology", "limitations", "interpretation"]);
  const outcome = o => {
    const as = o.result_assessment, ev = o.causal_evidence_level, fut = futureYear(o.observed_period), unit = o.value_unit;
    const fiscal = [has(o.fiscal_cost) ? "Coût : " + num(o.fiscal_cost, o.fiscal_currency) : "", has(o.fiscal_revenue) ? "Recettes : " + num(o.fiscal_revenue, o.fiscal_currency) : ""].filter(Boolean).join(" · ") + (has(o.fiscal_period) && (has(o.fiscal_cost) || has(o.fiscal_revenue)) ? ` (${o.fiscal_period})` : "");
    const base = has(o.baseline_value) ? num(o.baseline_value, unit) + (has(o.baseline_period) ? ` (${o.baseline_period})` : "") : "";
    const obs = has(o.observed_value) ? num(o.observed_value, unit) + (has(o.observed_period) ? ` (${o.observed_period})` : "") : "";
    /* Présentation honnête des chiffres : observation mesurée ou valeur prévisionnelle, jamais confondues. */
    const obsLabel = !has(o.observed_value) ? "" : fut ? "Valeur prévisionnelle (objectif ou projection, non observée)" : has(o.observed_period) ? "Résultat chiffré observé" : "Valeur chiffrée (période non précisée)";
    return `<article class="cs-out ${as ? tone(as) : ""}"><header><b>${e(o.title || "Résultat")}</b>
        ${as ? `<span class="cs-eval ${tone(as)}">Évaluation : ${e(ASSESS(as).t)}</span>` : ""}<span class="cs-ev">Niveau de preuve causale : ${ev ? e(EVID(ev).t) : "non précisé"}</span>${fut ? '<span class="cs-eval mix">Prévisionnel</span>' : ""}</header>
      ${kv([["Situation de référence", base], [obsLabel, obs], ["Ampleur de l’effet", o.effect_magnitude], ["Coûts et recettes documentés", fiscal],
        ["Effets directs", o.direct_effects], ["Effets indirects", o.indirect_effects], ["Effets secondaires", o.side_effects], ["Méthodologie", o.methodology], ["Limites", o.limitations], ["Interprétation", o.interpretation]].filter(r => r[0]))}
      ${rest(o, OUT_USED)}
      <p class="cs-rel">${U.reliability(o.reliability_level, { notes: o.reliability_notes, checked: o.reliability_checked_at })}</p>
      <h5>Sources de ce résultat</h5>${srcList(srcOf(o, "case_outcome_sources"))}</article>`;
  };

  const CASE_USED = new Set(["title", "geographic_scope", "start_year", "end_year", "government_or_authority", "policy_design", "target_population", "implementation_context", "institutional_context", "economic_context", "implementation_duration", "summary", "known_limitations"]);
  const REL_USED = new Set(["relation_type", "similarity_level", "shared_mechanisms", "key_differences", "relevance_to_france", "transferability_assessment", "explanation", "confidence_level"]);
  const oneCase = (rel, n, solo) => {
    const c = rel.policy_cases; if (!c) return "";
    const title = c.title || "Cas sans intitulé", pl = territory(c), per = period(c), type = rel.relation_type;
    const outs = Array.isArray(c.case_outcomes) ? c.case_outcomes : [], sums = [...new Set(outs.map(o => o.result_assessment).filter(Boolean))];
    const ctx = [c.institutional_context, c.economic_context].filter(has).join("\n\n");
    return `<details class="cs"${solo ? " open" : ""}><summary><span class="cs-head"><b>${e(title)}</b>
        <small>${[pl, per].filter(Boolean).map(e).join(" · ") || "Pays ou période non précisé"}</small></span>
        <span class="cs-badges">${type ? tag(CMP(type)) : ""}${sums.map(v => `<span class="cs-eval ${tone(v)}">${e(ASSESS(v).t)}</span>`).join("")}</span></summary>
      <div class="cs-body">
        <section class="cs-relbox"><h4>Relation avec cette mesure</h4>
          <p class="quiet">Type de comparaison : ${type ? e(CMP(type).t) : "non précisé"}. ${norm(type) === "direct_application" ? "" : "Une analogie n’est pas une expérience équivalente."}</p>
          ${kv([["Explication de la comparaison", rel.explanation], ["Degré de similarité", has(rel.similarity_level) ? lv(rel.similarity_level) : ""], ["Mécanismes communs", rel.shared_mechanisms],
            ["Différences", rel.key_differences], ["Pertinence pour la France", rel.relevance_to_france], ["Transférabilité", has(rel.transferability_assessment) ? lv(rel.transferability_assessment) : ""],
            ["Niveau de confiance", has(rel.confidence_level) ? U.reliability(rel.confidence_level) : "", true]])}
          ${rest(rel, REL_USED)}</section>
        <section><h4>Le cas</h4>
          ${kv([["Résumé", c.summary], ["Pays ou territoire", pl], ["Période", per], ["Durée de mise en œuvre", c.implementation_duration], ["Autorité ou gouvernement responsable", c.government_or_authority],
            ["Politique appliquée", c.policy_design], ["Population concernée", c.target_population], ["Contexte de mise en œuvre", c.implementation_context], ["Contexte institutionnel et économique", ctx], ["Limites connues", c.known_limitations]])}
          ${rest(c, CASE_USED)}
          <p class="cs-rel">${U.reliability(c.reliability_level, { notes: c.reliability_notes, checked: c.reliability_checked_at })}</p></section>
        <section><h4>Résultats ${sums.length ? "" : "observés"}</h4><p class="quiet">Les résultats sont distincts des objectifs annoncés. Une corrélation n’est pas une causalité.</p>
          ${outs.length ? outs.map(outcome).join("") : `<p class="quiet">Aucun résultat publié pour ce cas.</p>`}</section>
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
