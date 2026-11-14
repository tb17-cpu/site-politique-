/* Programmes publiés de l'élection active (Supabase) : un bloc par candidat, versions et mesures. */
(function () {
  const $ = id => document.getElementById(id), e = esc, mount = $("pg-list");
  Election.need(mount).then(el => {
    if (!el) return;
    $("p-label").textContent = Election.name(el);
    UI.mount(mount, () => DB.programs(el.id), list => list.map(p => {
      const c = p.candidacies, who = UI.person(c.people) || "Candidature", party = c.parties ? c.parties.name : "";
      const vs = (p.program_versions || []).slice().sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
      const last = vs[0], n = (last && last.measures || []).length;
      return `<article class="prog"><header><span class="label">${e(party || "Candidature")}</span><h3>${e(p.title || "Programme")}</h3>
        <p class="who">Programme de <a href="candidat.html#${encodeURIComponent(c.id)}">${e(who)}</a></p></header>
        ${p.description ? `<p class="long desc">${e(p.description)}</p>` : ""}
        ${last ? `<p class="quiet">Version ${e(last.version_label || last.version_number || "")}${last.publication_date ? " · " + e(UI.date(last.publication_date)) : ""} · ${n ? n + " mesure" + (n > 1 ? "s" : "") + " publiée" + (n > 1 ? "s" : "") : "aucune mesure publiée pour cette version"}${vs.length > 1 ? " · " + vs.length + " versions" : ""}</p>`
               : `<p class="quiet">Aucune version publiée.</p>`}
        <p><a href="candidat.html#${encodeURIComponent(c.id)}">Voir la fiche et les mesures →</a></p></article>`;
    }).join(""), { loading: "Chargement des programmes…", empty: "<p><b>Aucun programme n’est publié pour cette élection.</b></p><p style=\"margin-top:8px\">Les programmes apparaissent ici dès que leurs mesures sont documentées et publiées.</p>" });
  });
})();
