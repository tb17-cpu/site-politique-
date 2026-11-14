/* Fiche candidat : même présentation pour tous. renderFiche(candidat) ; sans argument : modèle vide. */
(function () {
  const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
  const date = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
  const todo = t => `<p class="todo">${esc(t)}</p>`;
  const links = arr => `<ul>${arr.map(s => safeUrl(s.url)
    ? `<li><a href="${esc(safeUrl(s.url))}" rel="noopener" target="_blank">${esc(s.label || s.url)}</a></li>` : `<li>${esc(s.label || "")}</li>`).join("")}</ul>`;

  window.renderFiche = function (c) {
    const st = c && CANDIDACY_STATUS.find(s => s.id === c.status);
    const props = c ? PROPOSITIONS.filter(p => p.candidate === c.id) : [];
    const byTheme = THEMES.filter(t => props.some(p => p.theme === t.id))
      .map(t => `<li>${esc(t.title)} : ${props.filter(p => p.theme === t.id).length}</li>`).join("");
    const block = (title, inner) => `<div><h3>${title}</h3>${inner}</div>`;
    return [
      block("Présentation", c && c.intro ? `<p>${esc(c.intro)}</p>` : todo("Parcours, mandats et fonctions, présentés de façon factuelle.")),
      block("Parti ou mouvement", c && c.party ? `<p>${esc(c.party)}</p>` : todo("Parti, mouvement ou candidature sans étiquette.")),
      block("Statut de candidature", st ? `<p>${esc(st.label)}${c.statusSince ? ` depuis le ${esc(date(c.statusSince))}` : ""}</p>` : todo("L’un des quatre statuts, avec sa date et sa source.")),
      block("Programme général", c && c.programme && c.programme.summary
        ? `<p>${esc(c.programme.summary)}</p>${safeUrl(c.programme.url) ? `<p><a href="${esc(safeUrl(c.programme.url))}" rel="noopener" target="_blank">Programme officiel</a></p>` : ""}`
        : todo("Résumé du programme et lien vers le document officiel.")),
      block("Propositions par thématique", c
        ? (props.length ? `<ul>${byTheme}</ul>` : todo("Aucune proposition enregistrée pour l’instant."))
        : todo("Les propositions, classées selon les familles de thématiques.")),
      block("Sources officielles", c && c.sources && c.sources.length ? links(c.sources) : todo("Programme, site de campagne, déclarations datées.")),
      block("Dernière vérification", c && c.verifiedOn ? `<p>${esc(date(c.verifiedOn))}</p>` : todo("Date à laquelle les informations de la fiche ont été vérifiées.")),
      block("Historique des évolutions", c && c.history && c.history.length
        ? `<ul>${c.history.map(h => `<li>${esc(date(h.date))} : ${esc(h.text)}</li>`).join("")}</ul>`
        : todo("Changements du programme ou de la candidature, datés et sourcés."))
    ].join("");
  };
})();
