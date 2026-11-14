/* Page « Les thématiques » : familles, sous-thèmes, dossiers internationaux liés, propositions rattachées. */
(function () {
  const $ = id => document.getElementById(id);
  const all = C.concat(G), byId = Object.fromEntries(all.map(c => [c.id, c]));
  $("t-index").innerHTML = THEMES.map(t => `<li><a href="#${t.id}">${esc(t.title)}</a></li>`).join("");
  $("t-list").innerHTML = THEMES.map(t => {
    const dossiers = t.ids.filter(id => byId[id]);
    const n = PROPOSITIONS.filter(p => p.theme === t.id).length;
    return `<section class="fam" id="${t.id}" aria-labelledby="${t.id}-h">
      <h3 id="${t.id}-h">${esc(t.title)}</h3>
      <p class="fam-meta">${t.subs.length} sous-thèmes</p>
      <ul class="chipset">${t.subs.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      <h4>Propositions des candidats</h4>
      <p style="font-size:14px;color:var(--fg-2);margin-top:6px">${n ? n + " proposition" + (n > 1 ? "s" : "") + " enregistrée" + (n > 1 ? "s" : "") + "." : "Aucune proposition enregistrée pour l’instant."}</p>
      <h4>Expériences internationales liées</h4>
      ${dossiers.length
        ? `<ul class="chipset">${dossiers.map(id => `<li><a href="analyses-internationales.html#${id}"><span class="mono" style="color:var(--accent);font-size:11px">${byId[id].code}</span> ${esc(byId[id].name)}</a></li>`).join("")}</ul>`
        : `<p style="font-size:14px;color:var(--fg-2);margin-top:6px">Pas encore de dossier lié.</p>`}
    </section>`;
  }).join("");
})();
