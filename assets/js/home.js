/* Page d'accueil : blocs alimentés par Supabase (thématiques, compteurs, indicateurs) et par les dossiers internationaux. */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const main = C.filter(c => !c.cmp), cmp = C.filter(c => c.cmp);

  /* Dossiers internationaux : données du site (non issues de la base). */
  $("h-door3-state").textContent = `Disponible · ${C.length + G.length} fiches pays`;
  $("h-res-an").textContent = `${main.length} pays étudiés dans leur période de gouvernement de droite radicale, plus ${cmp.length} cas de comparaison (${cmp.map(c => c.name).join(", ")}). Chaque fiche applique la même grille : situation avant le mandat, indicateurs, indices de libertés, bilan.`;
  $("h-dossiers").innerHTML =
    `<li><a href="analyses-internationales.html#extreme-droite"><b>La droite radicale au pouvoir</b></a> · ${main.length} pays, disponible</li>
     <li><a href="analyses-internationales.html#gauche"><b>La gauche au pouvoir</b></a> · ${G.length ? G.length + " pays" : "en construction"}</li>`;

  /* Thématiques */
  UI.mount($("h-themes"), () => DB.themes(), all => {
    const o = (a, b) => (a.display_order || 0) - (b.display_order || 0);
    const fams = all.filter(t => !t.parent_id).sort(o);
    const sub = $("h-themes-sub");
    if (sub) sub.textContent = `${fams.length} familles et ${all.length - fams.length} sous-thématiques. Cette classification sert à ranger les mesures, quel que soit le candidat.`;
    return fams.map(f => {
      const subs = all.filter(t => t.parent_id === f.id).sort(o);
      return `<a class="h-theme" href="thematiques.html#${encodeURIComponent(f.slug)}"><span class="h-n">${subs.length} sous-thématiques</span><h3>${e(f.name)}</h3>
        <p>${e(subs.slice(0, 3).map(s => s.name).join(" · "))}${subs.length > 3 ? "…" : ""}</p></a>`;
    }).join("");
  }, { loading: "Chargement des thématiques…", empty: "Aucune thématique publiée pour l’instant." });

  /* Compteurs honnêtes : nombre de contenus réellement publiés. */
  const plural = (n, s, p, none) => n ? `${n} ${n > 1 ? p : s}` : none;
  const state = (id, fn) => fn().then(t => { $(id).textContent = t; }).catch(() => { $(id).textContent = "Indisponible pour le moment"; });
  state("h-door1-state", async () => plural(await DB.count("candidacies"), "candidature publiée", "candidatures publiées", "Aucune candidature publiée pour l’instant"));
  state("h-door2-state", async () => plural(await DB.count("measures"), "mesure publiée", "mesures publiées", "Aucune mesure publiée pour l’instant"));

  /* Indicateurs */
  DB.indicators().then(ind => {
    const doms = [...new Set(ind.map(i => i.domain).filter(Boolean))];
    $("h-res-in").textContent = ind.length
      ? `${ind.length} indicateur${ind.length > 1 ? "s" : ""} publié${ind.length > 1 ? "s" : ""}, avec définition, unité, source et date. Les premiers chiffres des dossiers internationaux sont aussi consultables.`
      : "Aucun indicateur n’est publié pour l’instant. Chacun le sera avec sa définition, son unité, sa source et sa date. Les premiers chiffres disponibles sont ceux des dossiers internationaux.";
    $("h-domains").innerHTML = doms.slice(0, 6).map(d => `<li>${e(UI.humanize(d))}</li>`).join("") + (doms.length > 6 ? `<li>et ${doms.length - 6} autres domaines</li>` : "");
  }).catch(() => {
    $("h-res-in").textContent = "Les indicateurs sont momentanément indisponibles. Les premiers chiffres des dossiers internationaux restent consultables.";
  });
})();
