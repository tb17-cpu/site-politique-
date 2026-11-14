/* Page d’accueil : blocs alimentés par les données (data-themes.js, data-analyses.js, data-indicateurs.js). */
(function () {
  const $ = id => document.getElementById(id);
  const main = C.filter(c => !c.cmp), cmp = C.filter(c => c.cmp);

  $("h-themes").innerHTML = THEMES.map(t => `<a class="h-theme" href="thematiques.html#${t.id}">
      <span class="h-n">${t.subs.length} sous-thèmes</span><h3>${esc(t.title)}</h3>
      <p>${esc(t.subs.slice(0, 3).join(" · "))}…</p></a>`).join("");

  $("h-door3-state").textContent = `Disponible · ${C.length + G.length} fiches pays`;
  $("h-res-an").textContent = `${main.length} pays étudiés dans leur période de gouvernement de droite radicale, plus ${cmp.length} cas de comparaison (${cmp.map(c => c.name).join(", ")}). Chaque fiche applique la même grille : situation avant le mandat, indicateurs, indices de libertés, bilan.`;
  $("h-dossiers").innerHTML =
    `<li><a href="analyses-internationales.html#extreme-droite"><b>La droite radicale au pouvoir</b></a> · ${main.length} pays, disponible</li>
     <li><a href="analyses-internationales.html#gauche"><b>La gauche au pouvoir</b></a> · ${G.length ? G.length + " pays" : "en construction"}</li>`;

  $("h-res-in").textContent = `${INDIC_DOMAINS.length} domaines d’indicateurs sont prévus, chacun avec définition, unité, source et date. Les premiers chiffres disponibles sont ceux des dossiers internationaux.`;
  const shown = INDIC_DOMAINS.slice(0, 5);
  $("h-domains").innerHTML = shown.map(d => `<li>${esc(d.title)}</li>`).join("") +
    `<li>et ${INDIC_DOMAINS.length - shown.length} autres domaines</li>`;
})();
