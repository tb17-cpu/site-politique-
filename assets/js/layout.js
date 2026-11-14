/* Bandeau et pied de page partagés par toutes les pages.
   Chaque page déclare <body data-page="..."> et contient <div id="site-header"> et <div id="site-footer">. */
(function () {
  const S = window.SITE, page = document.body.dataset.page || "";
  const logo = "assets/img/logo.svg";

  const nav = S.nav.map(n =>
    `<li><a href="${n.href}"${n.id === page ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`).join("");

  const h = document.getElementById("site-header");
  if (h) h.innerHTML =
    `<header class="site-header"><div class="wrap">
      <a class="brand" href="index.html" aria-label="${esc(S.name)}, accueil">
        <img src="${logo}" alt="" width="30" height="30"><span class="brand-name">${esc(S.name)}</span>
        <span class="brand-tag">${esc(S.tagline)}</span></a>
      <nav class="site-nav" aria-label="Navigation principale"><ul>${nav}</ul></nav>
      <div class="elec-pick"><label for="elec-select">Élection</label><select id="elec-select" aria-label="Choisir l’élection"><option>Chargement…</option></select></div>
    </div></header><div id="elec-bar"></div>`;

  const F = S.footer;
  const f = document.getElementById("site-footer");
  if (f) f.innerHTML =
    `<footer class="site-footer"><div class="wrap">
      <div class="f-grid">
        <div><div class="f-brand"><img src="${logo}" alt="" width="26" height="26"><b>${esc(S.name)}</b></div>
          <p>${esc(F.about)}</p></div>
        <div><h2>Explorer</h2><ul>${S.nav.concat(S.electionNav).map(n => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join("")}</ul></div>
        <div><h2>Méthodologie</h2><p>${esc(F.method)}</p>
          <p><a href="methodologie.html">Lire la méthodologie complète</a></p></div>
        <div><h2>Sources</h2><p>${esc(F.sources)}</p>
          <p><a href="analyses-internationales.html#overview">Voir les analyses internationales et leurs sources</a></p>
          <p class="f-slot">${esc(F.sourcesSlot)}</p></div>
      </div>
      <div class="f-bottom"><span>${esc(F.legal)}</span><span>${esc(F.identity)}</span></div>
    </div></footer>`;

  /* Hauteur du bandeau : sert à positionner la barre de pays collée sous lui. */
  const setH = () => {
    const el = document.querySelector(".site-header");
    if (el) document.documentElement.style.setProperty("--header-h", el.offsetHeight + "px");
  };
  setH();
  window.addEventListener("resize", setH);
  window.addEventListener("load", setH);
})();
