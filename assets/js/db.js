/* Module central d'accès aux données : une seule connexion, lecture seule, via l'API REST de Supabase (PostgREST).
   Aucune dépendance. Seul l'en-tête « apikey » (clé publishable) est envoyé. RLS décide de ce qui est visible. */
(function () {
  const CFG = window.SUPABASE_CONFIG;
  const memo = new Map();

  class DbError extends Error {
    constructor(kind, message, status) { super(message); this.kind = kind; this.status = status; }
  }
  /* Message compréhensible pour le visiteur. */
  const humanMessage = e => {
    if (!(e instanceof DbError)) return "Une erreur inattendue est survenue.";
    if (e.kind === "timeout") return "La base de données met trop de temps à répondre.";
    if (e.kind === "network") return "Impossible de joindre la base de données. Vérifiez votre connexion.";
    if (e.status === 401 || e.status === 403) return "L’accès à ces données est refusé.";
    if (e.status === 404) return "Cette donnée est introuvable.";
    if (e.status >= 500) return "La base de données rencontre un problème temporaire.";
    return "La base de données a refusé la requête.";
  };

  async function call(path, opts = {}, attempt = 0) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), CFG.timeoutMs);
    try {
      const res = await fetch(`${CFG.url}/rest/v1/${path}`, {
        method: opts.head ? "HEAD" : "GET", signal: ctl.signal,
        headers: Object.assign({ apikey: CFG.key, Accept: "application/json" }, opts.headers || {})
      });
      if (!res.ok) throw new DbError("http", `HTTP ${res.status}`, res.status);
      return res;
    } catch (e) {
      if (e instanceof DbError) throw e;
      if (e.name === "AbortError") throw new DbError("timeout", "timeout");
      if (attempt < 1) return call(path, opts, attempt + 1);
      throw new DbError("network", String(e.message || e));
    } finally { clearTimeout(timer); }
  }

  /* Construit « table?select=…&col=op.val&order=… ». Les valeurs sont encodées. */
  function url(table, o = {}) {
    const p = [`select=${encodeURIComponent(o.select || "*").replace(/%2C/g, ",").replace(/%28/g, "(").replace(/%29/g, ")").replace(/%2A/g, "*").replace(/%21/g, "!")}`];
    Object.entries(o.filter || {}).forEach(([k, v]) => p.push(`${k}=${encodeURIComponent(v).replace(/%2C/g, ",").replace(/%28/g, "(").replace(/%29/g, ")")}`));
    if (o.order) p.push(`order=${o.order}`);
    if (o.limit) p.push(`limit=${o.limit}`);
    return `${table}?${p.join("&")}`;
  }

  /* Garde-fou : jamais d'affichage d'une ligne explicitement en brouillon, même si une règle RLS était trop large. */
  const visible = rows => rows.filter(r => !r || r.publication_status !== "draft");

  async function rows(table, o) {
    const key = url(table, o);
    if (!memo.has(key)) memo.set(key, call(key).then(r => r.json()).then(visible).catch(e => { memo.delete(key); throw e; }));
    return memo.get(key);
  }
  /* Sans le garde-fou : réservé au diagnostic, pour constater ce que RLS laisse passer. */
  const raw = (table, o) => call(url(table, o)).then(r => r.json());
  async function one(table, o) { const r = await rows(table, Object.assign({}, o, { limit: 1 })); return r[0] || null; }
  /* Nombre de lignes visibles (HEAD + count=exact). */
  async function count(table, filter) {
    const res = await call(url(table, { select: "*", filter }), { head: true, headers: { Prefer: "count=exact", Range: "0-0", "Range-Unit": "items" } });
    const m = /\/(\d+)$/.exec(res.headers.get("content-range") || "");
    return m ? +m[1] : 0;
  }

  /* ---- Fonctions par entité ---- */
  const PERSON = "people(id,first_name,last_name,photo_url,biography,official_website)";
  const PARTY = "parties(id,name,acronym,website_url)";
  const D = {
    DbError, humanMessage, rows, raw, one, count,

    /* Thèmes : familles (parent_id nul) et sous-thèmes. */
    themes: () => rows("themes", { order: "display_order.asc,name.asc" }),

    /* Élection par défaut (France 2027), avec son pays. */
    election: () => one("elections", {
      select: "*,countries!inner(id,name,iso2)",
      filter: { "countries.iso2": "eq." + CFG.election.iso2, year: "eq." + CFG.election.year }
    }),

    candidacies: electionId => rows("candidacies", {
      select: `*,${PERSON},${PARTY}`, filter: { election_id: "eq." + electionId }, order: "announcement_date.asc.nullslast"
    }),

    candidacy: id => one("candidacies", {
      select: `*,${PERSON},${PARTY},elections(id,name,year),candidacy_sources(*,sources(*)),candidacy_sponsorship_territories(*,sources(title,url)),programs(*,program_versions(*,measures(id,title,reliability_level,display_order,publication_status)))`,
      filter: { id: "eq." + id }
    }),

    measure: id => one("measures", {
      select: `*,program_versions(*,programs(*,candidacies(id,candidacy_status,${PERSON},${PARTY}))),measure_themes(themes(id,name,slug,parent_id)),measure_sources(*,sources(*)),analyses(*,analysis_sources(*,sources(*)))`,
      filter: { id: "eq." + id }
    }),

    /* Mesures (avec candidat) pour un ensemble de thèmes. */
    measuresByThemes: themeIds => rows("measures", {
      select: `id,title,reliability_level,program_versions(version_label,programs(candidacies(id,${PERSON}))),measure_themes!inner(theme_id)`,
      filter: { "measure_themes.theme_id": `in.(${themeIds.join(",")})` }, order: "display_order.asc"
    }),

    /* Mesures détaillées pour le comparateur. */
    measuresForCompare: themeIds => rows("measures", {
      select: `*,program_versions(version_label,programs(candidacies(id,${PERSON},${PARTY}))),measure_themes!inner(theme_id)`,
      filter: { "measure_themes.theme_id": `in.(${themeIds.join(",")})` }, order: "display_order.asc"
    }),
    relations: ids => rows("measure_relations", { filter: { or: `(measure_a_id.in.(${ids.join(",")}),measure_b_id.in.(${ids.join(",")}))` } }),

    indicators: () => rows("indicators", { order: "domain.asc,name.asc" }),
    observations: () => rows("indicator_observations", { select: "*,countries(name,iso2),sources(title,url)", order: "period_end.desc.nullslast" }),

    /* Recherche : jeu léger chargé à la demande. */
    searchIndex: async () => {
      const [themes, measures, cands] = await Promise.all([
        D.themes(),
        rows("measures", { select: "id,title" }),
        rows("candidacies", { select: `id,${PERSON}` })
      ]);
      return { themes, measures, cands };
    }
  };
  window.DB = D;
})();
