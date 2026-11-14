/* Comparateur : mesures d'une même sous-thématique, côte à côte. Aucune comparaison artificielle si les données sont insuffisantes. */
(function () {
  const $ = id => document.getElementById(id), e = esc;
  let themes = [], measures = [], rel = [];
  const MAX = 4;
  const who = m => { const c = m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies; return c ? (UI.person(c.people) || "Candidature") : ""; };
  const cid = m => { const c = m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies; return c && c.id; };
  const cell = v => v ? `<td>${e(v)}</td>` : `<td class="na">Non renseigné</td>`;

  async function table() {
    const ids = [...document.querySelectorAll("#cmp-pick input:checked")].map(i => i.value);
    const sel = measures.filter(m => ids.includes(String(m.id)));
    const out = $("cmp-table");
    if (sel.length < 2) { out.innerHTML = UI.emptyHtml("Sélectionnez au moins deux mesures."); return; }
    const cost = m => m.announced_cost != null && m.announced_cost !== "" ? `${m.announced_cost}${m.cost_currency ? " " + m.cost_currency : ""}${m.cost_period ? " · " + m.cost_period : ""}` : "";
    const rows = [["Candidat", m => who(m), 0], ["Formulation originale", m => m.original_text, 1], ["Objectif annoncé", m => m.announced_objective, 1], ["Coût annoncé", cost, 1], ["Financement annoncé", m => m.announced_funding, 1],
      ["Mécanisme (Au résultat)", m => m.mechanism, 0], ["Publics concernés (Au résultat)", m => m.target_groups, 0], ["Modalités (Au résultat)", m => m.implementation_details, 0]];
    out.innerHTML = `<div class="scroll"><table class="cmp"><thead><tr><th scope="col">Champ</th>${sel.map(m => `<th scope="col"><a href="mesure.html#${encodeURIComponent(m.id)}">${e(m.title)}</a></th>`).join("")}</tr></thead><tbody>
      ${rows.map(r => `<tr><th scope="row">${e(r[0])}${r[2] ? '<br><small style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--mix)">déclaré par le candidat</small>' : ""}</th>${sel.map(m => cell(r[1](m))).join("")}</tr>`).join("")}
      <tr><th scope="row">Fiabilité</th>${sel.map(m => `<td>${UI.reliability(m.reliability_level, { notes: m.reliability_notes })}</td>`).join("")}</tr></tbody></table></div>`;
    try {
      rel = await DB.relations(sel.map(m => m.id));
      const set = new Set(sel.map(m => m.id));
      const rr = rel.filter(r => set.has(r.measure_a_id) && set.has(r.measure_b_id));
      const t = id => (sel.find(m => m.id === id) || {}).title;
      out.innerHTML += `<h3 class="h-h3" style="margin:26px 0 8px;font-size:21px">Relations entre ces mesures</h3>` +
        (rr.length ? `<ul class="refs">${rr.map(r => `<li><b>${e(UI.humanize(r.relation_type))}</b> : ${e(t(r.measure_a_id))} / ${e(t(r.measure_b_id))}${r.explanation ? `<small>${e(r.explanation)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="p-sub">Aucune relation n’est enregistrée entre ces mesures.</p>`);
    } catch (err) { out.innerHTML += UI.errorHtml(err); }
  }

  async function pick() {
    const id = $("cmp-sel").value, box = $("cmp-pick"), out = $("cmp-table");
    out.innerHTML = ""; box.innerHTML = "";
    if (!id) return;
    history.replaceState(null, "", "#" + encodeURIComponent((themes.find(t => String(t.id) === id) || {}).slug || ""));
    await UI.mount(box, async () => { measures = await DB.measuresForCompare([id]); return measures; }, ms => {
      if (ms.length < 2) return "";
      return ms.map((m, i) => `<label><input type="checkbox" value="${e(m.id)}"${i < MAX ? " checked" : ""}><span>${e(m.title)}<br><small style="color:var(--muted)">${e(who(m))}</small></span></label>`).join("");
    }, { loading: "Chargement des mesures…", isEmpty: () => false });
    if (measures.length < 2) {
      box.innerHTML = UI.emptyHtml(`<p><b>Comparaison impossible pour l’instant.</b></p><p style="margin-top:8px">${measures.length ? "Une seule mesure" : "Aucune mesure"} publiée dans cette sous-thématique : il en faut au moins deux, de candidats différents, pour comparer.</p>`);
      return;
    }
    if (new Set(measures.map(cid)).size < 2) box.insertAdjacentHTML("beforebegin", `<p class="p-sub">Toutes ces mesures viennent du même candidat.</p>`);
    box.addEventListener("change", table); table();
  }

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
})();
