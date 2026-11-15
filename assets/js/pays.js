/* « Comprendre le pays » : dossier éditorial du pays de l'élection active.
   Le contenu (titres, introductions, textes Markdown, points clés, sources) vient tel quel de Supabase, sans réécriture.
   Page indépendante : ses requêtes ne font partie d'aucune requête des élections, candidats ou programmes. */
(function () {
  const $ = id => document.getElementById(id), e = esc, mount = $("dossier");
  const str = v => typeof v === "string" ? v.trim() : "";
  const pick = (o, names) => { for (const n of names) { const v = str(o && o[n]); if (v) return v; } return ""; };
  const META = /(^id$|_id$|^created|^updated|status|order|slug|^anchor|^locale|^lang|_at$|_date$)/i;
  const TITLE = ["title", "heading", "name"], SUB = ["subtitle", "sub_title", "tagline"], INTRO = ["introduction", "intro", "summary", "lede", "abstract"];
  const BODY = ["content_markdown", "body_markdown", "article_markdown", "markdown", "body_md", "content_md", "body", "content", "text", "article", "full_text"];
  const KEYS = ["key_points", "key_takeaways", "takeaways", "highlights", "key_facts"];

  /* Texte principal d'une section : colonne Markdown connue, sinon la plus longue colonne de texte non technique. */
  function bodyOf(sec) {
    const named = pick(sec, BODY); if (named) return named;
    const used = new Set([...TITLE, ...SUB, ...INTRO, ...KEYS]);
    let best = ""; for (const k of Object.keys(sec)) if (!used.has(k) && !META.test(k) && typeof sec[k] === "string" && sec[k].length > best.length) best = sec[k];
    return best.trim();
  }
  /* Points clés : tableau, JSON ou texte à puces/lignes. */
  function pointsOf(sec) {
    let v = null; for (const n of KEYS) if (sec[n] != null && sec[n] !== "") { v = sec[n]; break; }
    if (v == null) return [];
    if (typeof v === "string") { const t = v.trim(); if (/^[\[{]/.test(t)) { try { v = JSON.parse(t); } catch (_) { v = t; } } else v = t; }
    if (typeof v === "string") return v.split(/\n+/).map(x => x.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim()).filter(Boolean);
    if (!Array.isArray(v)) v = typeof v === "object" ? Object.values(v) : [v];
    return v.map(x => typeof x === "string" ? x.trim() : x && typeof x === "object" ? str(x.text) || str(x.point) || str(x.title) || str(x.label) : String(x)).filter(Boolean);
  }
  const order = s => { const n = Number(s.display_order); return Number.isFinite(n) ? n : Infinity; };
  const slugOf = (s, i, used) => { let b = (pick(s, ["slug", "anchor"]) || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "section-" + (i + 1); let k = b, n = 2; while (used.has(k)) k = b + "-" + n++; used.add(k); return k; };

  /* Références : organisme, titre cliquable, date ; jamais d'URL affichée. */
  function refsOf(sec) {
    const l = (sec.country_dossier_section_sources || []).filter(x => x && x.sources);
    const seen = new Set(); const items = [];
    l.forEach(x => { const s = x.sources, k = s.id != null ? "i" + s.id : "t" + (s.title || ""); if (seen.has(k)) return; seen.add(k); items.push(x); });
    return items.map(x => { const s = x.sources, t = s.title || s.name || "", pub = s.publisher || s.organization || s.author || "";
      const page = pick(x, ["page_reference", "page", "pages", "locator"]), note = pick(x, ["note", "notes", "comment"]);
      const link = UI.safeUrl(s.url) && (t || pub) ? UI.link(s.url, t || pub) : e(t || pub || "Document");
      const meta = [pub && t ? pub : "", UI.formatSourceType ? UI.formatSourceType(s.source_type) : "", s.publication_date ? UI.date(s.publication_date) : "", page ? "p. " + page : ""].filter(Boolean).map(e).join(" · ");
      return `<li>${link}${meta ? `<small>${meta}</small>` : ""}${note ? `<small>${e(note)}</small>` : ""}</li>`; });
  }

  async function load(el) {
    const list = await DB.countryDossiers();
    const cid = String(el.country_id == null ? "" : el.country_id);
    const hit = list.find(d => Object.keys(d).some(k => /country/i.test(k) && /(^|_)id$|^country$/i.test(k) && String(d[k]) === cid));
    if (!hit) return null;
    const r = await DB.countryDossier(hit.id);
    return r && r.dossier ? r : null;
  }

  function render(R, el) {
    const d = R.dossier, used = new Set();
    const secs = (d.country_dossier_sections || []).filter(Boolean).map((s, i) => ({ s, i })).sort((a, b) => order(a.s) - order(b.s) || a.i - b.i).map(x => x.s)
      .map((s, i) => ({ s, id: slugOf(s, i, used), title: pick(s, TITLE) || "Section " + (i + 1), intro: pick(s, INTRO), body: bodyOf(s), keys: pointsOf(s), refs: refsOf(s) }));
    const intro = pick(d, INTRO);
    const toc = secs.map((x, i) => `<li><a href="#${e(x.id)}" data-s="${e(x.id)}"><span class="dos-tn">${String(i + 1).padStart(2, "0")}</span>${e(x.title)}</a></li>`).join("");
    const article = secs.map((x, i) => `<section class="dos-sec" id="${e(x.id)}" aria-labelledby="${e(x.id)}-h">
        <header><p class="dos-n" aria-hidden="true">${String(i + 1).padStart(2, "0")}</p><h2 id="${e(x.id)}-h">${e(x.title)}</h2></header>
        ${x.intro ? `<div class="dos-lede md">${MD.render(x.intro)}</div>` : ""}
        ${x.keys.length ? `<aside class="dos-key" aria-label="Points clés"><h3>À retenir</h3><ul>${x.keys.map(k => `<li>${MD.inline(k)}</li>`).join("")}</ul></aside>` : ""}
        ${x.body ? `<div class="md">${MD.render(x.body)}</div>` : ""}
        ${x.refs.length ? `<details class="dos-refs"><summary>Références (${x.refs.length})</summary><ol class="refs">${x.refs.join("")}</ol></details>` : ""}
      </section>`).join("");
    const refsNote = R.sourcesState !== "ok" ? `<p class="dos-note" role="status">Les références de ce dossier sont momentanément indisponibles.</p>` : "";
    return `<div class="dos">
      ${secs.length ? `<details class="dos-toc" id="dos-toc" open><summary>Sommaire</summary><nav aria-label="Sommaire du dossier"><ol>${toc}</ol></nav></details>` : ""}
      <article class="dos-art">
        ${intro ? `<div class="dos-intro md">${MD.render(intro)}</div>` : ""}
        ${secs.length ? article : `<p class="quiet">Ce dossier ne contient encore aucune section.</p>`}
        ${refsNote}
        <nav class="dos-end" aria-label="Poursuivre"><a href="${e(Election.hrefFor("candidats.html", el.id))}">Voir les candidats</a><a href="${e(Election.hrefFor("programmes.html", el.id))}">Voir les programmes</a><a href="${e(Election.hrefFor("election.html", el.id))}">Retour à la présentation de l’élection</a></nav>
      </article></div>`;
  }

  /* Sommaire : replié sur mobile, ouvert sur ordinateur ; section courante signalée. */
  function enhance() {
    const toc = $("dos-toc"); if (!toc) return;
    const mq = window.matchMedia("(min-width: 960px)"), sync = () => { toc.open = mq.matches; };
    sync(); mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync);
    toc.addEventListener("click", ev => { if (ev.target.closest("a") && !mq.matches) toc.open = false; });
    if (!("IntersectionObserver" in window)) return;
    const links = new Map([...toc.querySelectorAll("a[data-s]")].map(a => [a.dataset.s, a]));
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { links.forEach(a => a.removeAttribute("aria-current")); const a = links.get(en.target.id); if (a) a.setAttribute("aria-current", "true"); } }), { rootMargin: "-20% 0px -70% 0px" });
    document.querySelectorAll(".dos-sec").forEach(s => io.observe(s));
  }

  Election.need(mount).then(el => {
    if (!el) return;
    const cname = el.countries && el.countries.name;
    $("p-label").textContent = cname ? "Comprendre le pays · " + cname : "Comprendre le pays";
    let holder = null;
    UI.mount(mount, async () => (holder = await load(el)), R => render(R, el), {
      loading: "Chargement du dossier…",
      empty: `<p><b>Aucun dossier n’est publié pour ${e(cname || "ce pays")}.</b></p><p style="margin-top:8px"><a href="${e(Election.hrefFor("election.html", el.id))}">Retour à la présentation de l’élection</a></p>`,
      after: () => {
        const d = holder.dossier, t = pick(d, TITLE), sub = pick(d, SUB);
        if (t) { $("p-title").textContent = t; document.title = t + " · Au résultat"; }
        if (sub) $("p-lede").textContent = sub;
        enhance();
        if (location.hash) { const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (target) target.scrollIntoView(); }
      }
    });
  });
})();
