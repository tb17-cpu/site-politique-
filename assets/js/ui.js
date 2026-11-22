/* Composants d'interface partagés par les pages alimentées par Supabase :
   états (chargement, vide, erreur), niveau de fiabilité, formats. */
(function () {
  const e = esc;
  const U = {};

  U.safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
  U.date = iso => {
    if (!iso) return "";
    const d = new Date(String(iso).length <= 10 ? iso + "T12:00:00" : iso);
    return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };
  U.person = p => p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : "";
  /* « second_round » → « Second round » : affichage lisible d'une valeur technique sans en inventer le sens. */
  U.humanize = s => s ? String(s).replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase()) : "";
  /* ---------- Libellés français des champs de statut ----------
     Chaque champ a sa propre table : une même valeur technique (« qualified ») n'a pas le même sens
     pour une candidature, des parrainages ou le second tour. Valeur inconnue : libellé de repli,
     jamais de traduction inventée ; la valeur technique reste visible dans l'infobulle. */
  const norm = v => String(v == null ? "" : v).trim().toLowerCase().replace(/[\s-]+/g, "_");
  const table = (map, fallback) => {
    const f = v => { const k = norm(v); return k === "" ? { label: "Non précisé", known: false, raw: "" } : map[k] ? { label: map[k], known: true, raw: String(v) } : { label: fallback, known: false, raw: String(v) }; };
    return f;
  };
  /* Valeurs constatées dans la base (novembre 2026). Toute autre valeur : libellé de repli, jamais de traduction supposée. */
  const CANDIDACY = table({
    declared: "Candidature déclarée", unconfirmed: "Candidature non confirmée",
    /* Valeurs prévues par la maquette éditoriale, pas encore constatées en base : */
    rumored: "Candidature évoquée", nominated: "Candidat investi", qualified: "Qualifié pour le premier tour",
    withdrawn: "Retiré", rejected: "Candidature rejetée",
    validated: "Candidature officiellement validée", officially_validated: "Candidature officiellement validée", official: "Candidature officiellement validée",
    first_round: "Premier tour", second_round: "Qualifié pour le second tour", qualified_second_round: "Qualifié pour le second tour",
    elected: "Élu", winner: "Élu", eliminated: "Battu / éliminé", defeated: "Battu / éliminé",
    dropped_out: "Désisté", stepped_down: "Désisté", invalidated: "Candidature invalidée"
  }, "Statut à préciser");
  /* « claimed_threshold » = seuil REVENDIQUÉ, jamais « validé officiellement ». */
  const SPONSORSHIP = table({
    collecting: "Collecte des parrainages en cours", claimed_threshold: "Seuil de 500 parrainages revendiqué", unknown: "Situation non documentée"
  }, "Statut des parrainages à préciser");
  const SECOND = table({
    not_reached: "Second tour non encore déterminé"
  }, "Situation au second tour à préciser");
  /* measure_relations est vide : aucune valeur n'est présumée. */
  const RELATION = table({}, "Relation entre mesures");
  const SOURCE_TYPE = table({
    official_document: "Document officiel", press_article: "Article de presse", public_report: "Rapport public", other: "Autre"
  }, "Type de source à préciser");
  const SOURCE_LINK = table({
    other: "Autre", press_confirmation: "Confirmation par la presse", sponsorship_claim: "Déclaration de parrainages"
  }, "Nature du lien à préciser");
  const wrap = f => v => f(v).label;
  U.formatCandidacyStatus = wrap(CANDIDACY);
  U.formatSponsorshipStatus = wrap(SPONSORSHIP);
  U.formatSecondRoundStatus = wrap(SECOND);
  U.formatRelationType = wrap(RELATION);
  /* Type de relation : libellé générique + valeur technique visible, sans traduction arbitraire. */
  U.relationHtml = v => { const f = RELATION(v); return f.raw ? `${e(f.label)} <small title="Valeur technique">(type : ${e(f.raw)})</small>` : e(f.label); };
  U.formatSourceType = wrap(SOURCE_TYPE);
  U.formatSourceLink = wrap(SOURCE_LINK);
  U.isKnownCandidacyStatus = v => CANDIDACY(v).known;
  U.isKnownSponsorshipStatus = v => SPONSORSHIP(v).known;
  U.isKnownSecondRoundStatus = v => SECOND(v).known;
  /* Pastille de statut : libellé français, valeur technique en infobulle. */
  U.statusBadge = (fmt, v) => { const f = { cand: CANDIDACY, spons: SPONSORSHIP, second: SECOND }[fmt](v);
    return `<span class="statut"${f.raw ? ` title="${e("Valeur technique : " + f.raw)}"` : ""}>${e(f.label)}</span>`; };
  U.statusText = (fmt, v) => { const f = { cand: CANDIDACY, spons: SPONSORSHIP, second: SECOND }[fmt](v);
    return f.raw && !f.known ? `<span title="${e("Valeur technique : " + f.raw)}">${e(f.label)}</span>` : e(f.label); };
  /* Statut de CANDIDATURE à afficher : { label, note, closed } ou null. Seules les valeurs de candidature sont admises (avant le vote) et les
     fins de candidature (« closed » : retrait, désistement, invalidation, rejet). Les valeurs d'ISSUE (elected, winner, eliminated, defeated,
     second_round, qualified_second_round, second_round_status, second_round_qualified_at) ne sont jamais une preuve : elles ne produisent
     rien ici ; élu / qualifié / éliminé / battu ne se déduisent que des résultats (Scrutin.status). Valeur absente ou inconnue : null. */
  const PHASE = ["declared", "unconfirmed", "rumored", "nominated", "qualified", "validated", "officially_validated", "official", "first_round"];
  const CLOSED = ["withdrawn", "rejected", "dropped_out", "stepped_down", "invalidated"];
  U.candidacyStage = c => {
    if (!c) return null;
    const k = norm(c.candidacy_status), closed = CLOSED.indexOf(k) >= 0;
    if (!closed && PHASE.indexOf(k) < 0) return null;
    return { label: CANDIDACY(c.candidacy_status).label, note: k === "declared" && c.announcement_date ? "annoncée le " + U.date(c.announcement_date) : "", closed };
  };
  U.link = (u, label) => U.safeUrl(u) ? `<a href="${e(U.safeUrl(u))}" rel="noopener" target="_blank">${e(label || u)}</a>` : e(label || "");

  /* ---------- Fiabilité : un seul composant ---------- */
  const REL = {
    high:       { label: "Élevée",       n: 3, text: "Information appuyée par une source solide et directement vérifiable." },
    medium:     { label: "Moyenne",      n: 2, text: "Information appuyée par une source, avec des limites ou une vérification partielle." },
    low:        { label: "Faible",       n: 1, text: "Information fragile : source indirecte, ancienne ou difficilement vérifiable." },
    unverified: { label: "Non vérifiée", n: 0, text: "Information non vérifiée." }
  };
  /* Badge. o.notes = explication, o.checked = date de vérification, o.full = affiche le texte explicatif. */
  U.reliability = (level, o = {}) => {
    const r = REL[level] || REL.unverified, lv = REL[level] ? level : "unverified";
    const title = `Fiabilité documentaire : ${r.label}. ${r.text} Elle mesure la solidité de l’information, pas la pertinence politique de la proposition.`;
    const bars = [1, 2, 3].map(i => `<i class="${i <= r.n ? "on" : ""}"></i>`).join("");
    const extra = [
      o.full ? `<span class="rel-text">${e(r.text)}</span>` : "",
      o.notes ? `<span class="rel-text">${e(o.notes)}</span>` : "",
      o.checked ? `<span class="rel-text">Vérifié le ${e(U.date(o.checked))}</span>` : ""
    ].join("");
    return `<span class="rel rel-${lv}" title="${e(title)}"><span class="rel-head"><span class="rel-bars" aria-hidden="true">${bars}</span><span class="rel-label">Fiabilité : ${e(r.label)}</span></span>${extra}</span>`;
  };
  U.reliabilityLegend = () => `<div class="rel-legend"><p class="p-sub" style="margin:0 0 10px">La fiabilité mesure la solidité documentaire d’une information, pas la pertinence politique d’une proposition. Une information de fiabilité faible reste affichée, avec son incertitude.</p>` +
    Object.keys(REL).map(k => U.reliability(k, { full: true })).join("") + `</div>`;

  /* ---------- Statut de formalisation d'une mesure (remplace la fiabilité sur les mesures) ---------- */
  const FS = {
    official_program:    ["Programme officiel publié du candidat", "Proposition inscrite dans le programme officiel publié par le candidat.", "Programme officiel"],
    party_position:      ["Position officielle du parti", "Proposition portée par une position officielle du parti du candidat.", "Position du parti"],
    candidate_pledge:    ["Engagement public du candidat", "Engagement pris publiquement par le candidat.", "Engagement public"],
    recent_announcement: ["Annonce récente non intégrée à un programme", "Annonce récente, pas encore inscrite dans un programme.", "Annonce récente"],
    press_reported:      ["Information rapportée par la presse, à confirmer", "Information rapportée par la presse, à confirmer auprès du candidat ou de son parti.", "Presse, à confirmer"]
  };
  /* f = { status, date, note, source } (DB.formalizations). Rien n'est affiché sans statut valide.
     Pas de paragraphe d'explication : la source de référence est dans l'infobulle et dans la liste des sources de la fiche.
     o.short : libellé court (cartes de mesures). Le libellé complet reste accessible : infobulle et texte pour lecteur d'écran ; la légende dépliable le détaille. */
  U.formalization = (f, o = {}) => {
    if (!f || !FS[f.status]) return "";
    const [label, text, short] = FS[f.status], src = f.source;
    const title = `${label}${f.date ? " — référence du " + U.date(f.date) : ""}${src && src.title ? " — " + src.title : ""}. ${text}`;
    const inner = o.short ? `<span aria-hidden="true">${e(short)}</span><span class="sr-only">${e(label)}</span>` : e(label);
    const badge = `<span class="fs fs-${f.status}" title="${e(title)}"><i aria-hidden="true"></i>${inner}</span>`;
    return badge;
  };

  /* Légende repliable « Comment lire les statuts » : une ligne par statut réellement présent sur la page (statuts = liste de clés). */
  U.formalizationLegend = statuses => {
    const keys = Object.keys(FS).filter(k => (statuses || []).includes(k));
    if (!keys.length) return "";
    return `<details class="m-help"><summary>Comment lire les statuts</summary><div class="m-legend">${keys.map(k => `<div><span class="fs fs-${k}"><i aria-hidden="true"></i>${e(FS[k][0])}</span><span>${e(FS[k][1])}</span></div>`).join("")}</div></details>`;
  };

  /* ---------- Texte éditorial : rendu Markdown commun ----------
     Les textes saisis dans Supabase restent du Markdown (jamais du HTML) ; toute page qui affiche un champ rédigé passe par ces deux
     fonctions, qui s'appuient sur le moteur unique assets/js/markdown.js (tout est échappé avant mise en forme, liens http(s) seulement).
     Sans le moteur (script absent), le texte est simplement échappé : aucune injection possible, aucun rendu perdu.
     U.rich(v, o)       : blocs (paragraphes, ## sous-titres, listes à puces et numérotées, **gras**…) dans <div class="md md--rich">.
                          o.headingBase = niveau du « # » (3 par défaut : « ## » devient un h4) ; o.cell = variante compacte (tableaux).
     U.richInline(v)    : version « une ligne » pour les contextes sans bloc (<p>, citation, bulle) : gras, italique, liens, sauts de ligne. */
  const mdText = v => String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim();
  U.rich = (v, o = {}) => {
    const t = mdText(v); if (!t) return "";
    const cls = "md md--rich" + (o.cell ? " md--cell" : "");
    if (!window.MD) return `<div class="${cls}"><p>${e(t).replace(/\n+/g, "<br>")}</p></div>`;
    return `<div class="${cls}">${window.MD.render(t, { headingBase: o.headingBase || 3, breaks: true })}</div>`;
  };
  U.richInline = v => {
    const t = mdText(v); if (!t) return "";
    if (!window.MD) return e(t).replace(/\n+/g, "<br>");
    return window.MD.inline(t.replace(/^\s{0,3}#{1,6}\s+/gm, "")).replace(/\n+/g, "<br>");
  };

  /* ---------- États ---------- */
  U.loadingHtml = (msg) => `<div class="st st-load" role="status"><span class="spin" aria-hidden="true"></span>${e(msg || "Chargement…")}</div>`;
  U.emptyHtml = (msg) => `<div class="p-empty">${msg || "Aucun contenu disponible."}</div>`;
  U.errorHtml = (err) => `<div class="st st-err" role="alert"><p><b>Impossible d’afficher ce contenu.</b></p><p>${e(DB.humanMessage(err))}</p><p><button type="button" class="btn" data-retry>Réessayer</button></p></div>`;

  /* Message discret quand un chargement COMPLÉMENTAIRE a échoué (distinct d'une absence réelle de données, qui n'affiche rien).
     what : « results » (informations électorales), « polls » (sondages) ou « statuses » (statuts éditoriaux des mesures) ; kind : nature de l'erreur (DB.classify). */
  U.loadNotice = (what, kind) => { const t = what === "statuses" ? "Les statuts éditoriaux des mesures n’ont pas pu être chargés."
      : what === "polls"
      ? (kind === "denied" ? "Les sondages ne sont pas accessibles pour le moment (accès refusé)." : "Les sondages n’ont pas pu être chargés.")
      : (kind === "denied" ? "Les informations électorales ne sont pas accessibles pour le moment (accès refusé)." : "Les informations électorales n’ont pas pu être chargées.");
    return `<p class="quiet load-note" role="status" data-load-error="${what}:${e(kind || "error")}">${e(t)}</p>`; };
  /* Statut de candidature « fermé » seul (retrait, désistement…) : fiable sans résultats. Sert quand les résultats n'ont pas pu être chargés :
     aucun autre statut électoral (déclarée, qualifié, élu…) n'est alors affiché. */
  U.closedStage = c => { const s = U.candidacyStage(c); return s && s.closed ? s : null; };

  /* mount(el, load, render, {empty, isEmpty, loading}) : charge, puis rend ; gère chargement, vide, erreur. */
  U.mount = async function mount(el, load, render, o = {}) {
    if (!el) return;
    el.setAttribute("aria-busy", "true");
    el.innerHTML = U.loadingHtml(o.loading);
    try {
      const data = await load();
      el.removeAttribute("aria-busy");
      const empty = o.isEmpty ? o.isEmpty(data) : (data == null || (Array.isArray(data) && !data.length));
      el.innerHTML = empty ? U.emptyHtml(o.empty) : render(data);
      if (!empty && o.after) o.after(el, data);
    } catch (err) {
      el.removeAttribute("aria-busy");
      el.innerHTML = U.errorHtml(err);
      const b = el.querySelector("[data-retry]");
      if (b) b.addEventListener("click", () => mount(el, load, render, o));
    }
  };

  const nk = v => String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

  /* Couleur du parti : lue dans parties.political_color, jamais codée en dur ; absente ou invalide : style neutre.
     Elle est indépendante du positionnement gauche-droite. */
  U.partyColor = pt => { const c = pt && String(pt.political_color || "").trim(); return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : ""; };
  /* Liseré des cartes candidats : toujours présent. Ordre de priorité :
     1. candidacies.political_position_uncertain = true : jaune ocre, même si le parti a une couleur ;
     2. parties.political_color (jamais modifiée ni écrasée) ;
     3. à défaut, couleur du positionnement de la candidature (candidacies.political_position) ;
     4. sinon jaune ocre (candidat sans parti ni classification claire). */
  const COL = { red: "#CC2443", green: "#2F7D32", ocre: "#B58A22", pink: "#D9739F", blue: "#1F4FA3" };
  const POS = {
    far_left: ["Extrême gauche", COL.red], left: ["Gauche", COL.red], center_left: ["Centre gauche", COL.pink], green: ["Écologistes", COL.green],
    center: ["Centre", COL.ocre], center_right: ["Centre droit", COL.blue], right: ["Droite", COL.blue], far_right: ["Extrême droite", COL.blue]
  };
  const POS_ALIAS = { extreme_gauche: "far_left", gauche: "left", centre_gauche: "center_left", ecologiste: "green", ecologistes: "green", ecologist: "green", ecologists: "green", ecology: "green", greens: "green",
    centre: "center", centre_droit: "center_right", droite: "right", extreme_droite: "far_right" };
  const posKey = v => { const k = nk(v).replace(/[\s-]+/g, "_"); const a = POS_ALIAS[k] || k; return POS[a] ? a : ""; };
  /* Libellé français d'une valeur de positionnement ; valeur inconnue : chaîne vide, sans erreur. */
  U.positionName = v => { const k = posKey(v); return k ? POS[k][0] : ""; };
  U.candidacyColor = c => {
    if (c && c.political_position_uncertain === true) return COL.ocre;
    const pc = U.partyColor(c && c.parties); if (pc) return pc;
    const k = posKey(c && c.political_position); return k ? POS[k][1] : COL.ocre;
  };
  U.partyDot = pt => U.partyColor(pt) ? `<i class="party-dot" style="--pc:${U.partyColor(pt)}" aria-hidden="true"></i>` : "";

  /* ---------- Portrait ----------
     Photographie officielle si une URL est publiée ; sinon emplacement neutre avec indication explicite.
     Cadrage identique pour tous : 3/4, recadrage par le haut. Aucune image n'est jamais inventée. */
  const SIL = '<svg viewBox="0 0 90 120" aria-hidden="true" focusable="false"><circle cx="45" cy="42" r="19"/><path d="M8 120c0-28 16-44 37-44s37 16 37 44z"/></svg>';
  /* Une page de fichier Wikimedia Commons (…/wiki/File:Nom.jpg) n'est pas une image : on utilise le lien direct officiel Special:FilePath. */
  const imgUrl = u => { const m = /^https?:\/\/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/i.exec(u || ""); return m ? "https://commons.wikimedia.org/wiki/Special:FilePath/" + m[1].slice(5) + "?width=600" : u; };
  U.portrait = (p, size) => {
    const lg = size === "lg", name = U.person(p) || "Candidat", has = !!(p && U.safeUrl(p.photo_url));
    const ph = `<span class="portrait-ph" role="img" aria-label="Photographie non disponible">${SIL}</span>`;
    const img = has
      ? `<img src="${e(imgUrl(U.safeUrl(p.photo_url)))}" alt="${e("Photographie de " + name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML=this.dataset.ph" data-ph="${e(ph)}">` : ph;
    /* Crédit et source de la photographie : affichés quand ils sont renseignés (fiche détaillée). */
    const credit = has && lg && p.photo_credit ? e(p.photo_credit) : "", src = has && lg && U.safeUrl(p.photo_source_url);
    const cap = !has ? "Photographie non disponible" : "";
    const tail = (credit || src) ? `<figcaption class="credit">${credit ? "Photo : " + credit : ""}${credit && src ? " · " : ""}${src ? `<a href="${e(src)}" target="_blank" rel="noopener">Source de la photo</a>` : ""}</figcaption>` : (cap ? `<figcaption>${e(cap)}</figcaption>` : "");
    return `<figure class="portrait ${lg ? "portrait--lg" : "portrait--sm"}"><div class="portrait-box">${img}</div>${tail}</figure>`;
  };
  U.avatar = (p, big) => U.portrait(p, big ? "lg" : "sm");

  /* ---------- Positionnement : étiquette courte du parti (parties.political_position_label) ----------
     Rien n'est affiché si le parti ou son étiquette n'est pas renseigné. Ce n'est pas une appréciation des mesures. */
  U.positionLabel = c => { const l = c && c.parties && c.parties.political_position_label; return typeof l === "string" && l.trim() ? l.trim() : ""; };
  U.positionBlock = c => { const l = U.positionLabel(c); return l ? `<span class="pos-tag">${e(l)}</span>` : ""; };

  window.UI = U;
})();
