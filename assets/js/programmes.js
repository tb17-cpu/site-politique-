/* Programmes publiés de l'élection active (Supabase) : un bloc par candidat, versions et mesures. */
(function () {
  const $ = id => document.getElementById(id), e = esc, mount = $("pg-list");
  Election.need(mount).then(el => {
    if (!el) return;
    $("p-label").textContent = Election.name(el);
    UI.mount(mount, () => DB.programs(el.id), list => list.map(p => {
      const c = p.candidacies, who = UI.person(c.people) || "Candidature", party = c.parties ? c.parties.name : "";
      const vs = (p.program_versions || []).slice().sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
      const last = vs[0];
      return `<article class="prog"><header><span class="label">${e(party || "Candidature")}</span><h3>${e(p.title || "Programme")}</h3>
        <p class="who">Programme de <a href="candidat.html#${encodeURIComponent(c.id)}">${e(who)}</a></p></header>
        ${p.description ? `<div class="desc">${UI.rich(p.description)}</div>` : ""}
        ${last && last.publication_date ? `<p class="quiet">Publié le ${e(UI.date(last.publication_date))}</p>` : ""}
        <p><a href="candidat.html#${encodeURIComponent(c.id)}">Voir le programme et ses mesures →</a></p></article>`;
    }).join(""), { loading: "Chargement des programmes…", empty: "<p><b>Aucun programme n’est disponible pour cette élection.</b></p>" });
  });
})();
