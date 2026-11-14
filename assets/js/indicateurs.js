/* Page « Indicateurs » : domaines prévus + premiers chiffres issus des dossiers internationaux (data-analyses.js). */
(function () {
  const S = window.SITE, $ = id => document.getElementById(id);
  const byId = Object.fromEntries(C.concat(G).map(c => [c.id, c]));
  const link = id => `analyses-internationales.html#${id}`;

  $("i-domains").innerHTML = INDIC_DOMAINS.map(d => {
    const n = INDICATORS.filter(i => i.domain === d.id).length;
    const tag = n ? `${n} indicateur${n > 1 ? "s" : ""}` : d.live ? "Premiers chiffres disponibles" : "À venir";
    const inner = `<span class="tag${n || d.live ? "" : " off"}">${tag}</span><h3 style="margin-top:6px">${esc(d.title)}</h3><p>${esc(d.ex)}</p>`;
    return d.live ? `<a class="p-cell" href="#disponibles">${inner}</a>` : `<div class="p-cell">${inner}</div>`;
  }).join("");

  $("h-tiles").innerHTML = S.featured.map(f => {
    const c = byId[f.id], k = c && c.k[f.k];
    if (!k) return "";
    return `<a class="h-tile" href="${link(c.id)}">
      <span class="label">${esc(c.name)}</span>
      <strong class="h-val ${k[3]}">${esc(k[1])}</strong>
      <span class="h-lab">${esc(k[0])}</span>
      <span class="h-sub">${fm(k[2])}</span></a>`;
  }).join("");

  $("h-fh").innerHTML = C.filter(c => c.ov && c.ov.fh)
    .sort((a, b) => b.ov.fh[0] - a.ov.fh[0])
    .map(c => {
      const [v, y, ok] = c.ov.fh;
      return `<a class="fh-row" href="${link(c.id)}">
        <span class="fh-n">${esc(c.name)}</span>
        <span class="fh-bar" aria-hidden="true"><i class="${ok ? "" : "est"}" style="width:${v}%"></i></span>
        <span class="fh-v">${v}${y !== 2026 ? ` <u>(${y})</u>` : ""}${ok ? DV : DE}</span></a>`;
    }).join("");
})();
