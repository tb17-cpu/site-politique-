/* Page « Les candidats » : candidatures publiées de l'élection par défaut (Supabase). */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const pct = v => Number(v).toFixed(1).replace(".", ",") + " %";
  const card = (c, t) => {
    const name = UI.person(c.people) || "Candidature";
    const party = c.parties ? (c.parties.name + (c.parties.acronym ? ` (${c.parties.acronym})` : "")) : "";
    const poll = t ? `<p class="cand-poll"><b>${e(pct(t.value))}</b> <small>tendance agrégée · ${e(UI.date(t.date) || "date non précisée")}</small>
        ${t.single ? `<small class="cand-warn">Testé dans un seul sondage : score non robuste, ce n’est pas une moyenne.</small>` : ""}
        ${t.scenario && t.otherScenario ? `<small class="quiet">Scénario : ${e(t.scenario)}</small>` : ""}</p>` : "";
    return `<a class="cand"${UI.partyColor(c.parties) ? ` style="--pc:${UI.partyColor(c.parties)}"` : ""} href="candidat.html#${encodeURIComponent(c.id)}">${UI.avatar(c.people)}
      <div>${t ? `<span class="cand-rank">${t.rank}</span>` : ""}${UI.statusBadge("cand", c.candidacy_status)}
      <h3>${e(name)}</h3><p>${UI.partyDot(c.parties)}${party ? e(party) : '<span class="quiet">Parti non renseigné</span>'}</p>${poll}
      ${c.updated_at ? `<p>Actualisé le ${e(UI.date(c.updated_at))}</p>` : ""}
      ${UI.reliability(c.reliability_level)}</div></a>`;
  };
  const dateOf = r => r.poll_date || r.snapshot_date || "";
  const nameOf = c => UI.person(c.people) || "";
  /* Dernière tendance agrégée de chaque candidature. Si plusieurs scénarios existent à la même date, on retient celui
     qui couvre le plus de candidatures ; jamais de moyenne ni de fusion entre scénarios. */
  function rankByAverage(list, P) {
    const byPerson = new Map(list.map(c => [String(c.people.id), c]));
    const target = r => r.entity_kind === "candidacy" ? list.find(c => String(c.id) === String(r.candidacy_id)) : r.entity_kind === "person" ? byPerson.get(String(r.person_id)) : null;
    const avg = P.averages.filter(r => r.value_percent != null && target(r));
    const cover = new Map(); avg.forEach(r => { const k = r.scenario || ""; (cover.get(k) || cover.set(k, new Set()).get(k)).add(target(r).id); });
    const main = [...cover.entries()].sort((a, b) => b[1].size - a[1].size)[0];
    const mainScn = main ? main[0] : "";
    const best = new Map();
    avg.forEach(r => { const c = target(r), cur = best.get(c.id);
      const better = !cur || dateOf(r) > dateOf(cur) || (dateOf(r) === dateOf(cur) && (r.scenario || "") === mainScn && (cur.scenario || "") !== mainScn);
      if (better) best.set(c.id, r); });
    const pollCount = new Map();
    if (!P.truncated) {
      const seen = new Map();
      P.polls.forEach(r => { const c = target(r); if (!c) return; (seen.get(c.id) || seen.set(c.id, new Set()).get(c.id)).add([r.pollster, r.poll_date || r.snapshot_date].join("|")); });
      seen.forEach((v, k) => pollCount.set(k, v.size));
    }
    const ranked = list.filter(c => best.has(c.id)).map(c => { const r = best.get(c.id);
      return { c, t: { value: r.value_percent, date: dateOf(r), scenario: r.scenario, otherScenario: (r.scenario || "") !== mainScn,
        single: pollCount.get(c.id) === 1 || /un seul sondage|single poll|one poll/i.test(r.aggregation_note || "") } }; })
      .sort((a, b) => b.t.value - a.t.value || nameOf(a.c).localeCompare(nameOf(b.c), "fr"));
    ranked.forEach((x, i) => x.t.rank = i + 1);
    const rest = list.filter(c => !best.has(c.id));
    /* Ordre provisoire sans pourcentage : « provisional_rank » s'il est renseigné en base (saisie éditoriale), sinon
       statut de candidature (déclarée avant non confirmée), parrainages revendiqués, puis ordre alphabétique. */
    const st = c => ({ qualified: 0, nominated: 1, declared: 2, rumored: 3, unconfirmed: 4 })[String(c.candidacy_status || "").toLowerCase()] ?? 5;
    const pr = c => c.provisional_rank == null ? Infinity : Number(c.provisional_rank);
    rest.sort((a, b) => pr(a) - pr(b) || st(a) - st(b) || (b.sponsorship_count_claimed || 0) - (a.sponsorship_count_claimed || 0) || nameOf(a).localeCompare(nameOf(b), "fr"));
    return { ranked, rest, ref: ranked.map(x => x.t.date).sort().pop() };
  }
  const mount = $("c-list");
  Election.need(mount).then(el => { if (!el) return;
  if ($("c-election")) $("c-election").textContent = Election.name(el);
  UI.mount(mount, async () => ({ election: el, list: await DB.candidacies(el.id), polls: await DB.pollRanking(el.id).catch(() => ({ missing: true, averages: [], polls: [], truncated: false })) }), d => {
    const R = d.polls && !d.polls.missing && d.polls.averages.length ? rankByAverage(d.list, d.polls) : null;
    if (R && R.ranked.length) {
      return `<p class="rk-note"><b>Classement par tendance agrégée des sondages</b>${R.ref ? ` · dernière date de référence : ${e(UI.date(R.ref))}` : ""}. Il s’agit d’une tendance agrégée, et non d’une prévision électorale. Un sondage n’est ni une candidature officielle ni un résultat. Le statut de candidature reste indiqué sur chaque fiche : une fiche publiée ne signifie pas qu’une candidature est officiellement déclarée.</p>
        <h3 class="h-h3 grp-h">Classées par intentions de vote (${R.ranked.length})</h3>
        <div class="cand-grid">${R.ranked.map(x => card(x.c, x.t)).join("")}</div>
        ${R.rest.length ? `<h3 class="h-h3 grp-h">Personnalités non testées — classement provisoire (${R.rest.length})</h3>
        <p class="rk-note">Aucune tendance agrégée n’est disponible pour ces personnalités : aucun pourcentage n’est affiché. L’ordre est provisoire (statut de candidature, puis parrainages revendiqués, puis ordre alphabétique) et sera actualisé avec les nouveaux sondages.</p>
        <div class="cand-grid">${R.rest.map(c => card(c)).join("")}</div>` : ""}`;
    }
    /* Sans tendance agrégée : regroupement par statut de candidature. */
    /* Ordre d'affichage : du plus avancé au moins avancé ; valeurs inconnues à la fin. */
    const ORDER = ["qualified", "nominated", "declared", "rumored", "unconfirmed", "withdrawn", "rejected"];
    const rank = g => { const i = ORDER.indexOf(String(g).trim().toLowerCase()); return i < 0 ? ORDER.length : i; };
    const groups = [...new Set(d.list.map(c => c.candidacy_status || ""))].sort((a, b) => rank(a) - rank(b));
    return groups.map(g => `<h3 class="h-h3 grp-h">${e(UI.formatCandidacyStatus(g))}</h3>
      <div class="cand-grid">${d.list.filter(c => (c.candidacy_status || "") === g).map(c => card(c)).join("")}</div>`).join("");
  }, {
    loading: "Chargement des candidatures…",
    isEmpty: d => !d.list.length,
    empty: "<p><b>Aucune candidature n’est publiée pour cette élection pour l’instant.</b></p><p style=\"margin-top:8px\">Une candidature n’apparaît ici qu’après vérification de ses sources officielles. Visibilité médiatique et candidature officielle ne sont jamais confondues.</p>"
  }); });
  const lg = $("c-legend"); if (lg) lg.innerHTML = UI.reliabilityLegend();
})();
