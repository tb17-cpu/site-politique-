/* Recherche de l'accueil. Index : rubriques et dossiers internationaux (locaux) + thématiques, mesures et candidats publiés (Supabase, chargés à la première saisie). */
(function () {
  const form = document.getElementById("h-search-form"); if (!form) return;
  const q = document.getElementById("h-q"), out = document.getElementById("h-results"), note = document.getElementById("h-search-note");
  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const idx = [];
  const add = (type, title, sub, href, extra) => idx.push({ type, title, sub, href, text: norm([title, sub, extra].join(" ")) });

  [["Les candidats", "Candidatures publiées de l’élection", "candidats.html"], ["Programmes", "Programmes publiés de l’élection", "programmes.html"], ["Comparateur", "Comparer les mesures", "comparateur.html"],
   ["Indicateurs", "Données et sources", "indicateurs.html"], ["Méthodologie", "Principes, sources, limites", "methodologie.html"]].forEach(p => add("Rubrique", p[0], p[1], p[2], ""));
  C.concat(G).forEach(c => add("Analyse internationale", c.name + " · " + c.leader, c.period, "analyses-internationales.html#" + c.id, c.code));

  let loaded = null, failed = false;
  const load = () => loaded || (loaded = Election.ready.then(() => DB.searchIndex(Election.current() && Election.current().id)).then(d => {
    const fam = new Map(d.themes.filter(t => !t.parent_id).map(t => [t.id, t]));
    d.themes.forEach(t => add(t.parent_id ? "Sous-thématique" : "Thématique", t.name, t.parent_id && fam.get(t.parent_id) ? fam.get(t.parent_id).name : "", "thematiques.html#" + encodeURIComponent(t.slug), t.description || ""));
    d.measures.forEach(m => add("Mesure", m.title, "", "mesure.html#" + encodeURIComponent(m.id), ""));
    d.cands.forEach(c => add("Candidat", UI.person(c.people) || "Candidature", "", "candidat.html#" + encodeURIComponent(c.id), ""));
  }).catch(() => { failed = true; }));

  note.textContent = "Recherche dans les thématiques, les mesures et les candidats publiés, et dans les analyses internationales.";
  const ORDER = ["Candidat", "Mesure", "Thématique", "Sous-thématique", "Analyse internationale", "Rubrique"];
  const close = () => { out.hidden = true; q.setAttribute("aria-expanded", "false"); };
  const run = async () => {
    const terms = norm(q.value).split(/\s+/).filter(Boolean);
    if (!terms.length) return close();
    out.innerHTML = `<p>Recherche…</p>`; out.hidden = false; q.setAttribute("aria-expanded", "true");
    await load();
    if (!terms.length || norm(q.value).split(/\s+/).filter(Boolean).join(" ") !== terms.join(" ")) return;
    const hits = idx.filter(e => terms.every(t => e.text.includes(t)));
    let html = "";
    ORDER.forEach(type => {
      const l = hits.filter(h => h.type === type).slice(0, 6);
      if (l.length) html += `<h4>${type}</h4>` + l.map(h => `<a href="${h.href}">${esc(h.title)}${h.sub ? `<small>${esc(h.sub)}</small>` : ""}</a>`).join("");
    });
    if (failed) html += `<p>La recherche dans la base est momentanément indisponible : seuls les contenus du site sont interrogés.</p>`;
    out.innerHTML = html || `<p>Aucun résultat dans les contenus publiés.</p>`;
  };
  q.addEventListener("focus", load, { once: true });
  q.addEventListener("input", run);
  form.addEventListener("submit", ev => { ev.preventDefault(); run(); });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") close(); });
  document.addEventListener("click", ev => { if (!document.getElementById("h-search").contains(ev.target)) close(); });
})();
