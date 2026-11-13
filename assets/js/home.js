/* Page d’accueil : tout le contenu chiffré est lu dans data-analyses.js (C, FINDINGS) et site-config.js. */
(function () {
  const S = window.SITE;
  const byId = Object.fromEntries(C.map(c => [c.id, c]));
  const link = id => `analyses-internationales.html#${id}`;
  const $ = id => document.getElementById(id);
  const fmtDate = iso => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const nMain = C.filter(c => !c.cmp).length, nCmp = C.filter(c => c.cmp).length;
  $("h-meta").textContent = `Données arrêtées au ${S.dataAsOf} · ${nMain} pays analysés et ${nCmp} cas de comparaison`;

  /* Chiffres marquants */
  $("h-tiles").innerHTML = S.featured.map(f => {
    const c = byId[f.id], k = c && c.k[f.k];
    if (!k) return "";
    return `<a class="h-tile" href="${link(c.id)}">
      <span class="label">${esc(c.name)}</span>
      <strong class="h-val ${k[3]}">${esc(k[1])}</strong>
      <span class="h-lab">${esc(k[0])}</span>
      <span class="h-sub">${fm(k[2])}</span></a>`;
  }).join("");

  /* Freedom House : dernier score connu */
  $("h-fh").innerHTML = C.filter(c => c.ov && c.ov.fh)
    .sort((a, b) => b.ov.fh[0] - a.ov.fh[0])
    .map(c => {
      const [v, y, ok] = c.ov.fh;
      return `<a class="fh-row" href="${link(c.id)}">
        <span class="fh-n">${esc(c.name)}</span>
        <span class="fh-bar" aria-hidden="true"><i class="${ok ? "" : "est"}" style="width:${v}%"></i></span>
        <span class="fh-v">${v}${y !== 2026 ? ` <u>(${y})</u>` : ""}${ok ? DV : DE}</span></a>`;
    }).join("");

  /* Constats transversaux (textes d’origine, inchangés) */
  $("h-findings").innerHTML = FINDINGS.map(f =>
    `<article><h4>${esc(f[0])}</h4><p>${fm(f[1])}</p></article>`).join("");

  /* Dernières analyses et mises à jour */
  $("h-updates").innerHTML = S.updates.map(u => u.placeholder
    ? `<article class="h-up h-slot"><span class="h-up-date label">À venir</span>
        <div><h3>${esc(u.title)}</h3><p>${esc(u.desc)}</p></div></article>`
    : `<article class="h-up"><time class="h-up-date label" datetime="${u.date}">${fmtDate(u.date)}</time>
        <div><span class="h-tag">${esc(u.tag)}</span>
          <h3><a href="${u.href}">${esc(u.title)}</a></h3><p>${esc(u.desc)}</p></div>
        <a class="h-up-go" href="${u.href}" aria-label="Ouvrir : ${esc(u.title)}">Lire →</a></article>`).join("");

  /* Grandes thématiques */
  $("h-themes").innerHTML = S.themes.map(t => t.placeholder
    ? `<div class="h-theme h-slot"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></div>`
    : `<div class="h-theme"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>
        <ul>${t.ids.filter(id => byId[id]).map(id =>
          `<li><a href="${link(id)}"><span class="mono">${byId[id].code}</span> ${esc(byId[id].name)}</a></li>`).join("")}</ul></div>`).join("");

  /* Accès aux analyses par pays */
  const card = c => `<a class="h-c" href="${link(c.id)}">
      <span class="h-c-code mono">${c.code}</span>
      <span class="h-c-name">${esc(c.name)}</span>
      <span class="h-c-sub">${esc(c.leader)}</span>
      <span class="h-c-sub">${esc(c.period)}</span></a>`;
  $("h-countries").innerHTML =
    `<h3 class="h-grp">Droites radicales au pouvoir</h3><div class="h-cgrid">${C.filter(c => !c.cmp).map(card).join("")}</div>
     <h3 class="h-grp">Pour comparer</h3><div class="h-cgrid">${C.filter(c => c.cmp).map(card).join("")}</div>
     <h3 class="h-grp">La gauche au pouvoir</h3>
     <div class="h-cgrid">${G.length ? G.map(card).join("")
       : `<a class="h-c h-slot" href="analyses-internationales.html#gauche"><span class="h-c-code mono">…</span><span class="h-c-name">En construction</span><span class="h-c-sub">Pays à déterminer</span></a>`}</div>`;
})();
