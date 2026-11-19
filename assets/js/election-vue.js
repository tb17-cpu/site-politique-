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
  /* Un seul sondage est présenté : le sondage individuel publié (record_kind « poll ») le plus récent de l'élection, quel que
     soit l'institut. Un sondage = un même institut, scénario, date et source ; ses résultats ne sont jamais mêlés à ceux d'un
     autre. Scores tels que publiés : aucun calcul, aucune moyenne. */
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? { d: +m[3], m: +m[2] - 1, y: +m[1] } : null; };
  const terrain = (a, b) => { const x = dmy(a), y = dmy(b);
    if (x && y) return x.m === y.m && x.y === y.y ? `du ${x.d === 1 ? "1er" : x.d} au ${y.d} ${mois[y.m]} ${y.y}` : `du ${x.d} ${mois[x.m]} ${x.y} au ${y.d} ${mois[y.m]} ${y.y}`;
    return y ? `le ${y.d} ${mois[y.m]} ${y.y}` : ""; };
  /* Score affiché tel que publié : une valeur technique inférieure à 1 est présentée « moins de 1 % » (jamais comme un score exact). */
  const score = v => Number(v) < 1 ? "moins de 1 %" : Number(v).toFixed(1).replace(".", ",") + " %";
  const pollBlock = P => {
    const none = `<h2 class="ov-h">Dernier sondage</h2><p class="quiet">Aucun sondage publié pour cette élection.</p>`;
    /* Erreur technique : message distinct de l'absence réelle, selon la nature du problème (détail dans la console). */
    if (P.error) { const txt = P.error === "denied" ? "Les sondages ne sont pas accessibles pour le moment (accès refusé)."
        : P.error === "missing" || P.error === "invalid" ? "Les sondages ne peuvent pas être affichés : la structure de données attendue est indisponible."
        : "Les sondages n’ont pas pu être chargés. Réessayez dans un instant.";
      return `<h2 class="ov-h">Dernier sondage</h2><p class="quiet" role="status" data-poll-error="${e(P.error)}">${e(txt)}</p>`; }
    const all = P.rows.filter(r => r.value_percent != null);
    if (!all.length) return none;
    const key = r => [r.sources && r.sources.id || r.source_id || "", r.pollster || "", r.scenario || "", r.poll_date || "", r.fieldwork_start || ""].join("|");
    const groups = new Map(); all.forEach(r => { const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    /* Plus récent : date de publication de la source la plus récente, puis fin du terrain (poll_date). Un sondage sans date vient
       après ceux qui en ont. Si des sondages restent à égalité parfaite, ils sont tous présentés, chacun dans son propre bloc :
       aucun choix arbitraire, aucun mélange de résultats. */
    const rank = g => [(g[0].sources && g[0].sources.publication_date) || "", g[0].poll_date || ""];
    const cmp = (A, B) => { const a = rank(A), b = rank(B); return a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0; };
    const sorted = [...groups.values()].sort(cmp), top = sorted.filter(g => cmp(g, sorted[0]) === 0)
      .sort((A, B) => String(A[0].pollster || "").localeCompare(String(B[0].pollster || "")) || String(A[0].scenario || "").localeCompare(String(B[0].scenario || "")));
    const one = group => {
      const rows = group.slice().sort((a, b) => b.value_percent - a.value_percent), r0 = rows[0], src = r0.sources;
      const max = Math.max(...rows.map(r => Number(r.value_percent)), 1);
      const commanditaire = ((/\bpour\s+([^,.;()\n·]+)/i.exec([r0.methodology, r0.notes, r0.pollster].filter(Boolean).join(" · ")) || [])[1] || "").trim();
      const meta = [["Institut", r0.pollster && r0.pollster.replace(/\s+pour\s+.*$/i, "")], ["Commanditaire", commanditaire], ["Terrain", terrain(r0.fieldwork_start, r0.poll_date)], ["Échantillon", r0.sample_size ? r0.sample_size.toLocaleString("fr-FR") + " personnes" : ""]].filter(x => x[1]);
      return `<section class="poll" aria-label="Sondage ${e(r0.pollster || "")}">
        <p class="quiet">${e(r0.scenario || "")}</p>
        <ul class="bars">${rows.map((r, i) => { const v = Number(r.value_percent), w = v < 1 ? 1.5 : Math.max(1.5, v / max * 100);
          return `<li${i < 3 ? ' class="top"' : ""}><span class="bar-n">${who(r)}</span><span class="bar-t" role="img" aria-label="${e(score(v))}"><span class="bar-f" style="width:${w.toFixed(1)}%"></span></span><span class="bar-v">${e(score(v))}</span></li>`; }).join("")}</ul>
        <dl class="kv poll-meta">${meta.map(x => `<dt>${e(x[0])}</dt><dd>${e(x[1])}</dd>`).join("")}</dl>
        <p class="quiet poll-note">Scores tels que publiés par l’institut. Un sondage n’est ni une prévision ni un résultat électoral.</p>
        ${src ? `<p class="quiet poll-note">Source : ${UI.link(src.url, src.title || "Source du sondage") || e(src.title || "Source du sondage")}${src.publisher ? ` · ${e(src.publisher)}` : ""}</p>` : ""}
      </section>`;
    };
    return `<h2 class="ov-h">${top.length > 1 ? "Derniers sondages" : "Dernier sondage"}</h2>${top.map(one).join("")}`;
  };
  const U_URL = u => UI.safeUrl(u);

  /* Documents de référence de l'élection : titres cliquables, éditeur, date et nature du document (jamais d'URL brute). */
  const refsBlock = el => {
    const l = (el.election_sources || []).filter(x => x && x.sources);
    if (!l.length) return "";
    return `<h2 class="ov-h">Documents de référence</h2><ul class="refs">${l.map(x => { const s = x.sources;
      return `<li>${UI.link(s.url, s.title || "Document") || e(s.title || "Document")}<small>${[s.publisher, UI.formatSourceType(s.source_type), UI.date(s.publication_date)].filter(Boolean).map(e).join(" · ")}</small></li>`; }).join("")}</ul>`;
  };

  /* Le dossier « Comprendre le pays » est un complément : son absence ou son échec ne touche pas cette page.
     L'échec est tracé dans la console (jamais silencieux) et contrôlé par le diagnostic. */
  const dossierOf = el => DB.countryDossiers().then(l => { const cid = String(el.country_id == null ? "" : el.country_id);
      return l.some(d => Object.keys(d).some(k => /country/i.test(k) && /(^|_)id$|^country$/i.test(k) && String(d[k]) === cid)); },
    err => { console.warn("[Au résultat] Dossier pays indisponible (" + DB.classify(err) + ")", err); return false; });

  Election.need(mount).then(el => {
    if (!el) return;
    const st = Election.status(el);
    document.title = Election.name(el) + " · Au résultat";
    $("p-title").textContent = Election.name(el);
    $("p-label").textContent = "Vue d’ensemble · " + st.label;
    $("p-lede").innerHTML = UI.richInline(el.description) || "Candidatures, programmes, thématiques, comparateur et indicateurs de cette élection.";
    UI.mount(mount, async () => ({ cands: await DB.candidacies(el.id), progs: await DB.programs(el.id), polls: await DB.polls(el.id).catch(err => { const kind = DB.classify(err); console.warn("[sondages] chargement impossible :", kind, err && err.message); return { error: kind, rows: [] }; }), dossier: await dossierOf(el) }), d => {
      const nm = d.progs.reduce((n, p) => n + (p.program_versions || []).reduce((k, v) => k + (v.measures || []).length, 0), 0);
      const sections = [
        ["candidats", "Candidats", d.cands.length ? plural(d.cands.length, "candidature", "candidatures") : "Aucune candidature enregistrée"],
        ["programmes", "Programmes", d.progs.length ? plural(d.progs.length, "programme", "programmes") : "Aucun programme enregistré"],
        ["thematiques", "Thématiques", nm ? plural(nm, "mesure", "mesures") : "Aucune mesure enregistrée"],
        ["comparateur", "Comparateur", "Comparer les mesures de candidats différents"],
        ["indicateurs", "Indicateurs", "Données et sources du pays"]].concat(d.dossier ? [["pays", "Comprendre le pays", "Le contexte politique, économique et institutionnel"]] : []);
      const hrefs = { candidats: "candidats.html", programmes: "programmes.html", thematiques: "thematiques.html", comparateur: "comparateur.html", indicateurs: "indicateurs.html", pays: "pays.html" };
      return `<div class="p-grid">${sections.map(s => `<a class="p-cell" href="${hrefs[s[0]]}"><span class="tag">${e(s[1])}</span><h3>${e(s[2])}</h3></a>`).join("")}</div>
        <h2 class="ov-h">Calendrier</h2>
        ${kv([["Pays", el.countries && el.countries.name], ["Type de scrutin", UI.humanize(el.election_type)], ["Année", el.year],
          ["Date du scrutin", UI.date(el.scheduled_date)], ["Date effective", UI.date(el.actual_date)], ["Second tour", UI.date(el.second_round_date)],
          ["Date limite des parrainages", UI.date(el.sponsorship_deadline)], ["Situation", st.label]]) || `<p class="p-sub quiet">Calendrier non renseigné.</p>`}
        ${pollBlock(d.polls)}${refsBlock(el)}`;
    }, { loading: "Chargement de l’élection…", isEmpty: () => false });
  });
})();
