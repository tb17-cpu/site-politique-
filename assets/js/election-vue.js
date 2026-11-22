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
    if (x && y && a.slice(0, 10) === b.slice(0, 10)) return `le ${y.d === 1 ? "1er" : y.d} ${mois[y.m]} ${y.y}`;
    if (x && y) return x.m === y.m && x.y === y.y ? `du ${x.d === 1 ? "1er" : x.d} au ${y.d} ${mois[y.m]} ${y.y}` : `du ${x.d} ${mois[x.m]} ${x.y} au ${y.d} ${mois[y.m]} ${y.y}`;
    return y ? `le ${y.d} ${mois[y.m]} ${y.y}` : ""; };
  /* Score affiché tel que publié : une valeur technique inférieure à 1 est présentée « moins de 1 % » (jamais comme un score exact). */
  const score = v => Number(v) < 1 ? "moins de 1 %" : Number(v).toFixed(1).replace(".", ",") + " %";
  /* ---- Bloc sondages : un sondage à la fois, navigation du plus récent au plus ancien ----
     Un sondage = même source, institut, scénario et dates ; ses résultats ne sont jamais mêlés à ceux d'un autre. Scores tels
     que publiés : aucun calcul, aucune moyenne. Le bloc est rendu en HTML, puis animé par pollWire (état dans PS). */
  let PS = { groups: [], i: 0 };
  const instOf = g => String(g.rows[0].pollster || "").replace(/\s+pour\s+.*$/i, "") || "Institut non précisé";
  const whenOf = g => terrain(g.rows[0].fieldwork_start, g.rows[0].poll_date) || (g.date ? "le " + Scrutin.date(g.date) : "date non précisée");
  const pollOne = group => {
    const rows = group.rows.slice().sort((a, b) => b.value_percent - a.value_percent), r0 = rows[0], src = r0.sources;
    const max = Math.max(...rows.map(r => Number(r.value_percent)), 1);
    const commanditaire = ((/\bpour\s+([^,.;()\n·]+)/i.exec([r0.methodology, r0.notes, r0.pollster].filter(Boolean).join(" · ")) || [])[1] || "").trim();
    const meta = [["Institut", instOf(group)], ["Commanditaire", commanditaire], ["Terrain", terrain(r0.fieldwork_start, r0.poll_date)], ["Échantillon", r0.sample_size ? r0.sample_size.toLocaleString("fr-FR") + " personnes" : ""], ["Méthode", r0.methodology], ["Précisions", r0.notes]].filter(x => x[1]);
    return `<p class="quiet">${e(r0.scenario || "")}</p>
        <ul class="bars">${rows.map((r, i) => { const v = Number(r.value_percent), w = v < 1 ? 1.5 : Math.max(1.5, v / max * 100);
          return `<li${i < 3 ? ' class="top"' : ""}><span class="bar-n">${who(r)}</span><span class="bar-t" role="img" aria-label="${e(score(v))}"><span class="bar-f" style="width:${w.toFixed(1)}%"></span></span><span class="bar-v">${e(score(v))}</span></li>`; }).join("")}</ul>
        <dl class="kv poll-meta">${meta.map(x => `<dt>${e(x[0])}</dt><dd>${e(x[1])}</dd>`).join("")}</dl>
        <p class="quiet poll-note">Scores tels que publiés par l’institut. Un sondage n’est ni une prévision ni un résultat électoral.</p>
        ${src ? `<p class="quiet poll-note">Source : ${UI.link(src.url, src.title || "Source du sondage") || e(src.title || "Source du sondage")}${src.publisher ? ` · ${e(src.publisher)}` : ""}</p>` : ""}`;
  };
  const pollHead = () => { const g = PS.groups[PS.i], n = PS.groups.length;
    return `<div class="ps-now"><b>${e(instOf(g))}</b> <span>${e(whenOf(g))}${PS.i === 0 ? " · le plus récent" : ""}</span> <span class="ps-round">${e(Scrutin.roundLabel(g.round))}</span></div>`; };
  const pollBlock = P => {
    /* Erreur technique : message distinct de l'absence réelle, selon la nature du problème (détail dans la console). */
    if (P.error) { const txt = P.error === "denied" ? "Les sondages ne sont pas accessibles pour le moment (accès refusé)."
        : P.error === "missing" || P.error === "invalid" ? "Les sondages ne peuvent pas être affichés : la structure de données attendue est indisponible."
        : "Les sondages n’ont pas pu être chargés. Réessayez dans un instant.";
      return `<h2 class="ov-h">Sondages</h2><p class="quiet" role="status" data-poll-error="${e(P.error)}">${e(txt)}</p>`; }
    PS = { groups: Scrutin.pollGroups(P.rows), i: 0 };
    const n = PS.groups.length; if (!n) return "";
    const sel = n > 1 ? `<label class="sr-only" for="ps-select">Choisir un sondage</label><select id="ps-select" class="ps-select" data-ps="select">${PS.groups.map((g, k) => `<option value="${k}">${e((g.date ? Scrutin.date(g.date) : "sans date") + " · " + instOf(g))}</option>`).join("")}</select>` : "";
    return `<section class="pollsel" data-pollsel><h2 class="ov-h">Sondages <small class="ps-count">${n} enregistré${n > 1 ? "s" : ""}</small></h2>
      <div class="ps-bar">${n > 1 ? `<button type="button" class="ps-btn" data-ps="older" aria-label="Sondage plus ancien">‹</button>` : ""}
        <div class="ps-mid" data-ps-head>${pollHead()}</div>
        ${n > 1 ? `<button type="button" class="ps-btn" data-ps="newer" aria-label="Sondage plus récent">›</button>` : ""}</div>
      <div class="ps-tools">${sel}<span class="ps-pos quiet" data-ps-pos aria-live="polite">Sondage 1 sur ${n}</span></div>
      <section class="poll ps-panel" data-ps-panel aria-live="polite" aria-label="Sondage affiché">${pollOne(PS.groups[0])}</section></section>`;
  };
  const pollWire = root => {
    const box = root.querySelector("[data-pollsel]"); if (!box) return;
    const panel = box.querySelector("[data-ps-panel]"), n = PS.groups.length;
    const show = k => { k = Math.max(0, Math.min(n - 1, k)); const same = k === PS.i; PS.i = k;
      box.querySelector("[data-ps-head]").innerHTML = pollHead();
      box.querySelector("[data-ps-pos]").textContent = `Sondage ${k + 1} sur ${n}`;
      const sl = box.querySelector("[data-ps=select]"); if (sl) sl.value = String(k);
      const nw = box.querySelector("[data-ps=newer]"), od = box.querySelector("[data-ps=older]"); if (nw) nw.disabled = k === 0; if (od) od.disabled = k === n - 1;
      panel.innerHTML = pollOne(PS.groups[k]);
      if (!same) { panel.classList.remove("ps-in"); void panel.offsetWidth; panel.classList.add("ps-in"); } };
    box.addEventListener("click", ev => { const b = ev.target.closest("button[data-ps]"); if (!b || b.disabled) return; show(PS.i + (b.dataset.ps === "older" ? 1 : -1)); });
    box.addEventListener("change", ev => { if (ev.target.matches("[data-ps=select]")) show(+ev.target.value); });
    show(0);
  };

  /* ---- Rubrique résultats : résultats officiels tour par tour (distincte des sondages) ---- */
  let RS = { rounds: [], i: 0 };
  const resRound = rd => {
    const rows = (rd.candidates || []).filter(x => x.votes != null || x.percent_expressed != null).sort((a, b) => (Number(b.percent_expressed) || 0) - (Number(a.percent_expressed) || 0) || (Number(b.votes) || 0) - (Number(a.votes) || 0));
    const max = Math.max(...rows.map(r => Number(r.percent_expressed) || 0), 1), maxV = Math.max(...rows.map(r => Number(r.votes) || 0), 1);
    const reg = rd.registered_voters, vot = rd.voters, abs = rd.abstentions != null ? rd.abstentions : (reg != null && vot != null ? reg - vot : null);
    const ratio = (a, b) => a != null && b ? Scrutin.pct(a / b * 100) : "";
    const nn = x => x == null ? "" : Scrutin.nb(x);
    const part = [["Inscrits", nn(reg)], ["Votants", nn(vot) + (ratio(vot, reg) ? " (" + ratio(vot, reg) + ")" : "")], ["Abstentions", nn(abs) + (ratio(abs, reg) ? " (" + ratio(abs, reg) + ")" : "")],
      ["Bulletins blancs", nn(rd.blank_votes)], ["Bulletins nuls", nn(rd.null_votes)], ["Suffrages exprimés", nn(rd.expressed_votes)]].filter(x => x[1] && x[1] !== " ");
    const src = rd.sources;
    return `<p class="res-state"><span class="res-badge res-${e(rd.result_status === "final" ? "final" : "prov")}">${e(rd.result_status === "final" ? "Résultats définitifs" : "Résultats provisoires")}</span>${rd.held_on ? ` <span class="quiet">Scrutin du ${e(Scrutin.date(rd.held_on))}</span>` : ""}</p>
      ${rows.length ? `<ul class="bars bars-res">${rows.map(r => { const v = Number(r.percent_expressed), has = r.percent_expressed != null, w = has ? Math.max(1.5, v / max * 100) : Math.max(1.5, (Number(r.votes) || 0) / maxV * 100);
        const tg = Scrutin.tagFor(r, rd, RS.rounds), tag = tg ? `<span class="res-tag${tg.win ? " res-win" : ""}${tg.provisional ? " res-prov" : ""}">${e(tg.text)}</span>` : "";
        return `<li class="${tg ? "top" : ""}"><span class="bar-n">${who(r)}${tag}</span><span class="bar-t" role="img" aria-label="${has ? e(score(v)) : ""}"><span class="bar-f" style="width:${w.toFixed(1)}%"></span></span><span class="bar-v">${has ? e(score(v)) : ""}${r.votes != null ? `<small>${e(Scrutin.nb(r.votes))} voix</small>` : ""}</span></li>`; }).join("")}</ul>` : `<p class="quiet">Scores par candidat non renseignés pour ce tour.</p>`}
      ${part.length ? `<dl class="kv res-part">${part.map(x => `<dt>${e(x[0])}</dt><dd>${e(x[1])}</dd>`).join("")}</dl>` : ""}
      ${rd.notes ? `<p class="quiet poll-note">${e(rd.notes)}</p>` : ""}
      <p class="quiet poll-note">Résultats officiels : votes réellement exprimés, à ne pas confondre avec les sondages.${src ? ` Source : ${UI.link(src.url, src.title || "Source") || e(src.title || "Source")}${src.publisher ? ` · ${e(src.publisher)}` : ""}` : ""}</p>`;
  };
  /* Calendrier : uniquement les dates et informations renseignées ; aucune donnée -> ni titre ni message. */
  const calendar = (el, st) => { const k = kv([["Pays", el.countries && el.countries.name], ["Type de scrutin", UI.humanize(el.election_type)], ["Année", el.year],
      ["Date du scrutin", UI.date(el.scheduled_date)], ["Date effective", UI.date(el.actual_date)], ["Second tour", UI.date(el.second_round_date)],
      ["Date limite des parrainages", UI.date(el.sponsorship_deadline)], ["Situation", st.label]]);
    return k ? `<h2 class="ov-h">Calendrier</h2>${k}` : ""; };
  const resultsBlock = R => {
    /* Aucun résultat publié : rien du tout (ni bloc, ni titre, ni emplacement réservé, ni message de remplacement). */
    if (R.error) return `<section class="res" data-results="error"><h2 class="ov-h">Résultats</h2>${UI.loadNotice("results", R.error)}</section>`;
    RS = { rounds: Scrutin.rounds(R), i: 0 }; RS.i = RS.rounds.length - 1;
    if (!RS.rounds.length) return "";
    return `<section class="res" data-results="ok"><h2 class="ov-h">Résultats officiels</h2>
      <div class="res-tabs" role="tablist" aria-label="Tours de scrutin">${RS.rounds.map((rd, k) => `<button type="button" role="tab" class="res-tab" tabindex="${k === RS.i ? 0 : -1}" id="rt-${k}" aria-controls="res-panel" aria-selected="${k === RS.i}" data-rt="${k}">${e(Scrutin.roundName(rd.round_number))}</button>`).join("")}</div>
      <div class="res-panel ps-panel" id="res-panel" role="tabpanel" data-res-panel>${resRound(RS.rounds[RS.i])}</div></section>`;
  };
  const resWire = root => {
    const box = root.querySelector("[data-results=ok]"); if (!box) return;
    box.addEventListener("keydown", ev => { const b = ev.target.closest("[data-rt]"); if (!b || !/^(ArrowLeft|ArrowRight|Home|End)$/.test(ev.key)) return;
      const t = [...box.querySelectorAll("[data-rt]")], k = ev.key === "Home" ? 0 : ev.key === "End" ? t.length - 1 : (t.indexOf(b) + (ev.key === "ArrowRight" ? 1 : -1) + t.length) % t.length;
      ev.preventDefault(); t[k].focus(); t[k].click(); });
    box.addEventListener("click", ev => { const b = ev.target.closest("[data-rt]"); if (!b) return; RS.i = +b.dataset.rt;
      box.querySelectorAll("[data-rt]").forEach((x, k) => { x.setAttribute("aria-selected", String(k === RS.i)); x.tabIndex = k === RS.i ? 0 : -1; });
      const p = box.querySelector("[data-res-panel]"); p.innerHTML = resRound(RS.rounds[RS.i]); p.classList.remove("ps-in"); void p.offsetWidth; p.classList.add("ps-in"); });
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
    $("p-label").textContent = "Vue d’ensemble" + (st.label ? " · " + st.label : "");
    $("p-lede").innerHTML = UI.richInline(el.description) || "Candidatures, programmes, thématiques, comparateur et indicateurs de cette élection.";
    UI.mount(mount, async () => ({ cands: await DB.candidacies(el.id), progs: await DB.programs(el.id), polls: await DB.settle(DB.polls(el.id), { rows: [] }, "Sondages"), results: await DB.settle(DB.results(el.id), { rounds: [] }, "Résultats"), dossier: await dossierOf(el) }), d => {
      const nm = d.progs.reduce((n, p) => n + (p.program_versions || []).reduce((k, v) => k + (v.measures || []).length, 0), 0);
      const sections = [
        ["candidats", "Candidats", d.cands.length ? plural(d.cands.length, "candidature", "candidatures") : "Aucune candidature enregistrée"],
        ["programmes", "Programmes", d.progs.length ? plural(d.progs.length, "programme", "programmes") : "Aucun programme enregistré"],
        ["thematiques", "Thématiques", nm ? plural(nm, "mesure", "mesures") : "Aucune mesure enregistrée"],
        ["comparateur", "Comparateur", "Comparer les mesures de candidats différents"],
        ["indicateurs", "Indicateurs", "Données et sources du pays"]].concat(d.dossier ? [["pays", "Comprendre le pays", "Le contexte politique, économique et institutionnel"]] : []);
      const hrefs = { candidats: "candidats.html", programmes: "programmes.html", thematiques: "thematiques.html", comparateur: "comparateur.html", indicateurs: "indicateurs.html", pays: "pays.html" };
      return `<div class="p-grid">${sections.map(s => `<a class="p-cell" href="${hrefs[s[0]]}"><span class="tag">${e(s[1])}</span><h3>${e(s[2])}</h3></a>`).join("")}</div>
        ${calendar(el, st)}
        ${resultsBlock(d.results)}${pollBlock(d.polls)}${refsBlock(el)}`;
    }, { loading: "Chargement de l’élection…", isEmpty: () => false, after: el => { pollWire(el); resWire(el); } });
  });
})();
