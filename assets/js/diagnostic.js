/* Diagnostic : contrôles en lecture seule, exécutés dans le navigateur du visiteur.
   Trois résultats, jamais mélangés :
   OK = contrôle exécuté, résultat conforme ; ÉCHEC = contrôle exécuté, résultat non conforme ;
   NON VÉRIFIABLE = contrôle impossible (erreur, accès refusé, réponse incomplète).
   Une erreur de requête n'est jamais transformée en zéro ni en succès.
   Les lectures passent par DB.raw / DB.count : aucun filtrage JavaScript, pour constater ce que RLS laisse passer. */
(function () {
  const out = document.getElementById("d-out"), e = esc;
  const results = [];   /* { group, name, status: "ok"|"ko"|"na", detail } */
  const OK = "ok", KO = "ko", NA = "na";
  const LABEL = { ok: "OK", ko: "ÉCHEC", na: "NON VÉRIFIABLE" };
  const add = (group, name, status, detail) => results.push({ group, name, status, detail });
  const why = err => {
    const d = DB.humanMessage(err), code = err && (err.status ? " (HTTP " + err.status + ")" : err.kind ? " (" + err.kind + ")" : "");
    return d + (code || "");
  };

  const TABLES = ["countries", "elections", "people", "parties", "candidacies", "candidacy_sources", "candidacy_sponsorship_territories", "programs", "program_versions", "themes", "measures", "sources", "measure_sources", "measure_themes", "measure_relations", "analyses", "analysis_sources", "indicators", "indicator_observations", "policy_cases", "case_measure_relations", "case_outcomes", "policy_case_sources", "case_outcome_sources"];
  /* Tables possédant une colonne publication_status (schéma réel). Les autres sont des tables de liaison. */
  const WITH_STATUS = ["countries", "elections", "people", "parties", "candidacies", "programs", "program_versions", "themes", "measures", "sources", "analyses", "indicators", "indicator_observations"];
  const PAGE = 1000;   /* limite par défaut de l'API : au-delà, la lecture est incomplète */

  /* Parcourt un objet imbriqué et relève chaque objet dont publication_status n'est pas exactement « published ». */
  const offenders = (v, path, acc = []) => {
    if (Array.isArray(v)) v.forEach(x => offenders(x, path, acc));
    else if (v && typeof v === "object") {
      if (Object.prototype.hasOwnProperty.call(v, "publication_status") && v.publication_status !== "published") acc.push(`${path}: ${v.publication_status === null ? "statut absent" : v.publication_status}`);
      Object.keys(v).forEach(k => offenders(v[k], path + "." + k, acc));
    }
    return acc;
  };
  const uniq = a => [...new Set(a)];

  async function guard(group, name, fn) {
    try { const r = await fn(); add(group, name, r[0], r[1]); }
    catch (err) { add(group, name, NA, "Contrôle impossible : " + why(err)); }
  }

  async function run() {
    out.innerHTML = UI.loadingHtml("Contrôles en cours…");
    results.length = 0;
    const counts = {};   /* table -> nombre | null (non vérifiable) */
    let up = false;

    /* A. Connexion */
    try { await DB.count("countries"); up = true; add("Connexion", "Connexion à Supabase", OK, new URL(window.SUPABASE_CONFIG.url).host); }
    catch (err) {
      const kind = err.kind === "network" || err.kind === "timeout" ? "Erreur réseau" : (err.status === 401 || err.status === 403) ? "Accès refusé" : err.status >= 500 ? "Service indisponible" : "Erreur";
      add("Connexion", "Connexion à Supabase", KO, kind + " : " + why(err));
    }

    if (up) {
      /* E. Comptages (les 19 tables) : une erreur reste « non vérifiable », jamais zéro */
      for (const t of TABLES) { try { counts[t] = await DB.count(t); } catch (err) { counts[t] = null; } }
      const failed = TABLES.filter(t => counts[t] === null);
      add("Comptages", "Nombre de lignes visibles dans les " + TABLES.length + " tables", failed.length ? NA : OK,
        failed.length ? "Comptage impossible pour : " + failed.join(", ") : TABLES.length + " tables comptées");

      /* B. Thématiques (lecture brute, sans filtre navigateur) */
      let th = null;
      try { th = await DB.raw("themes", { select: "id,parent_id,publication_status" }); } catch (err) { add("Thématiques", "Lecture des thématiques", NA, "Contrôle impossible : " + why(err)); }
      if (th) {
        if (th.length >= PAGE) add("Thématiques", "Lecture complète", NA, `${th.length} lignes : réponse peut-être tronquée`);
        else {
          const fam = th.filter(t => !t.parent_id), subs = th.filter(t => t.parent_id), famIds = new Set(fam.map(t => t.id));
          add("Thématiques", "112 thématiques visibles", th.length === 112 ? OK : KO, `${th.length} (attendu : 112)`);
          add("Thématiques", "13 familles", fam.length === 13 ? OK : KO, `${fam.length} (attendu : 13)`);
          add("Thématiques", "99 sous-thématiques", subs.length === 99 ? OK : KO, `${subs.length} (attendu : 99)`);
          const orphans = subs.filter(s => !famIds.has(s.parent_id)), nested = fam.filter(f => f.parent_id);
          add("Thématiques", "Relations parent → enfant", orphans.length || nested.length ? KO : OK,
            orphans.length ? `${orphans.length} sous-thématique(s) sans famille visible` : "chaque sous-thématique est rattachée à une famille visible");
        }
      }

      /* C. Élection */
      await guard("Élection", "Présidentielle française de 2027 rattachée à la France", async () => {
        const r = await DB.raw("elections", { select: "id,name,year,publication_status,countries!inner(name,iso2,publication_status)", filter: { year: "eq.2027", "countries.iso2": "eq.FR" } });
        if (!r.length) return [KO, "Aucune élection 2027 rattachée à la France n'est visible"];
        const x = r[0];
        return [x.countries && x.countries.iso2 === "FR" ? OK : KO, `${x.name} (${x.year}), ${x.countries ? x.countries.name : "pays absent"}`];
      });

      /* D. Visibilité : tables avec statut, puis données imbriquées */
      for (const t of WITH_STATUS) {
        await guard("Visibilité", `${t} : uniquement des lignes publiées`, async () => {
          const r = await DB.raw(t, { select: "publication_status", limit: PAGE });
          if (r.length >= PAGE) return [NA, "Lecture limitée à " + PAGE + " lignes : vérification incomplète"];
          const bad = r.filter(x => x.publication_status !== "published");
          if (!r.length) return [OK, "aucune ligne visible (table vide, ou lignes non publiées protégées par RLS)"];
          return bad.length ? [KO, `${bad.length} ligne(s) non publiée(s) accessible(s) : ${uniq(bad.map(x => x.publication_status === null ? "statut absent" : x.publication_status)).join(", ")}`] : [OK, `${r.length} ligne(s), toutes « published »`];
        });
      }
      /* Comparaisons internationales : colonnes de statut éventuelles, colonnes réellement reçues (pour lever toute ambiguïté) */
      for (const t of ["policy_cases", "case_measure_relations", "case_outcomes", "policy_case_sources", "case_outcome_sources"]) {
        await guard("Comparaisons internationales", `${t} : lignes publiées, colonnes reçues`, async () => {
          const r = await DB.raw(t, { select: "*", limit: PAGE });
          if (r.length >= PAGE) return [NA, "Lecture limitée : vérification incomplète"];
          if (!r.length) return [OK, "aucune ligne visible (table vide, ou lignes non publiées protégées par RLS)"];
          const cols = Object.keys(r[0]).join(", "), st = r.filter(x => Object.prototype.hasOwnProperty.call(x, "publication_status"));
          const bad = st.filter(x => x.publication_status !== "published");
          return bad.length ? [KO, `${bad.length} ligne(s) non publiée(s) accessible(s) · colonnes : ${cols}`] : [OK, `${r.length} ligne(s)${st.length ? ", toutes « published »" : ", table sans statut propre"} · colonnes : ${cols}`];
        });
      }
      const NESTED = [
        ["candidacies", "candidacies", "id,publication_status,people(publication_status),parties(publication_status),programs(publication_status,program_versions(publication_status,measures(publication_status))),candidacy_sources(sources(publication_status)),candidacy_sponsorship_territories(sources(publication_status))"],
        ["measures", "measures", "id,publication_status,program_versions(publication_status,programs(publication_status,candidacies(publication_status,people(publication_status),parties(publication_status)))),measure_themes(themes(publication_status)),measure_sources(sources(publication_status)),analyses(publication_status,analysis_sources(sources(publication_status))),case_measure_relations(policy_cases(publication_status,countries(publication_status),case_outcomes(publication_status,case_outcome_sources(sources(publication_status))),policy_case_sources(sources(publication_status))))"],
        ["indicator_observations", "indicator_observations", "id,publication_status,indicators(publication_status),countries(publication_status),sources(publication_status)"]
      ];
      for (const [label, t, sel] of NESTED) {
        await guard("Visibilité", `${label} : données imbriquées publiées`, async () => {
          const r = await DB.raw(t, { select: sel, limit: PAGE });
          if (r.length >= PAGE) return [NA, "Lecture limitée : vérification incomplète"];
          if (!r.length) return [OK, "aucune ligne visible : rien à contrôler"];
          const bad = offenders(r, t);
          return bad.length ? [KO, uniq(bad).slice(0, 5).join(" ; ")] : [OK, `${r.length} ligne(s) et leurs relations, toutes « published »`];
        });
      }

      /* F. Données personnelles : invisibles aujourd'hui, ce qui est conforme (brouillons) */
      for (const t of ["people", "parties", "candidacies"]) {
        const n = counts[t];
        add("Données personnelles", `${t} : visibilité publique`, n === null ? NA : OK,
          n === null ? "comptage impossible" : n === 0 ? "aucune ligne visible : conforme tant que ces contenus sont en brouillon" : `${n} ligne(s) visible(s) : leur statut est contrôlé ci-dessus`);
      }

      /* Libellés de statut : toute valeur visible doit avoir une traduction française */
      await guard("Libellés", "Valeurs de statut reconnues par le site", async () => {
        const r = await DB.raw("candidacies", { select: "candidacy_status,sponsorship_status,second_round_status", limit: PAGE });
        if (!r.length) return [OK, "aucune candidature visible : sans objet"];
        const bad = [];
        r.forEach(x => {
          if (x.candidacy_status != null && !UI.isKnownCandidacyStatus(x.candidacy_status)) bad.push("candidacy_status=" + x.candidacy_status);
          if (x.sponsorship_status != null && !UI.isKnownSponsorshipStatus(x.sponsorship_status)) bad.push("sponsorship_status=" + x.sponsorship_status);
          if (x.second_round_status != null && !UI.isKnownSecondRoundStatus(x.second_round_status)) bad.push("second_round_status=" + x.second_round_status);
        });
        return bad.length ? [KO, "sans traduction (libellé de repli affiché) : " + uniq(bad).join(", ")] : [OK, "toutes les valeurs visibles sont traduites"];
      });
    } else {
      ["Comptages", "Thématiques", "Élection", "Visibilité", "Données personnelles"].forEach(g => add(g, "Contrôles de la rubrique « " + g + " »", NA, "non exécutés : connexion impossible"));
    }
    render(counts);
  }

  function render(counts) {
    const n = s => results.filter(r => r.status === s).length, ok = n(OK), ko = n(KO), na = n(NA);
    const cls = ko ? "ko" : na ? "na" : "ok";
    const title = ko ? "Échecs détectés" : na ? "Diagnostic incomplet" : "Diagnostic intégralement réussi";
    const sub = ko ? "Au moins un contrôle exécuté n'est pas conforme." : na ? "Certains contrôles n'ont pas pu être effectués : le système ne peut pas être déclaré opérationnel." : "Tous les contrôles ont été exécutés et sont conformes.";
    let last = "", body = "";
    results.forEach(r => {
      if (r.group !== last) { last = r.group; body += `<tr class="grp"><td colspan="3">${e(r.group)}</td></tr>`; }
      body += `<tr><td>${e(r.name)}</td><td class="${r.status}">${LABEL[r.status]}</td><td>${e(r.detail)}</td></tr>`;
    });
    const stamp = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "medium" });
    out.innerHTML = `<div class="diag-sum ${cls}" role="status"><h2>${title}</h2><p>${e(sub)}</p>
      <div class="nums"><span>Contrôle du ${e(stamp)}</span><span>${ok} réussi(s)</span><span>${ko} échec(s)</span><span>${na} non vérifiable(s)</span></div></div>
      <div class="scroll"><table class="diag"><thead><tr><th>Contrôle</th><th>Résultat</th><th>Détail</th></tr></thead><tbody>${body}</tbody></table></div>
      <h3 class="h-h3" style="margin:28px 0 8px">Lignes visibles par table</h3>
      <div class="scroll"><table class="diag"><tbody>${TABLES.map(t => `<tr><td>${e(t)}</td><td class="${counts[t] === undefined || counts[t] === null ? "na" : ""}">${counts[t] === undefined || counts[t] === null ? "Non vérifiable" : e(counts[t])}</td></tr>`).join("")}</tbody></table></div>
      <p style="margin-top:18px"><button type="button" class="btn" id="d-again">Relancer le diagnostic</button></p>`;
    document.getElementById("d-again").addEventListener("click", run);
  }

  run();
})();
