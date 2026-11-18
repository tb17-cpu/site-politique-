/* Bandeau et pied de page partagés par toutes les pages.
   Chaque page déclare <body data-page="..."> et contient <div id="site-header"> et <div id="site-footer">. */
(function () {
  const S = window.SITE, page = document.body.dataset.page || "";
  /* Logo en SVG intégré : ses couleurs viennent des tokens (clair/sombre). assets/img/logo.svg reste l'icône de l'onglet. */
  const logo = `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect class="lb" width="64" height="64" rx="10"/><rect class="lr" x="14" y="36" width="9" height="14"/><rect class="lr" x="27.5" y="26" width="9" height="24"/><rect class="lr" x="41" y="14" width="9" height="36"/></svg>`;
  /* Apparence : trois choix, mémorisés (voir theme-init.js). Le <select> natif recouvre l'icône : clavier, lecteur d'écran et tactile gérés par le navigateur. */
  const MODES = [["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]];
  const ic = (cls, d) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const themePick = () => {
    const cur = window.Theme ? window.Theme.pref() : "auto";
    return `<div class="theme-pick" data-pref="${cur}">
      ${ic("i-light", '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')}${ic("i-dark", '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>')}${ic("i-auto", '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>')}
      <span class="tp-lab" aria-hidden="true">${esc((MODES.find(m => m[0] === cur) || MODES[0])[1])}</span>
      <select id="theme-select" aria-label="Apparence du site">${MODES.map(m => `<option value="${m[0]}"${m[0] === cur ? " selected" : ""}>${m[1]}</option>`).join("")}</select></div>`;
  };

  const nav = S.nav.map(n =>
    `<li><a href="${n.href}"${n.id === page ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`).join("");

  const h = document.getElementById("site-header");
  if (h) h.innerHTML =
    `<header class="site-header"><div class="wrap">
      <a class="brand" href="index.html" aria-label="${esc(S.name)}, accueil">
        ${logo}<span class="brand-name">${esc(S.name)}</span>
        <span class="brand-tag">${esc(S.tagline)}</span></a>
      <nav class="site-nav" aria-label="Navigation principale"><ul>${nav}</ul></nav>
      <div class="elec-pick"><label for="elec-select">Élection</label><select id="elec-select" aria-label="Choisir l’élection"><option>Chargement…</option></select></div>
      ${themePick()}
    </div></header><div id="elec-bar"></div>`;

  const F = S.footer;
  const f = document.getElementById("site-footer");
  if (f) f.innerHTML =
    `<footer class="site-footer"><div class="wrap">
      <div class="f-grid">
        <div><div class="f-brand">${logo}<b class="brand-inline">${esc(S.name)}</b></div>
          <p>${esc(F.about)}</p></div>
        <div><h2>Explorer</h2><ul>${S.nav.concat(S.electionNav).map(n => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join("")}</ul></div>
        <div><h2>Méthodologie</h2><p>${esc(F.method)}</p>
          <p><a href="methodologie.html">Lire la méthodologie complète</a></p></div>
        <div><h2>Sources</h2><p>${esc(F.sources)}</p>
          <p><a href="analyses-internationales.html#overview">Voir les analyses internationales et leurs sources</a></p></div>
      </div>
      <div class="f-bottom"><span><b class="brand-inline">${esc(S.name)}</b> · ${esc(S.tagline)}</span></div>
    </div></footer>`;

  const tp = document.querySelector(".theme-pick"), ts = document.getElementById("theme-select");
  if (tp && ts && window.Theme) {
    ts.addEventListener("change", () => window.Theme.set(ts.value));
    /* Reflète le choix courant (y compris un changement fait dans un autre onglet). */
    const sync = () => { const p = window.Theme.pref(); tp.dataset.pref = p; ts.value = p; tp.querySelector(".tp-lab").textContent = (MODES.find(m => m[0] === p) || MODES[0])[1]; };
    document.addEventListener("themechange", sync); sync();
  }

  /* Hauteur du bandeau : sert à positionner la barre de pays collée sous lui. */
  const setH = () => {
    const el = document.querySelector(".site-header");
    if (el) document.documentElement.style.setProperty("--header-h", el.offsetHeight + "px");
  };
  setH();
  window.addEventListener("resize", setH);
  window.addEventListener("load", setH);
})();
