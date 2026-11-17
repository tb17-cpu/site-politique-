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
    if (e.kind === "incomplete") return "La base de données a renvoyé une réponse incomplète.";
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
    if (o.offset) p.push(`offset=${o.offset}`);
    return `${table}?${p.join("&")}`;
  }

  /* ---- Filtrage complémentaire côté navigateur (la protection principale reste RLS) ----
     Tables ayant une colonne publication_status : seules les lignes dont le statut vaut exactement « published »
     sont conservées (statut absent, brouillon, archivé ou inconnu : écartés).
     Tables de liaison sans statut propre (measure_sources, measure_themes, measure_relations, analysis_sources,
     candidacy_sources, candidacy_sponsorship_territories) : pas de filtre de statut ; leurs lignes sont écartées
     quand l'objet publié qu'elles relient (source, thème) n'est pas visible. */
  const PUBLISHED = "published";
  const WITH_STATUS = new Set(["countries", "elections", "people", "parties", "candidacies", "programs", "program_versions",
    "themes", "measures", "sources", "analyses", "indicators", "indicator_observations", "policy_cases", "case_outcomes", "poll_snapshots", "election_sources"]);
  const REQUIRED_EMBED = { country_dossier_section_sources: "sources", election_sources: "sources", case_measure_relations: "policy_cases", policy_case_sources: "sources", case_outcome_sources: "sources", measure_sources: "sources", analysis_sources: "sources", candidacy_sources: "sources", measure_themes: "themes" };

  /* Nettoyage récursif des données imbriquées : un objet imbriqué portant un statut autre que « published »
     devient null ; une ligne de liaison dont l'objet requis est absent disparaît. */
  function clean(v, key) {
    if (Array.isArray(v)) {
      const need = REQUIRED_EMBED[key];
      return v.map(x => clean(x)).filter(x => x !== null && !(need && x && typeof x === "object" && x[need] == null));
    }
    if (v && typeof v === "object") {
      if (Object.prototype.hasOwnProperty.call(v, "publication_status") && v.publication_status !== PUBLISHED) return null;
      const o = {};
      for (const k of Object.keys(v)) o[k] = clean(v[k], k);
      return o;
    }
    return v;
  }
  const visible = (table, rows) => rows
    .filter(r => !WITH_STATUS.has(table) || (r && r.publication_status === PUBLISHED))
    .map(r => clean(r)).filter(r => r !== null);
  /* Une mesure n'est présentée que si toute sa chaîne parente est visible : version, programme, candidature, candidat. */
  /* Filtre par élection : la candidature de la mesure doit appartenir à l'élection active (sans élection : tout). */
  const inElection = electionId => m => !electionId || String(m.program_versions.programs.candidacies.election_id) === String(electionId);
  const chainOk = m => !!(m && m.program_versions && m.program_versions.programs && m.program_versions.programs.candidacies && m.program_versions.programs.candidacies.people);

  /* Pagination automatique. Le serveur plafonne silencieusement chaque réponse (1000 lignes par défaut, mais ce seuil se
     règle côté Supabase : il n'est donc jamais supposé). La fin des données est établie par le TOTAL EXACT (en-tête
     Content-Range, demandé avec « Prefer: count=exact »), jamais par la taille d'une page.
     - Requête avec « limit » explicite (une ligne, etc.) : inchangée.
     - Sinon : une première requête (page + total). Si elle contient déjà tout, c'est terminé.
     - Sinon les données sont relues avec un ordre déterministe (l'ordre demandé, puis « id » pour départager les ex æquo :
       ni doublon ni omission d'une page à l'autre), en avançant du nombre de lignes RÉELLEMENT reçues, quelle que soit la
       taille de page imposée par le serveur.
     - Total illisible : une requête de sonde (1 ligne à la suite) confirme la fin, puis les pages sont lues jusqu'à une
       page vide.
     - Garde-fous explicites (erreur « incomplete », jamais de résultat tronqué) : total non atteint ou dépassé, doublons,
       page vide avant le total, nombre de requêtes excessif (serveur qui ignorerait « offset », par exemple).
     Les erreurs réseau et HTTP sont propagées telles quelles par call(). */
  const FORMALIZATION = ["official_program", "party_position", "candidate_pledge", "recent_announcement", "press_reported"];
  const PAGE = 1000, HARD_CAP = 20000, NO_TOTAL_CAP = 5000, COUNT = { headers: { Prefer: "count=exact" } };
  const totalOf = res => { const m = /\/(\d+)$/.exec(res.headers.get("content-range") || ""); return m ? +m[1] : null; };
  const hasDupes = list => { const ids = list.map(r => r && r.id).filter(x => x !== undefined && x !== null); return new Set(ids).size !== ids.length; };
  const incomplete = why => new DbError("incomplete", why, 200);
  async function fetchAll(table, o) {
    if (o.limit) return (await call(url(table, o))).json();
    const res = await call(url(table, Object.assign({}, o, { limit: PAGE })), COUNT);
    const first = await res.json(), total = totalOf(res);
    if (total !== null && first.length >= total) { if (first.length > total) throw incomplete("Total incohérent"); return first; }
    if (total === null) {
      if (first.length === 0) return first;
      const probe = await (await call(url(table, Object.assign({}, o, { limit: 1, offset: first.length })))).json();
      if (probe.length === 0) return first;
    }
    const order = o.order ? (/(^|,)id\./.test(o.order) ? o.order : o.order + ",id.asc") : "id.asc";
    const all = []; let t = null;
    /* Garde-fou : avec le total exact, au plus total + 2 requêtes (chaque requête doit apporter au moins une ligne, sinon erreur) ;
       sans total, 5000 requêtes au plus (5 millions de lignes à 1000 par page : bien au-delà de ce site). Dans tous les cas, plafond
       absolu de 20000 requêtes. Un dépassement lève « incomplete » : jamais de résultat tronqué ni de boucle sans fin. */
    const cap = total !== null ? Math.min(total + 2, HARD_CAP) : NO_TOTAL_CAP;
    if (total !== null && total > HARD_CAP) throw incomplete("Volume de données excessif pour la pagination");
    for (let n = 0; n < cap; n++) {
      const r = await call(url(table, Object.assign({}, o, { order, limit: PAGE, offset: all.length })), n === 0 ? COUNT : {});
      const part = await r.json();
      if (n === 0) t = totalOf(r);
      all.push(...part);
      if (t !== null ? all.length >= t : part.length === 0) {
        if (t !== null && all.length !== t) throw incomplete("Total incohérent");
        if (hasDupes(all)) throw incomplete("Doublons entre pages");
        return all;
      }
      if (part.length === 0) throw incomplete("Page vide avant la fin des données");
    }
    throw incomplete("Trop de requêtes de pagination (plafond atteint)");
  }

  async function rows(table, o) {
    const key = url(table, o);
    if (!memo.has(key)) memo.set(key, fetchAll(table, o || {}).then(r => visible(table, r)).catch(e => { memo.delete(key); throw e; }));
    return memo.get(key);
  }
  /* Sans le garde-fou : réservé au diagnostic, pour constater ce que RLS laisse passer. */
  const raw = (table, o) => call(url(table, o)).then(r => r.json());
  async function one(table, o) { const r = await rows(table, Object.assign({}, o, { limit: 1 })); return r[0] || null; }
  /* Nombre de lignes visibles (HEAD + count=exact). */
  async function count(table, filter) {
    const res = await call(url(table, { select: "*", filter }), { head: true, headers: { Prefer: "count=exact", Range: "0-0", "Range-Unit": "items" } });
    const m = /\/(\d+)$/.exec(res.headers.get("content-range") || "");
    if (!m) throw new DbError("incomplete", "Réponse sans total");
    return +m[1];
  }

  /* ---- Fonctions par entité ---- */
  const PERSON = "people(id,first_name,last_name,photo_url,biography,official_website,photo_source_url,photo_credit,publication_status)";
  const PARTY = "parties(id,name,acronym,website_url,political_color,political_position_label,publication_status)";
  /* Nature d'un échec, pour distinguer un droit manquant (401/403) d'une relation absente (404) ou d'une requête invalide (400). */
  const classify = e => !(e instanceof DbError) ? "error" : e.kind === "timeout" ? "timeout" : e.kind === "network" ? "network" : e.kind === "incomplete" ? "incomplete"
    : e.status === 401 || e.status === 403 ? "denied" : e.status === 404 ? "missing" : e.status === 400 ? "invalid" : e.status >= 500 ? "server" : "error";
  const D = {
    DbError, humanMessage, classify, rows, raw, one, count,

    /* Dossiers « Comprendre le pays » : lecture indépendante du chargement des élections et des candidats.
       1) liste des dossiers publiés (sans contenu lourd), 2) contenu du dossier du pays. Les références (sources) sont
       demandées avec les sections ; si elles sont refusées ou indisponibles, les sections sont relues sans références et
       l'état est signalé (sourcesState), jamais masqué. */
    countryDossiers: () => rows("country_dossiers", { select: "*" }).then(r => r.filter(d => d && d.editorial_status === PUBLISHED)),
    countryDossier: async dossierId => {
      const f = { id: "eq." + dossierId };
      const SEC = "country_dossier_sections(*";
      const get = async inner => { const r = await rows("country_dossiers", { select: `*,${SEC}${inner})`, filter: f }); return r.filter(d => d && d.editorial_status === PUBLISHED)[0] || null; };
      try { return { dossier: await get(",country_dossier_section_sources(*,sources(*))"), sourcesState: "ok" }; }
      catch (e) {
        if (!(e instanceof DbError) || ["timeout", "network", "incomplete"].includes(classify(e))) throw e;
        console.warn("[Au résultat] Références du dossier indisponibles (" + classify(e) + ", HTTP " + e.status + ") : sections lues sans références.");
        return { dossier: await get(""), sourcesState: classify(e) };
      }
    },


    /* Sondages individuels d'une élection. Retourne { rows } : une liste vide signifie une ABSENCE RÉELLE de sondages publiés.
       Toute erreur (permission, table ou relation absente, schéma, réseau…) est propagée à l'appelant, qui la distingue avec
       DB.classify : une erreur n'est jamais présentée comme « aucun sondage ». Une ligne dont l'entité désignée (candidature,
       parti, personne) n'est pas publiée est écartée. */
    polls: async electionId => {
      const r = await rows("poll_snapshots", { select: `*,sources(id,title,url,publisher,publication_date,publication_status),candidacies(id,candidacy_status,publication_status,${PERSON}),${PARTY},${PERSON}`, filter: { election_id: "eq." + electionId, record_kind: "eq.poll" }, order: "poll_date.desc.nullslast,snapshot_date.desc,value_percent.desc" });
      const ok = x => (x.entity_kind !== "candidacy" || x.candidacies) && (x.entity_kind !== "party" || x.parties) && (x.entity_kind !== "person" || x.people);
      return { rows: r.filter(ok) };
    },

    /* Statuts de formalisation des mesures (colonnes optionnelles de measures, migration 003 non exécutée par défaut).
       Requête SÉPARÉE des listes de mesures : son échec ne bloque jamais une page. Retourne une Map id de mesure -> { status,
       date, note, source }. Un statut n'est retenu que s'il est complet et justifié : valeur autorisée, date de référence, source
       publiée ET associée à la mesure (measure_sources). Sinon il est ignoré (aucun badge) et le nombre d'écarts est signalé en
       console. Colonnes absentes (400/404 avant migration) : fonctionnalité simplement inactive. Autre erreur : avertissement
       en console, non mis en cache (nouvel essai au prochain appel). Jamais déduit de reliability_level. */
    formalizations: () => D._fm || (D._fm = (async () => {
      const out = new Map(); let transient = false;
      try {
        const r = await rows("measures", { select: "id,publication_status,formalization_status,formalization_status_date,formalization_measure_source_id,formalization_note,justification:measure_sources!measures_formalization_measure_source_fk(id,measure_id,page_reference,sources(id,title,url,publisher,publication_date,publication_status))", filter: { formalization_status: "not.is.null" }, order: "id.asc" });
        let ignored = 0;
        r.forEach(m => {
          /* La base garantit que la ligne de measure_sources appartient à la mesure (clé étrangère composite) ; on le revérifie par prudence.
             La source de cette ligne doit être publiée : une source dépubliée (null après nettoyage) supprime le statut. */
          const j = m.justification, src = j && j.sources;
          if (FORMALIZATION.includes(m.formalization_status) && m.formalization_status_date && j && String(j.measure_id) === String(m.id) && src)
            out.set(String(m.id), { status: m.formalization_status, date: m.formalization_status_date, note: m.formalization_note || "", source: src, page: j.page_reference || "" });
          else ignored++;
        });
        if (ignored) console.warn(`[statuts] ${ignored} statut(s) ignoré(s) : valeur inconnue, date manquante, source (référence documentaire) absente, non publiée ou non rattachée à la mesure.`);
      } catch (e) {
        const k = classify(e);
        if (k === "invalid" || k === "missing") console.info("[statuts] colonnes de statut absentes : fonctionnalité inactive (" + k + ").");
        else { transient = true; console.warn("[statuts] lecture impossible :", k, e && e.message); }
      }
      if (transient) D._fm = null;
      return out;
    })()),

    /* Thèmes : familles (parent_id nul) et sous-thèmes. */
    themes: () => rows("themes", { order: "display_order.asc,name.asc" }),

    /* Élections publiées, avec leur pays. Aucune élection n'est codée en dur : tout vient de la base. */
    elections: () => {
      const q = sel => rows("elections", { select: sel, order: "scheduled_date.asc.nullslast,year.asc" });
      const base = "*,countries(id,name,iso2,publication_status)";
      /* Sources de l'élection (election_sources → sources). Si la relation est indisponible, l'élection reste lisible sans ses sources. */
      return q(base + ",election_sources(*,sources(*))").catch(e => { if (e instanceof DbError && (e.status === 400 || e.status === 404)) return q(base); throw e; });
    },

    /* Programmes publiés d'une élection, avec leurs versions et mesures. */
    programs: electionId => rows("programs", {
      select: `*,candidacies!inner(id,election_id,candidacy_status,publication_status,${PERSON},${PARTY}),program_versions(id,version_number,version_label,publication_date,publication_status,measures(id,title,reliability_level,display_order,publication_status))`,
      filter: { "candidacies.election_id": "eq." + electionId }
    }).then(r => r.filter(p => p.candidacies && p.candidacies.people && String(p.candidacies.election_id) === String(electionId))),

    /* Une candidature dont le candidat n'est pas visible n'est pas présentée. */
    candidacies: electionId => rows("candidacies", {
      select: `*,${PERSON},${PARTY}`, filter: { election_id: "eq." + electionId }, order: "display_order.asc.nullslast,announcement_date.asc.nullslast"
    }).then(r => r.filter(c => c.people)),

    /* Les thèmes des mesures servent au regroupement de la fiche ; si cette jointure échoue, la fiche reste lisible sans regroupement. */
    candidacy: id => {
      const sel = themes => `*,${PERSON},${PARTY},elections(id,name,year,publication_status),candidacy_sources(*,sources(*)),candidacy_sponsorship_territories(*,sources(title,url,publication_status)),programs(*,program_versions(*,measures(id,title,reliability_level,display_order,publication_status${themes ? ",measure_themes(themes(id,name,slug,parent_id,publication_status))" : ""})))`;
      const q = themes => rows("candidacies", { limit: 1, select: sel(themes), filter: { id: "eq." + id } });
      return q(true).catch(() => q(false)).then(r => (r[0] && r[0].people) ? r[0] : null);
    },

    measure: id => rows("measures", { limit: 1,
      select: `*,program_versions(*,programs(*,candidacies(id,election_id,candidacy_status,${PERSON},${PARTY}))),measure_themes(themes(id,name,slug,parent_id,publication_status)),measure_sources!measure_sources_measure_id_fkey(*,sources(*)),analyses(*,analysis_sources(*,sources(*))),case_measure_relations(*,policy_cases(*,countries(*),case_outcomes(*,case_outcome_sources(*,sources(*))),policy_case_sources(*,sources(*))))`,
      filter: { id: "eq." + id }
    }).then(r => chainOk(r[0]) ? r[0] : null),

    /* Mesures (avec candidat) pour un ensemble de thèmes. */
    measuresByThemes: (themeIds, electionId) => rows("measures", {
      select: `id,title,reliability_level,publication_status,program_versions(version_label,publication_status,programs(publication_status,candidacies(id,election_id,publication_status,${PERSON}))),measure_themes!inner(theme_id)`,
      filter: { "measure_themes.theme_id": `in.(${themeIds.join(",")})` }, order: "display_order.asc"
    }).then(r => r.filter(chainOk).filter(inElection(electionId))),

    /* Mesures détaillées pour le comparateur. */
    measuresForCompare: (themeIds, electionId) => rows("measures", {
      select: `*,program_versions(version_label,publication_status,programs(publication_status,candidacies(id,election_id,publication_status,${PERSON},${PARTY}))),measure_themes!inner(theme_id)`,
      filter: { "measure_themes.theme_id": `in.(${themeIds.join(",")})` }, order: "display_order.asc"
    }).then(r => r.filter(chainOk).filter(inElection(electionId))),
    relations: ids => rows("measure_relations", { filter: { or: `(measure_a_id.in.(${ids.join(",")}),measure_b_id.in.(${ids.join(",")}))` } }),

    indicators: () => rows("indicators", { order: "domain.asc,name.asc" }),
    observations: () => rows("indicator_observations", { select: "*,countries(name,iso2,publication_status),sources(title,url,publication_status)", order: "period_end.desc.nullslast" }),

    /* Recherche : jeu léger chargé à la demande. */
    searchIndex: async electionId => {
      const [themes, measures, cands] = await Promise.all([
        D.themes(),
        rows("measures", { select: "id,title,publication_status,program_versions(publication_status,programs(publication_status,candidacies(id,election_id,publication_status,people(id,publication_status))))" }).then(r => r.filter(chainOk).filter(inElection(electionId))),
        rows("candidacies", { select: `id,election_id,publication_status,${PERSON}` }).then(r => r.filter(c => c.people && (!electionId || String(c.election_id) === String(electionId))))
      ]);
      return { themes, measures, cands };
    }
  };
  window.DB = D;
})();
