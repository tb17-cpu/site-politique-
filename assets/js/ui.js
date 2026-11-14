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
  const CANDIDACY = table({
    unconfirmed: "Non confirmée", rumored: "Candidature évoquée", declared: "Candidature déclarée",
    nominated: "Candidat investi", qualified: "Qualifié pour le premier tour", withdrawn: "Candidature retirée", rejected: "Candidature rejetée"
  }, "Statut à préciser");
  const SPONSORSHIP = table({
    not_started: "Collecte non commencée", in_progress: "Collecte en cours", collecting: "Collecte en cours",
    claimed: "Parrainages annoncés, non validés", validated: "Parrainages validés officiellement", qualified: "Parrainages validés officiellement",
    insufficient: "Seuil non atteint", failed: "Seuil non atteint", unknown: "Non connu", not_applicable: "Sans objet"
  }, "Statut des parrainages à préciser");
  const SECOND = table({
    not_applicable: "Sans objet", not_started: "Pas encore concerné", unknown: "Non déterminé", pending: "En attente du résultat du premier tour",
    qualified: "Qualifié pour le second tour", not_qualified: "Non qualifié pour le second tour", eliminated: "Éliminé au premier tour", withdrawn: "Retiré avant le second tour"
  }, "Situation au second tour à préciser");
  const RELATION = table({
    similar: "Mesures similaires", complementary: "Mesures complémentaires", opposed: "Mesures opposées", opposite: "Mesures opposées",
    contradictory: "Mesures opposées", no_equivalent: "Sans équivalent direct", none: "Sans équivalent direct"
  }, "Relation à préciser");
  const SOURCE_TYPE = table({
    official_program: "Programme officiel", program: "Programme officiel", programme: "Programme officiel", official_document: "Document officiel",
    official_website: "Site officiel", website: "Site web", press: "Article de presse", press_article: "Article de presse", article: "Article de presse",
    interview: "Interview", speech: "Discours", social_media: "Réseaux sociaux", report: "Rapport", study: "Étude", statistics: "Statistiques officielles",
    legal_text: "Texte juridique", law: "Texte juridique", other: "Autre source"
  }, "Type de source à préciser");
  const SOURCE_LINK = table({
    announcement: "Annonce de candidature", declaration: "Déclaration de candidature", investiture: "Investiture", nomination: "Investiture",
    sponsorship: "Parrainages", official_list: "Liste officielle", biography: "Biographie", other: "Autre"
  }, "Nature du lien à préciser");
  const wrap = f => v => f(v).label;
  U.formatCandidacyStatus = wrap(CANDIDACY);
  U.formatSponsorshipStatus = wrap(SPONSORSHIP);
  U.formatSecondRoundStatus = wrap(SECOND);
  U.formatRelationType = wrap(RELATION);
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

  /* Cartes de personne : photo si disponible. */
  U.avatar = (p, big) => p && U.safeUrl(p.photo_url)
    ? `<img class="avatar${big ? " avatar-lg" : ""}" src="${e(U.safeUrl(p.photo_url))}" alt="${e("Portrait de " + U.person(p))}" loading="lazy" width="64" height="64" referrerpolicy="no-referrer" onerror="this.remove()">` : `<span class="avatar${big ? " avatar-lg" : ""} avatar-ph" aria-hidden="true">${e((p && p.last_name || "?").charAt(0))}</span>`;

  window.UI = U;
})();
