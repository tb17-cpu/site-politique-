/* Page d'accueil : blocs alimentés par Supabase (thématiques, compteurs, indicateurs) et par les dossiers internationaux. */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  const main = C.filter(c => !c.cmp), cmp = C.filter(c => c.cmp);

  /* Dossiers internationaux : données du site (non issues de la base). */
  $("h-res-an").textContent = `${main.length} pays étudiés pendant un gouvernement de droite radicale, avec ${cmp.length} cas de comparaison.`;
  $("h-dossiers").innerHTML =
    `<li><a href="analyses-internationales.html#extreme-droite"><b>La droite radicale au pouvoir</b></a> · ${main.length} pays</li>
     <li><a href="analyses-internationales.html#gauche"><b>La gauche au pouvoir</b></a> ${G.length ? ` · ${G.length} pays` : ""}</li>`;

  /* Thématiques */
  UI.mount($("h-themes"), () => DB.themes(), all => {
    const o = (a, b) => (a.display_order || 0) - (b.display_order || 0);
    const fams = all.filter(t => !t.parent_id).sort(o);
    const sub = $("h-themes-sub");
    if (sub) sub.textContent = `${fams.length} politiques publiques, ${all.length - fams.length} sous-thématiques.`;
    return fams.map(f => {
      const subs = all.filter(t => t.parent_id === f.id).sort(o);
      return `<a class="h-theme" href="thematiques.html#${encodeURIComponent(f.slug)}"><h3>${e(f.name)}</h3><span class="h-n">${subs.length} sous-thème${subs.length > 1 ? "s" : ""}</span></a>`;
    }).join("");
  }, { loading: "Chargement des thématiques…", empty: "Aucune thématique disponible." });

  /* Élections publiées : liste lue dans Supabase, une carte par élection, avec ses compteurs réels. */
  const plural = (n, s1, p, none) => n ? `${n} ${n > 1 ? p : s1}` : none;
  /* Liens d'accès direct : avec une seule élection publiée, ils portent son identifiant ; sinon chaque page propose le choix. */
  const chips = list => { if (list.length !== 1) return; document.querySelectorAll("#h-chips a").forEach(a => { a.setAttribute("href", Election.hrefFor(a.getAttribute("href"), list[0].id)); }); };
  UI.mount($("h-elections"), () => Election.load(), list => { chips(list); return `<ul class="h-doors">${list.map(el => { const st = Election.status(el), w = Election.when(el);
    return `<li><a class="h-door" href="${e(Election.hrefFor("election.html", el.id))}"><span class="h-top">${st.label ? `<span class="h-badge h-badge--${e(st.key || "")}">${e(st.label)}</span>` : ""}${w ? `<span class="h-date">${e(w)}</span>` : ""}</span>
      <h3>${e(Election.name(el))}</h3>
      <span class="h-foot"><span class="h-count" data-el="${e(el.id)}"></span><span class="h-go">Ouvrir <span aria-hidden="true">→</span></span></span></a></li>`; }).join("")}</ul>`; },
    { loading: "Chargement des élections…", empty: "<p><b>Aucune élection disponible.</b></p>",
      after: (box, list) => list.forEach(el => DB.count("candidacies", { election_id: "eq." + el.id })
        .then(n => plural(n, "candidature", "candidatures", ""))
        .catch(() => "")
        .then(t => { const x = box.querySelector(`[data-el="${CSS.escape(String(el.id))}"]`); if (x) x.textContent = t; })) });

  /* Indicateurs */
  DB.indicators().then(ind => {
    const doms = [...new Set(ind.map(i => i.domain).filter(Boolean))];
    $("h-res-in").textContent = ind.length
      ? `${ind.length} indicateur${ind.length > 1 ? "s" : ""}, chacun avec sa définition, son unité, sa source et sa date.`
      : "Les chiffres clés par pays sont dans les analyses internationales.";
    $("h-domains").innerHTML = doms.slice(0, 6).map(d => `<li>${e(UI.humanize(d))}</li>`).join("") + (doms.length > 6 ? `<li>et ${doms.length - 6} autres domaines</li>` : "");
  }).catch(() => {
    $("h-res-in").textContent = "Les indicateurs sont momentanément indisponibles. Les chiffres des analyses internationales restent consultables.";
  });
})();
