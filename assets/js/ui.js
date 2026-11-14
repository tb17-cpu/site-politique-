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
    withdrawn: "Candidature retirée", rejected: "Candidature rejetée"
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
  U.link = (u, label) => U.safeUrl(u) ? `<a href="${e(U.safeUrl(u))}" rel="noopener" target="_blank">${e(label || u)}</a>` : e(label || "");

  /* ---------- Fiabilité : un seul composant ---------- */
  const REL = {
    high:       { label: "Élevée",       n: 3, text: "Information appuyée par une source solide et directement vérifiable." },
    medium:     { label: "Moyenne",      n: 2, text: "Information appuyée par une source, avec des limites ou une vérification partielle." },
    low:        { label: "Faible",       n: 1, text: "Information fragile : source indirecte, ancienne ou difficilement vérifiable." },
    unverified: { label: "Non vérifiée", n: 0, text: "Information pas encore vérifiée." }
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

  /* ---------- États ---------- */
  U.loadingHtml = (msg) => `<div class="st st-load" role="status"><span class="spin" aria-hidden="true"></span>${e(msg || "Chargement…")}</div>`;
  U.emptyHtml = (msg) => `<div class="p-empty">${msg || "Aucun contenu publié pour l’instant."}</div>`;
  U.errorHtml = (err) => `<div class="st st-err" role="alert"><p><b>Impossible d’afficher ce contenu.</b></p><p>${e(DB.humanMessage(err))}</p><p><button type="button" class="btn" data-retry>Réessayer</button></p></div>`;

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

  /* ---------- Positionnement politique (échelle gauche-droite en cinq niveaux) ----------
     Lecture éditoriale d'Au résultat : distincte de l'étiquette du candidat, jamais déduite du nom du parti.
     Données : colonnes de la candidature (political_position, political_position_note, political_position_uncertain) : propre à l'élection. */
  const SCALE = [
    { key: "left", label: "Gauche", color: "#c8323c" },
    { key: "center_left", label: "Centre gauche", color: "#e585a2" },
    { key: "center", label: "Centre", color: "#efc83a" },
    { key: "center_right", label: "Centre droit", color: "#7db8e8" },
    { key: "right", label: "Droite", color: "#1b4a9b" }
  ];
  U.positionOf = c => {
    if (!c) return null;
    const k = nk(c.political_position).replace(/[\s-]+/g, "_");
    return SCALE.some(x => x.key === k) ? { key: k, note: c.political_position_note, uncertain: !!c.political_position_uncertain } : null;
  };
  U.positionBlock = c => {
    const pos = U.positionOf(c), i = pos ? SCALE.findIndex(x => x.key === pos.key) : -1;
    const intro = `<p class="quiet">Lecture éditoriale d’Au résultat, distincte de l’étiquette revendiquée par le candidat. Elle ne se déduit pas du nom du parti : elle repose sur des éléments documentés (programme, déclarations, trajectoire politique).</p>`;
    if (i < 0) return `<section class="blk"><header><b>Positionnement politique</b><span>Lecture éditoriale d’Au résultat</span></header><div><p class="p-sub quiet">Positionnement non renseigné pour cette candidature. ${""}</p>${intro}</div></section>`;
    const cur = SCALE[i], why = pos.note ? e(pos.note) : "Aucune justification n’est encore publiée pour ce positionnement.";
    return `<section class="blk"><header><b>Positionnement politique</b><span>Lecture éditoriale d’Au résultat</span></header><div>
      <p class="pos-line">Positionnement : <strong style="--c:${cur.color}"><i class="pos-dot" aria-hidden="true"></i>${e(cur.label)}</strong>${pos.uncertain ? ' <span class="pos-unc">Positionnement incertain ou contesté</span>' : ""}</p>
      <ol class="pos-scale" aria-label="${e("Échelle de la gauche à la droite : " + cur.label)}">${SCALE.map((x, n) =>
        `<li class="${n === i ? "on" : ""}"${n === i ? ` aria-current="true" title="${e(pos.note || cur.label)}"` : ""}><span class="seg" style="background:${x.color}"></span><span class="lab">${e(x.label)}</span>${n === i ? '<span class="mark" aria-hidden="true">▲</span>' : ""}</li>`).join("")}</ol>
      <details class="pos-why"><summary>Pourquoi ce positionnement ?</summary><p>${why}</p></details>${intro}</div></section>`;
  };

  window.UI = U;
})();
