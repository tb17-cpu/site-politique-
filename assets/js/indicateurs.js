/* Page « Indicateurs » : indicateurs et observations publiés (Supabase) + premiers chiffres des dossiers internationaux (données statiques existantes). */
(function () {
  const S = window.SITE, $ = id => document.getElementById(id), e = esc;
  const byId = Object.fromEntries(C.concat(G).map(c => [c.id, c])), link = id => `analyses-internationales.html#${id}`;

  Election.need($("i-domains")).then(el => { if (!el) return;
  const cname = el.countries && el.countries.name;
  UI.mount($("i-domains"), async () => {
    const [ind, obs] = await Promise.all([DB.indicators(), DB.observations()]);
    /* Observations rattachées au pays de l'élection active uniquement. */
    return { ind, obs: obs.filter(o => String(o.country_id) === String(el.country_id)) };
  }, d => {
    const doms = [...new Set(d.ind.map(i => i.domain || ""))];
    $("i-index").innerHTML = doms.map((x, k) => `<li><a href="#dom-${k}">${e(UI.humanize(x) || "Autres")}</a></li>`).join("");
    return doms.map((x, k) => `<div id="dom-${k}" style="scroll-margin-top:calc(var(--header-h) + 12px)"><h3 class="h-h3" style="margin:26px 0 4px">${e(UI.humanize(x) || "Autres")}</h3>` +
      d.ind.filter(i => (i.domain || "") === x).map(i => {
        const o = d.obs.filter(v => v.indicator_id === i.id);
        return `<article class="ind"><h3>${e(i.name)}</h3>
          <dl class="kv" style="margin-top:8px">${[["Définition", i.definition], ["Unité", i.unit], ["Méthodologie", i.methodology]].filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${UI.rich(r[1])}</dd>`).join("")}</dl>
          ${o.length ? `<div class="scroll"><table class="obs"><thead><tr><th>Pays</th><th>Période</th><th>Valeur</th><th>Périmètre</th><th>Source</th></tr></thead><tbody>${o.map(v => `<tr>
            <td>${e(v.countries ? v.countries.name : "")}</td><td>${e([UI.date(v.period_start), UI.date(v.period_end)].filter(Boolean).join(" → "))}</td>
            <td>${e(v.value ?? "")} ${e(i.unit || "")}</td><td>${e(v.geographic_scope || "")}</td>
            <td>${v.sources ? (UI.link(v.sources.url, v.sources.title) || e(v.sources.title)) : ""}</td></tr>`).join("")}</tbody></table></div>`
            : `<p class="p-sub" style="margin-top:8px">Aucune observation publiée pour cet indicateur${cname ? " (" + e(cname) + ")" : ""}.</p>`}</article>`;
      }).join("") + `</div>`).join("");
  }, { loading: "Chargement des indicateurs…", isEmpty: d => !d.ind.length, empty: "<p><b>Aucun indicateur disponible pour cette élection.</b></p>" });
  });

  /* Premiers chiffres disponibles : dossiers internationaux (données du site, avec mention de fiabilité). */
  $("h-tiles").innerHTML = S.featured.map(f => {
    const c = byId[f.id], k = c && c.k[f.k];
    if (!k) return "";
    return `<a class="h-tile" href="${link(c.id)}"><span class="label">${e(c.name)}</span><strong class="h-val ${k[3]}">${e(k[1])}</strong><span class="h-lab">${e(k[0])}</span><span class="h-sub">${fm(k[2])}</span></a>`;
  }).join("");
  $("h-fh").innerHTML = C.filter(c => c.ov && c.ov.fh).sort((a, b) => b.ov.fh[0] - a.ov.fh[0]).map(c => {
    const [v, y, ok] = c.ov.fh;
    return `<a class="fh-row" href="${link(c.id)}"><span class="fh-n">${e(c.name)}</span><span class="fh-bar" aria-hidden="true"><i class="${ok ? "" : "est"}" style="width:${v}%"></i></span><span class="fh-v">${v}${y !== 2026 ? ` <u>(${y})</u>` : ""}${ok ? DV : DE}</span></a>`;
  }).join("");
})();
