/* Page « Les thématiques » : familles et sous-thématiques (Supabase), détail par thème avec mesures et candidats. */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  let themes = [], ELEC = null;
  const byOrder = (a, b) => (a.display_order || 0) - (b.display_order || 0) || String(a.name).localeCompare(b.name, "fr");

  const detail = async () => {
    const slug = decodeURIComponent(location.hash.slice(1)), box = $("t-detail");
    document.querySelectorAll(".fam-sub a").forEach(a => a.removeAttribute("aria-current"));
    if (!slug) { box.hidden = true; box.innerHTML = ""; return; }
    const t = themes.find(x => x.slug === slug);
    box.hidden = false;
    if (!t) { box.innerHTML = UI.emptyHtml("Cette thématique n’existe pas ou n’est pas publiée."); return; }
    document.querySelectorAll(`.fam-sub a[data-slug="${CSS.escape(slug)}"]`).forEach(a => a.setAttribute("aria-current", "true"));
    const parent = themes.find(x => x.id === t.parent_id), kids = themes.filter(x => x.parent_id === t.id).sort(byOrder);
    const ids = [t.id].concat(kids.map(k => k.id));
    box.innerHTML = `<p class="label">${parent ? `<a href="#${encodeURIComponent(parent.slug)}">${e(parent.name)}</a> /` : "Famille"} ${parent ? "Sous-thématique" : ""}</p><h2>${e(t.name)}</h2>
      ${t.description ? `<p class="long" style="color:var(--fg-2)">${e(t.description)}</p>` : ""}
      ${kids.length ? `<ul class="fam-sub">${kids.map(k => `<li><a href="#${encodeURIComponent(k.slug)}">${e(k.name)}</a></li>`).join("")}</ul>` : ""}
      <h3 class="h-h3" style="margin:22px 0 4px;font-size:21px">Mesures publiées</h3><div id="t-measures"></div>
      <div id="t-cands"></div>`;
    let F = new Map();
    UI.mount($("t-measures"), async () => { const ms = await DB.measuresByThemes(ids, ELEC.id); F = await DB.formalizations(); return ms; }, ms => {
      const cands = new Map();
      ms.forEach(m => { const c = m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies; if (c) cands.set(c.id, UI.person(c.people) || "Candidature"); });
      setTimeout(() => { $("t-cands").innerHTML = cands.size ? `<h3 class="h-h3" style="margin:22px 0 8px;font-size:21px">Candidats concernés</h3><ul class="fam-sub">${[...cands].map(([id, n]) => `<li><a href="candidat.html#${encodeURIComponent(id)}">${e(n)}</a></li>`).join("")}</ul>` : ""; }, 0);
      return `<ul class="mlist">${ms.map(m => { const c = m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies;
        return `<li><a class="t" href="mesure.html#${encodeURIComponent(m.id)}">${e(m.title)}</a>${UI.formalization(F.get(String(m.id)))}<span class="by">${e(c ? UI.person(c.people) : "")}</span></li>`; }).join("")}</ul>`;
    }, { loading: "Chargement des mesures…", empty: "<p>Aucune mesure publiée pour cette thématique dans cette élection.</p>" });
    setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  Election.need($("t-list")).then(el => { if (!el) return; ELEC = el;
  UI.mount($("t-list"), async () => { themes = await DB.themes(); return themes; }, all => {
    const fams = all.filter(t => !t.parent_id).sort(byOrder);
    $("t-index").innerHTML = fams.map(f => `<li><a href="#f-${e(f.slug)}" data-fam="${e(f.slug)}">${e(f.name)}</a></li>`).join("");
    return fams.map(f => {
      const subs = all.filter(t => t.parent_id === f.id).sort(byOrder);
      return `<section class="fam" id="f-${e(f.slug)}" aria-labelledby="h-${e(f.slug)}">
        <h3 id="h-${e(f.slug)}"><a href="#${encodeURIComponent(f.slug)}" style="color:inherit" data-slug="${e(f.slug)}">${e(f.name)}</a></h3>
        <p class="fam-meta">${subs.length} sous-thématique${subs.length > 1 ? "s" : ""}</p>
        ${f.description ? `<p style="font-size:14px;color:var(--fg-2);margin-top:6px;max-width:70ch">${e(f.description)}</p>` : ""}
        <ul class="fam-sub">${subs.map(s => `<li><a href="#${encodeURIComponent(s.slug)}" data-slug="${e(s.slug)}">${e(s.name)}</a></li>`).join("")}</ul></section>`;
    }).join("");
  }, { loading: "Chargement des thématiques…", empty: "Aucune thématique disponible.", after: () => { detail(); } });
  });
  window.addEventListener("hashchange", () => { if (themes.length) detail(); });
})();
