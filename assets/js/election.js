/* Contexte « élection » du site : liste dynamique des élections publiées (Supabase), élection active,
   sélecteur permanent dans l'en-tête, barre de rubriques propre à l'élection, conservation entre les pages.
   Aucune élection n'est codée en dur : une nouvelle élection publiée dans la base apparaît seule.
   Élection active, par ordre de priorité : paramètre d'URL ?e=<id>, dernière élection consultée (stockage local),
   sinon l'unique élection publiée. S'il y en a plusieurs et aucune n'est choisie, les pages proposent le choix. */
(function () {
  const S = window.SITE, body = document.body, page = body.dataset.page || "", navKey = body.dataset.nav || page;
  const file = location.pathname.split("/").pop() || "index.html";
  /* Pages qui dépendent de l'élection : leur lien reçoit automatiquement ?e=<élection active>. */
  const SCOPED = new Set(["election.html", "candidats.html", "candidat.html", "programmes.html", "thematiques.html", "comparateur.html", "indicateurs.html", "mesure.html", "pays.html"]);
  const FICHES = new Set(["candidat.html", "mesure.html"]);
  const KEY = "ar.election";
  const store = { get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) { /* stockage indisponible */ } } };
  const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const day = s => s ? new Date(String(s).slice(0, 10) + "T12:00:00") : null;

  let list = null, listP = null, cur = null, loadErr = null;

  /* Libellé : « France — Présidentielle 2027 » sans répéter le pays s'il figure déjà dans le nom. */
  const name = el => { const c = el.countries && el.countries.name; return c && !norm(el.name).includes(norm(c)) ? `${c} — ${el.name}` : el.name; };
  /* En cours / à venir / terminée, déduit des dates existantes (scheduled_date, actual_date, second_round_date). */
  const status = el => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = day(el.second_round_date) || day(el.actual_date) || day(el.scheduled_date), start = day(el.scheduled_date);
    if (end && end < today) return { key: "past", label: "Terminée" };
    if (start && start > today) return { key: "upcoming", label: "À venir" };
    if (start || end) return { key: "live", label: "En cours" };
    return { key: "unknown", label: "" };   /* aucune date : aucune situation affichée (jamais de texte de remplacement) */
  };
  const when = el => { const d = el.actual_date || el.scheduled_date; return d ? new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""; };

  const load = () => listP || (listP = DB.elections().then(r => { list = r.slice().sort((a, b) => (status(a).key === "past") - (status(b).key === "past")); return list; })
    .catch(err => { listP = null; loadErr = err; throw err; }));

  const resolve = () => {
    const ids = new Set(list.map(x => String(x.id)));
    const fromUrl = new URLSearchParams(location.search).get("e"), saved = store.get();
    const id = [fromUrl, saved].find(v => v && ids.has(String(v))) || (list.length === 1 ? String(list[0].id) : null);
    cur = id ? list.find(x => String(x.id) === String(id)) : null;
    if (cur) store.set(String(cur.id));
    return cur;
  };

  const hrefFor = (target, id) => { const u = new URL(target, location.href); if (id) u.searchParams.set("e", id); return u.pathname.split("/").pop() + u.search + u.hash; };

  /* ---- Sélecteur permanent ---- */
  function renderSelect() {
    const sel = document.getElementById("elec-select"); if (!sel) return;
    if (loadErr) { sel.innerHTML = `<option>Élections indisponibles</option>`; sel.disabled = true; return; }
    if (!list.length) { sel.innerHTML = `<option>Aucune élection publiée</option>`; sel.disabled = true; return; }
    const opt = el => `<option value="${esc(el.id)}"${cur && String(cur.id) === String(el.id) ? " selected" : ""}>${esc(name(el))}${status(el).label ? " · " + esc(status(el).label) : ""}</option>`;
    const act = list.filter(x => status(x).key !== "past"), past = list.filter(x => status(x).key === "past");
    sel.disabled = false;
    sel.innerHTML = `<option value=""${cur ? "" : " selected"}>Choisir une élection…</option>` +
      (act.length ? `<optgroup label="En cours et à venir">${act.map(opt).join("")}</optgroup>` : "") +
      (past.length ? `<optgroup label="Terminées">${past.map(opt).join("")}</optgroup>` : "");
  }
  function onPick(e) {
    const id = e.target.value;
    if (!id) { store.set(null); location.href = "index.html"; return; }
    store.set(String(id));
    /* Page de rubrique : même rubrique pour la nouvelle élection. Fiche ou autre page : vue d'ensemble / liste. */
    const target = FICHES.has(file) ? (file === "mesure.html" ? "thematiques.html" : "candidats.html") : SCOPED.has(file) ? file : "election.html";
    location.href = hrefFor(target, id);
  }

  /* ---- Barre de rubriques de l'élection active ---- */
  function renderBar() {
    const bar = document.getElementById("elec-bar"); if (!bar) return;
    if (body.dataset.scope !== "election" || !cur) { bar.innerHTML = ""; return; }
    const st = status(cur);
    bar.innerHTML = `<div class="elec-bar"><div class="wrap">
      <div class="eb-title"><span class="label">Élection</span><b>${esc(name(cur))}</b>${st.label ? `<span class="eb-st eb-${st.key}">${esc(st.label)}</span>` : ""}</div>
      <nav class="eb-nav" aria-label="Rubriques de l’élection"><ul>${S.electionNav.map(n =>
        `<li><a href="${esc(hrefFor(n.href, cur.id))}"${n.id === navKey ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`).join("")}</ul></nav></div></div>`;
    const cu = bar.querySelector('.eb-nav a[aria-current="page"]'), ul = cu && cu.closest("ul");
    if (ul && ul.scrollWidth > ul.clientWidth) ul.scrollLeft = Math.max(0, cu.offsetLeft - (ul.clientWidth - cu.offsetWidth) / 2);
  }

  /* ---- Liens : l'élection active suit le visiteur ---- */
  function fix(a) {
    if (!cur || !a || !a.getAttribute) return;
    const h = a.getAttribute("href"); if (!h || h[0] === "#") return;
    try {
      const u = new URL(h, location.href);
      if (u.origin !== location.origin || !SCOPED.has(u.pathname.split("/").pop()) || u.searchParams.has("e")) return;
      u.searchParams.set("e", cur.id); a.setAttribute("href", u.pathname.split("/").pop() + u.search + u.hash);
    } catch (err) { /* lien non analysable : laissé tel quel */ }
  }
  ["pointerdown", "mouseover", "focusin", "touchstart", "click", "contextmenu"].forEach(t =>
    document.addEventListener(t, ev => { const a = ev.target && ev.target.closest && ev.target.closest("a[href]"); if (a) fix(a); }, true));

  function refresh() { renderSelect(); renderBar(); document.querySelectorAll("a[href]").forEach(fix);
    if (cur && body.dataset.scope === "election" && !new URLSearchParams(location.search).has("e")) {
      const u = new URL(location.href); u.searchParams.set("e", cur.id); history.replaceState(null, "", u.pathname.split("/").pop() + u.search + u.hash);
    } }

  /* ---- Choix de l'élection (aucune active) ---- */
  function chooser(target) {
    return `<div class="elec-choose"><p class="p-sub">Choisissez une élection : chaque rubrique n’affiche que les contenus de l’élection sélectionnée.</p>
      <ul class="h-doors">${list.map(el => { const st = status(el), w = when(el);
        return `<li><a class="h-door" href="${esc(hrefFor(target || "election.html", el.id))}"><span class="h-top">${st.label ? `<span class="h-badge h-badge--${esc(st.key)}">${esc(st.label)}</span>` : ""}${w ? `<span class="h-date">${esc(w)}</span>` : ""}</span>
          <h3>${esc(name(el))}</h3><span class="h-foot"><span class="h-go">Ouvrir <span aria-hidden="true">→</span></span></span></a></li>`; }).join("")}</ul></div>`;
  }

  /* Pour les pages de rubrique : renvoie l'élection active ou affiche, dans `mount`, le choix / l'état vide / l'erreur. */
  async function need(mount) {
    try { await load(); } catch (err) {
      mount.innerHTML = UI.errorHtml(err);
      const b = mount.querySelector("[data-retry]"); if (b) b.addEventListener("click", () => location.reload());
      return null;
    }
    if (!list.length) { mount.innerHTML = UI.emptyHtml("<p><b>Aucune élection disponible.</b></p>"); return null; }
    if (resolve()) { refresh(); return cur; }
    mount.innerHTML = chooser(file); refresh(); return null;
  }
  /* Fiches (candidat, mesure) : l'élection de la donnée affichée devient l'élection active. */
  async function use(id) {
    try { await load(); } catch (err) { return null; }
    const el = id && list.find(x => String(x.id) === String(id));
    if (el) { cur = el; store.set(String(el.id)); } else resolve();
    refresh(); return cur;
  }

  const ready = load().then(() => { resolve(); refresh(); }).catch(() => { refresh(); });
  document.addEventListener("DOMContentLoaded", () => { const sel = document.getElementById("elec-select"); if (sel) sel.addEventListener("change", onPick); });
  if (document.readyState !== "loading") { const sel = document.getElementById("elec-select"); if (sel) sel.addEventListener("change", onPick); }

  window.Election = { ready, load, need, use, name, status, when, chooser, hrefFor, current: () => cur, list: () => list };
})();
