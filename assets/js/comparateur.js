/* Comparateur : mesures d'une même sous-thématique, côte à côte. Aucune comparaison artificielle si les données sont insuffisantes. */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  let themes = [], measures = [], rel = [], ELEC = null;
  const MAX = 4;
  const who = m => { const c = m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies; return c ? (UI.person(c.people) || "Candidature") : ""; };
  const cid = m => { const c = m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies; return c && c.id; };
  const cell = v => v ? `<td>${UI.rich(v, { cell: true })}</td>` : `<td class="na">Non renseigné</td>`;

  const cost = m => m.announced_cost != null && m.announced_cost !== "" ? `${m.announced_cost}${m.cost_currency ? " " + m.cost_currency : ""}${m.cost_period ? " · " + m.cost_period : ""}` : "";
  const selected = () => { const ids = [...document.querySelectorAll("#cmp-pick input:checked")].map(i => i.value); return measures.filter(m => ids.includes(String(m.id))); };
  const setStatus = (html, kind) => { const st = $("cmp-status"); st.className = "cmp-status" + (kind ? " " + kind : ""); st.innerHTML = html; };

  /* Une comparaison exige au moins deux candidats distincts parmi les mesures cochées (quatre mesures au plus). */
  async function table() {
    const sel = selected(), out = $("cmp-table"), cands = new Set(sel.map(cid));
    const boxes = [...document.querySelectorAll("#cmp-pick input")];
    boxes.forEach(b => { b.disabled = !b.checked && sel.length >= MAX; });
    out.innerHTML = "";
    if (sel.length < 2) { setStatus(`<b>${sel.length} mesure sélectionnée.</b> Cochez au moins deux mesures, issues de candidats différents.`); return; }
    if (cands.size < 2) { setStatus(`<b>Comparaison inter-candidats impossible.</b> Les mesures cochées viennent toutes du même candidat. Cochez au moins une mesure d’un autre candidat.`, "warn"); return; }
    setStatus(`<b>${sel.length} mesures comparées</b>, ${cands.size} candidats. Quatre mesures au plus.`, "ok");
    const rows = [["Candidat", m => who(m), 0], ["Formulation originale", m => m.original_text, 1], ["Objectif annoncé", m => m.announced_objective, 1], ["Coût annoncé", cost, 1], ["Financement annoncé", m => m.announced_funding, 1],
      ["Mécanisme (Au résultat)", m => m.mechanism, 0], ["Publics concernés (Au résultat)", m => m.target_groups, 0], ["Modalités (Au résultat)", m => m.implementation_details, 0]];
    const F = await DB.formalizations();
    out.innerHTML = `<div class="scroll"><table class="cmp"><thead><tr><th scope="col">Champ</th>${sel.map(m => `<th scope="col"><a href="mesure.html#${encodeURIComponent(m.id)}">${e(m.title)}</a></th>`).join("")}</tr></thead><tbody>
      ${rows.map(r => `<tr><th scope="row">${e(r[0]).replace(/Au résultat/g, '<span class="brand-inline">Au résultat</span>')}${r[2] ? '<small class="decl">déclaré par le candidat</small>' : ""}</th>${sel.map(m => cell(r[1](m))).join("")}</tr>`).join("")}
      ${sel.some(m => F.has(String(m.id))) ? `<tr><th scope="row">Statut de la proposition</th>${sel.map(m => `<td>${UI.formalization(F.get(String(m.id))) || "—"}</td>`).join("")}</tr>` : ""}</tbody></table></div>`;
    const mine = sel.map(m => m.id).join(",");
    try {
      rel = await DB.relations(sel.map(m => m.id));
      if (selected().map(m => m.id).join(",") !== mine) return;   /* la sélection a changé pendant le chargement */
      const set = new Set(sel.map(m => m.id));
      const rr = rel.filter(r => set.has(r.measure_a_id) && set.has(r.measure_b_id));
      const t = id => (sel.find(m => m.id === id) || {}).title;
      out.insertAdjacentHTML("beforeend", `<h3 class="h-h3 cmp-h">Relations entre ces mesures</h3>` +
        (rr.length ? `<ul class="refs">${rr.map(r => `<li><b>${UI.relationHtml(r.relation_type)}</b> : ${e(t(r.measure_a_id))} / ${e(t(r.measure_b_id))}${r.explanation ? `<small>${e(r.explanation)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="p-sub">Aucune relation n’est enregistrée entre ces mesures.</p>`));
    } catch (err) { out.insertAdjacentHTML("beforeend", UI.errorHtml(err)); }
  }

  /* Présélection : une mesure par candidat d'abord, pour que la comparaison soit inter-candidats d'emblée. */
  const preselect = ms => {
    const chosen = [], seen = new Set();
    ms.forEach(m => { if (chosen.length < MAX && !seen.has(cid(m))) { seen.add(cid(m)); chosen.push(m.id); } });
    ms.forEach(m => { if (chosen.length < MAX && !chosen.includes(m.id)) chosen.push(m.id); });
    return new Set(chosen.map(String));
  };

  async function pick() {
    const id = $("cmp-sel").value, box = $("cmp-pick"), out = $("cmp-table");
    out.innerHTML = ""; box.innerHTML = ""; setStatus("");
    if (!id) return;
    history.replaceState(null, "", "#" + encodeURIComponent((themes.find(t => String(t.id) === id) || {}).slug || ""));
    await UI.mount(box, async () => { measures = await DB.measuresForCompare([id], ELEC.id); return measures; }, ms => {
      const on = preselect(ms);
      return ms.map(m => `<label><input type="checkbox" value="${e(m.id)}"${on.has(String(m.id)) ? " checked" : ""}><span>${e(m.title)}<br><small class="who">${e(who(m))}</small></span></label>`).join("");
    }, { loading: "Chargement des mesures…", isEmpty: () => false });
    if (!measures.length) { box.innerHTML = ""; setStatus(`<b>Aucune mesure dans cette sous-thématique.</b>`); return; }
    if (new Set(measures.map(cid)).size < 2) {
      /* Pas de comparaison possible : on liste les mesures, sans cases à cocher. */
      box.innerHTML = `<ul class="refs">${measures.map(m => `<li><a href="mesure.html#${encodeURIComponent(m.id)}">${e(m.title)}</a><small>${e(who(m))}</small></li>`).join("")}</ul>`;
      setStatus(`<b>Comparaison impossible.</b> Il faut des mesures d’au moins deux candidats différents dans la même sous-thématique ; ici, un seul candidat est concerné.`);
      return;
    }
    box.onchange = table; table();
  }

  Election.need($("cmp-start")).then(el => { if (!el) return; ELEC = el;
  UI.mount($("cmp-start"), async () => { themes = await DB.themes(); return themes; }, all => {
    const byOrder = (a, b) => (a.display_order || 0) - (b.display_order || 0);
    const fams = all.filter(t => !t.parent_id).sort(byOrder);
    return `<label class="label" for="cmp-sel">Sous-thématique</label><br><select id="cmp-sel" class="cmp-sel"><option value="">Choisir…</option>${fams.map(f =>
      `<optgroup label="${e(f.name)}">${all.filter(t => t.parent_id === f.id).sort(byOrder).map(s => `<option value="${e(s.id)}">${e(s.name)}</option>`).join("")}</optgroup>`).join("")}</select>`;
  }, { loading: "Chargement des thématiques…", empty: "Aucune thématique publiée.", after: () => {
    const s = $("cmp-sel"), slug = decodeURIComponent(location.hash.slice(1)), t = themes.find(x => x.slug === slug && x.parent_id);
    if (t) s.value = t.id;
    s.addEventListener("change", pick);
    if (s.value) pick();
  } });
  });
})();
