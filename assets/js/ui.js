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
  U.avatar = p => p && U.safeUrl(p.photo_url)
    ? `<img class="avatar" src="${e(U.safeUrl(p.photo_url))}" alt="" loading="lazy" width="64" height="64" referrerpolicy="no-referrer" onerror="this.remove()">` : `<span class="avatar avatar-ph" aria-hidden="true">${e((p && p.last_name || "?").charAt(0))}</span>`;

  window.UI = U;
})();
