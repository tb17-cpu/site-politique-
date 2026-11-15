/* Vue d'ensemble d'une élection : dates, description, compteurs réels, accès aux rubriques. Données : Supabase. */
(function () {
  const $ = id => document.getElementById(id), e = esc, mount = $("e-main");
  const kv = rows => { const r = rows.filter(x => x[1]); return r.length ? `<dl class="kv">${r.map(x => `<dt>${e(x[0])}</dt><dd>${e(x[1])}</dd>`).join("")}</dl>` : ""; };
  const plural = (n, s, p) => `${n} ${n > 1 ? p : s}`;

  const pname = x => [x.first_name, x.last_name].filter(Boolean).join(" ");
  const who = r => {
    if (r.entity_kind === "candidacy") { const c = r.candidacies, party = c.parties && c.parties.acronym; return `<b>${e(c.people ? pname(c.people) : "")}</b>${party ? ` <small>${e(party)}</small>` : ""}`; }
    if (r.entity_kind === "party") return `<b>${e(r.parties.name)}</b>`;
    if (r.entity_kind === "person") return `<b>${e(pname(r.people))}</b>`;
    return `<b>${e(r.entity_label)}</b>`;
  };
  /* Un seul sondage est présenté : celui désigné ci-dessous. Scores tels que publiés : aucun calcul, aucune moyenne.
     Sélection : sondage individuel (record_kind « poll ») de cet institut et de ce scénario, le plus récent. */
  const FEATURED = { pollster: /opinionway/i, scenario: /hypoth[èe]se\s*1/i };
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? { d: +m[3], m: +m[2] - 1, y: +m[1] } : null; };
  const terrain = (a, b) => { const x = dmy(a), y = dmy(b);
    if (x && y) return x.m === y.m && x.y === y.y ? `du ${x.d === 1 ? "1er" : x.d} au ${y.d} ${mois[y.m]} ${y.y}` : `du ${x.d} ${mois[x.m]} ${x.y} au ${y.d} ${mois[y.m]} ${y.y}`;
    return y ? `le ${y.d} ${mois[y.m]} ${y.y}` : ""; };
  /* Score affiché tel que publié : une valeur technique inférieure à 1 est présentée « moins de 1 % » (jamais comme un score exact). */
  const score = v => Number(v) < 1 ? "moins de 1 %" : Number(v).toFixed(1).replace(".", ",") + " %";
  const pollBlock = P => {
    if (P.missing) return "";
    const cand = P.rows.filter(r => FEATURED.pollster.test(r.pollster || "") && FEATURED.scenario.test(r.scenario || "") && r.value_percent != null);
    if (!cand.length) return "";
    const key = r => [r.pollster, r.scenario, r.poll_date].join("|"), latest = cand.map(r => r.poll_date || "").sort().pop();
    const rows = cand.filter(r => (r.poll_date || "") === latest).sort((a, b) => b.value_percent - a.value_percent), r0 = rows[0], src = r0.sources;
    const max = Math.max(...rows.map(r => Number(r.value_percent)), 1);
    const commanditaire = ((/\bpour\s+([^,.;()\n·]+)/i.exec([r0.methodology, r0.notes, r0.pollster].filter(Boolean).join(" · ")) || [])[1] || "").trim();
    const meta = [["Institut", r0.pollster && r0.pollster.replace(/\s+pour\s+.*$/i, "")], ["Commanditaire", commanditaire], ["Terrain", terrain(r0.fieldwork_start, r0.poll_date)], ["Échantillon", r0.sample_size ? r0.sample_size.toLocaleString("fr-FR") + " personnes" : ""]].filter(x => x[1]);
    return `<h2 class="ov-h">Dernier sondage — premier tour</h2>
      <section class="poll" aria-label="Sondage ${e(r0.pollster || "")}">
        <p class="quiet">${e(r0.scenario || "")}</p>
        <ul class="bars">${rows.map(r => { const v = Number(r.value_percent), w = v < 1 ? 1.5 : Math.max(1.5, v / max * 100);
          return `<li><span class="bar-n">${who(r)}</span><span class="bar-t" role="img" aria-label="${e(score(v))}"><span class="bar-f" style="width:${w.toFixed(1)}%"></span></span><span class="bar-v">${e(score(v))}</span></li>`; }).join("")}</ul>
        <dl class="kv poll-meta">${meta.map(x => `<dt>${e(x[0])}</dt><dd>${e(x[1])}</dd>`).join("")}</dl>
        <p class="quiet poll-note">Scores tels que publiés par l’institut. Un sondage n’est ni une prévision ni un résultat électoral.${src && U_URL(src.url) ? ` <a href="${e(U_URL(src.url))}" target="_blank" rel="noopener">Notice officielle de la Commission des sondages</a>` : ""}</p>
      </section>`;
  };
  const U_URL = u => UI.safeUrl(u);

  /* Documents de référence de l'élection : titres cliquables, éditeur, date et nature du document (jamais d'URL brute). */
  const refsBlock = el => {
    const l = (el.election_sources || []).filter(x => x && x.sources);
    if (!l.length) return "";
    return `<h2 class="ov-h">Documents de référence</h2><ul class="refs">${l.map(x => { const s = x.sources;
      return `<li>${UI.link(s.url, s.title || "Document") || e(s.title || "Document")}<small>${[s.publisher, UI.formatSourceType(s.source_type), UI.date(s.publication_date)].filter(Boolean).map(e).join(" · ")}</small></li>`; }).join("")}</ul>`;
  };

  Election.need(mount).then(el => {
    if (!el) return;
    const st = Election.status(el);
    document.title = Election.name(el) + " · Au résultat";
    $("p-title").textContent = Election.name(el);
    $("p-label").textContent = "Vue d’ensemble · " + st.label;
    $("p-lede").textContent = el.description || "Candidatures, programmes, thématiques, comparateur et indicateurs de cette élection.";
    UI.mount(mount, async () => ({ cands: await DB.candidacies(el.id), progs: await DB.programs(el.id), polls: await DB.polls(el.id).catch(() => ({ missing: true, rows: [] })) }), d => {
      const nm = d.progs.reduce((n, p) => n + (p.program_versions || []).reduce((k, v) => k + (v.measures || []).length, 0), 0);
      const sections = [
        ["candidats", "Candidats", d.cands.length ? plural(d.cands.length, "candidature", "candidatures") : "Aucune candidature enregistrée"],
        ["programmes", "Programmes", d.progs.length ? plural(d.progs.length, "programme", "programmes") : "Aucun programme enregistré"],
        ["thematiques", "Thématiques", nm ? plural(nm, "mesure", "mesures") : "Aucune mesure enregistrée"],
        ["comparateur", "Comparateur", "Comparer les mesures de candidats différents"],
        ["indicateurs", "Indicateurs", "Données et sources du pays"]];
      const hrefs = { candidats: "candidats.html", programmes: "programmes.html", thematiques: "thematiques.html", comparateur: "comparateur.html", indicateurs: "indicateurs.html" };
      return `<div class="p-grid">${sections.map(s => `<a class="p-cell" href="${hrefs[s[0]]}"><span class="tag">${e(s[1])}</span><h3>${e(s[2])}</h3></a>`).join("")}</div>
        ${pollBlock(d.polls)}
        <h2 class="ov-h">Calendrier</h2>
        ${kv([["Pays", el.countries && el.countries.name], ["Type de scrutin", UI.humanize(el.election_type)], ["Année", el.year],
          ["Date du scrutin", UI.date(el.scheduled_date)], ["Date effective", UI.date(el.actual_date)], ["Second tour", UI.date(el.second_round_date)],
          ["Date limite des parrainages", UI.date(el.sponsorship_deadline)], ["Situation", st.label]]) || `<p class="p-sub quiet">Calendrier non renseigné.</p>`}${refsBlock(el)}`;
    }, { loading: "Chargement de l’élection…", isEmpty: () => false });
  });
})();
