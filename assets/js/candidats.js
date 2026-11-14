/* Page « Les candidats » : statuts, liste (vide tant qu’aucun candidat sourcé), structure d’une fiche. */
(function () {
  const $ = id => document.getElementById(id);
  $("c-status").innerHTML = CANDIDACY_STATUS.map(s => `<div><b>${esc(s.label)}</b><p>${esc(s.text)}</p></div>`).join("");
  $("c-model").innerHTML = renderFiche(null);

  if (!CANDIDATES.length) {
    $("c-list").innerHTML = `<div class="p-empty"><p><b>Aucun candidat n’est encore enregistré.</b></p>
      <p style="margin-top:8px">La liste sera constituée à partir de sources officielles, avec le statut de chaque personne. Les personnalités simplement pressenties seront distinguées des candidatures déclarées ou investies.</p></div>`;
    return;
  }
  $("c-list").innerHTML = CANDIDACY_STATUS.map(s => {
    const list = CANDIDATES.filter(c => c.status === s.id);
    if (!list.length) return "";
    return `<h3 class="h-h3" style="font-size:21px;margin:22px 0 10px">${esc(s.label)}</h3>
      <div class="p-grid">${list.map(c => `<a class="p-cell" href="candidat.html#${encodeURIComponent(c.id)}">
        <h3>${esc(c.name)}</h3><p>${esc(c.party || "")}</p></a>`).join("")}</div>`;
  }).join("");
})();
