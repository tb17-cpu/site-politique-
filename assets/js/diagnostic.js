/* Diagnostic : contrôles en lecture seule, exécutés dans le navigateur du visiteur. */
(function () {
  const out = document.getElementById("d-out"), e = esc;
  const rows = [];
  const add = (name, ok, detail) => rows.push(`<tr><td>${e(name)}</td><td class="${ok === true ? "ok" : ok === false ? "ko" : "na"}">${ok === true ? "OK" : ok === false ? "Échec" : "À voir"}</td><td>${e(detail)}</td></tr>`);
  const TABLES = ["countries", "elections", "people", "parties", "candidacies", "candidacy_sources", "candidacy_sponsorship_territories", "programs", "program_versions", "themes", "measures", "sources", "measure_sources", "measure_themes", "measure_relations", "analyses", "analysis_sources", "indicators", "indicator_observations"];
  const STATUS = ["countries", "elections", "people", "parties", "candidacies", "programs", "program_versions", "themes", "measures", "sources", "analyses", "indicators", "indicator_observations"];

  (async () => {
    out.innerHTML = UI.loadingHtml("Contrôles en cours…");
    try {
      const counts = {};
      counts.countries = await DB.count("countries");
      add("Connexion à Supabase", true, new URL(window.SUPABASE_CONFIG.url).host);
      for (const t of TABLES.slice(1)) { try { counts[t] = await DB.count(t); } catch (err) { counts[t] = "erreur " + (err.status || err.kind); } }
      const th = await DB.themes(), fam = th.filter(t => !t.parent_id), subs = th.filter(t => t.parent_id);
      add("Thématiques publiées récupérées", th.length === 112, `${th.length} (attendu : 112)`);
      add("Familles et sous-thématiques", fam.length === 13 && subs.length === 99, `${fam.length} familles, ${subs.length} sous-thématiques (attendu : 13 et 99)`);
      add("Relations parent → enfant", subs.every(s => fam.some(f => f.id === s.parent_id)), "chaque sous-thématique est rattachée à une famille");
      const el = await DB.election();
      add("Élection par défaut", !!el, el ? `${el.name} (${el.year}), ${el.countries && el.countries.name}` : "introuvable ou non publiée");
      const seen = {};
      for (const t of STATUS) { try { const r = await DB.raw(t, { select: "publication_status" }); seen[t] = [...new Set(r.map(x => x.publication_status))]; } catch (err) { seen[t] = ["erreur"]; } }
      const bad = Object.entries(seen).filter(([, v]) => v.some(s => s !== "published" && s !== "erreur" && s != null));
      add("Aucun brouillon accessible", bad.length === 0 ? true : false, bad.length ? bad.map(([t, v]) => `${t}: ${v.join(", ")}`).join(" ; ") : "tous les statuts visibles sont « published »");
      add("Données personnelles en brouillon (personnes, partis, candidatures)", ["people", "parties", "candidacies"].every(t => counts[t] === 0) ? true : null, `personnes ${counts.people}, partis ${counts.parties}, candidatures ${counts.candidacies} (attendu : 0 tant qu’elles sont en brouillon)`);
      out.innerHTML = `<div class="scroll"><table class="diag"><thead><tr><th>Contrôle</th><th>Résultat</th><th>Détail</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
        <h3 class="h-h3" style="margin:28px 0 8px">Lignes visibles par table</h3><div class="scroll"><table class="diag"><tbody>${TABLES.map(t => `<tr><td>${t}</td><td>${e(counts[t])}</td></tr>`).join("")}</tbody></table></div>`;
    } catch (err) {
      add("Connexion à Supabase", false, DB.humanMessage(err));
      out.innerHTML = `<div class="scroll"><table class="diag"><tbody>${rows.join("")}</tbody></table></div>`;
    }
  })();
})();
