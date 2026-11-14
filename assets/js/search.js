/* Recherche de l’accueil. Index construit à partir des données publiées ; les candidats, mesures et
   indicateurs y entrent dès qu’ils existent dans data-france2027.js et data-indicateurs.js. */
(function () {
  const form = document.getElementById("h-search-form"); if (!form) return;
  const q = document.getElementById("h-q"), out = document.getElementById("h-results"), note = document.getElementById("h-search-note");
  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const idx = [];
  const add = (type, title, sub, href, extra) => idx.push({ type, title, sub, href, text: norm([title, sub, extra].join(" ")) });
  CANDIDATES.forEach(c => add("Candidat", c.name, c.party || "", "candidat.html#" + encodeURIComponent(c.id), ""));
  PROPOSITIONS.forEach(p => add("Mesure", (p.text || "").slice(0, 90), p.sub || "", "thematiques.html#" + p.theme, p.mechanism || ""));
  THEMES.forEach(t => { add("Thématique", t.title, t.subs.length + " sous-thèmes", "thematiques.html#" + t.id, t.subs.join(" "));
    t.subs.forEach(s => add("Sous-thème", s, t.title, "thematiques.html#" + t.id, "")); });
  INDIC_DOMAINS.forEach(d => add("Indicateurs", d.title, d.ex, "indicateurs.html", ""));
  C.concat(G).forEach(c => add("Analyse internationale", c.name + " · " + c.leader, c.period, "analyses-internationales.html#" + c.id, c.code));
  [["Les candidats", "Statuts et fiches", "candidats.html"], ["Comparateur", "Comparer les mesures", "comparateur.html"],
   ["Méthodologie", "Principes, sources, limites", "methodologie.html"]].forEach(p => add("Rubrique", p[0], p[1], p[2], ""));

  const ORDER = ["Candidat", "Mesure", "Thématique", "Sous-thème", "Analyse internationale", "Indicateurs", "Rubrique"];
  const covered = ["thématiques", "analyses internationales", "domaines d’indicateurs"];
  if (CANDIDATES.length) covered.unshift("candidats");
  if (PROPOSITIONS.length) covered.unshift("mesures");
  note.textContent = "Recherche dans : " + covered.join(", ") + (CANDIDATES.length && PROPOSITIONS.length ? "." :
    ". Les candidats et les mesures y seront ajoutés avec la base documentaire.");

  const close = () => { out.hidden = true; q.setAttribute("aria-expanded", "false"); };
  const run = () => {
    const terms = norm(q.value).split(/\s+/).filter(Boolean);
    if (!terms.length) return close();
    const hits = idx.filter(e => terms.every(t => e.text.includes(t)));
    let html = "";
    ORDER.forEach(type => {
      const l = hits.filter(h => h.type === type).slice(0, 6);
      if (l.length) html += `<h4>${type}</h4>` + l.map(h => `<a href="${h.href}">${esc(h.title)}<small>${esc(h.sub)}</small></a>`).join("");
    });
    out.innerHTML = html || `<p>Aucun résultat dans les contenus publiés. Aucun candidat ni aucune mesure n’est encore enregistré${CANDIDATES.length || PROPOSITIONS.length ? " qui corresponde" : ""}.</p>`;
    out.hidden = false; q.setAttribute("aria-expanded", "true");
  };
  q.addEventListener("input", run);
  form.addEventListener("submit", e => { e.preventDefault(); run(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  document.addEventListener("click", e => { if (!document.getElementById("h-search").contains(e.target)) close(); });
})();
