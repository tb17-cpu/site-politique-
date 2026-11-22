/* Scrutin : logique partagée entre l'accueil d'une élection (bloc sondages, rubrique résultats) et la carte de statut des
   candidats. Données : lignes de poll_snapshots (sondages) et d'election_round_results (résultats officiels, migration 005).
   Aucune écriture, aucune donnée inventée. Un sondage n'est jamais présenté comme un résultat ni inversement. */
(function (g) {
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? { d: +m[3], m: +m[2] - 1, y: +m[1] } : null; };
  const date = iso => { const x = dmy(iso); return x ? `${x.d === 1 ? "1er" : x.d} ${mois[x.m]} ${x.y}` : ""; };
  const pct = v => Number(v) < 1 ? "moins de 1 %" : Number(v).toFixed(1).replace(".", ",") + " %";
  /* Estimation : entier si la valeur est ronde (28 %), sinon une décimale (28,5 %). */
  const pct0 = v => Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) + " %" : pct(v);
  const nb = n => Number(n).toLocaleString("fr-FR");
  const day = iso => { const x = dmy(iso); return x ? Date.UTC(x.y, x.m, x.d) / 864e5 : null; };

  /* ---- Sondages ---- */
  const key = r => [r.sources && r.sources.id || r.source_id || "", r.pollster || "", r.scenario || "", r.poll_date || "", r.fieldwork_start || ""].join("|");   /* identité du sondage SANS le tour : le tour est vérifié ensuite (roundOf) */
  const refDate = g => g.rows[0].poll_date || g.rows[0].fieldwork_start || (g.rows[0].sources && g.rows[0].sources.publication_date) || "";
  const rank = g => [(g.rows[0].sources && g.rows[0].sources.publication_date) || "", g.rows[0].poll_date || ""];
  const cmp = (A, B) => { const a = rank(A), b = rank(B);
    return a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : a[1] < b[1] ? 1 : a[1] > b[1] ? -1
      : String(A.rows[0].pollster || "").localeCompare(String(B.rows[0].pollster || "")) || String(A.rows[0].scenario || "").localeCompare(String(B.rows[0].scenario || "")) || (A.key < B.key ? -1 : A.key > B.key ? 1 : 0); };

  /* Tour visé par un sondage : UNIQUEMENT la colonne explicite poll_snapshots.round (migration proposée 006). Le texte du scénario n'est
     jamais interprété. Colonne absente, NULL ou valeurs contradictoires au sein d'un même sondage : 0 = indéterminé (consultable, mais
     jamais utilisé pour une estimation ni une moyenne). */
  const roundOf = g => { const v = g.rows.map(r => r.round == null ? null : Number(r.round));
    return v.every(x => Number.isInteger(x) && x >= 1 && x === v[0]) ? v[0] : 0; };
  const roundLabel = n => n === 1 ? "Premier tour" : n === 2 ? "Second tour" : n > 2 ? "Tour " + n : "Tour non précisé";

  /* Sondages groupés (un sondage = même source, institut, scénario, dates, INDÉPENDAMMENT du tour), du plus récent au plus ancien. Le tour est
     ensuite contrôlé sur l'ensemble des lignes (roundOf) : lignes contradictoires ou tour manquant sur une partie des lignes = tour indéterminé (0),
     sondage conservé dans l'historique (« Tour non précisé ») mais exclu de toute estimation. */
  const pollGroups = rows => {
    const m = new Map();
    (rows || []).filter(r => r.value_percent != null).forEach(r => { const k = key(r); if (!m.has(k)) m.set(k, { key: k, rows: [] }); m.get(k).rows.push(r); });
    const out = [...m.values()].sort(cmp);
    out.forEach(x => { x.date = refDate(x); x.round = roundOf(x); });
    return out;
  };

  const isCand = (r, c) => r.entity_kind === "candidacy" ? r.candidacy_id === c.id
    : r.entity_kind === "person" ? !!(c.people && r.person_id && r.person_id === c.people.id) : false;
  const valueOf = (g, c) => { const r = g.rows.find(x => isCand(x, c)); return r ? Number(r.value_percent) : null; };

  /* Comparabilité et moyenne. Deux sondages ne sont comparables que s'ils visent le même tour (colonne round), présentent exactement
     le même ensemble de candidats ou listes et portent le même libellé de scénario (non vide, comparé sans casse ni espaces multiples).
     Un institut compte une seule fois (le « pour … » du commanditaire est ignoré). Fenêtre : 21 jours avant le sondage de référence
     (fin de terrain). Moyenne simple, non pondérée : aucune pondération par échantillon, aucun redressement. */
  const norm = x => String(x || "").toLowerCase().replace(/\s+/g, " ").trim();
  const inst = g => norm(String(g.rows[0].pollster || "").replace(/\s+pour\s+.*$/i, ""));
  const sig = g => g.rows.map(r => r.entity_kind + ":" + (r.candidacy_id || r.party_id || r.person_id || norm(r.entity_label))).sort().join("|");
  const WINDOW_DAYS = 21;     /* moyenne : sondages comparables à moins de 21 jours du sondage de référence */
  const MAX_AGE_DAYS = 30;    /* fraîcheur : au-delà de 30 jours avant aujourd'hui, aucune estimation n'est présentée comme actuelle */
  const today = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5; };
  const estimate = (groups, c, round) => {
    const ok = groups.filter(g => g.round === round && g.date && day(g.date) != null && valueOf(g, c) != null);
    if (!ok.length) return null;
    /* Référence : fin de terrain la plus récente ; à égalité, ordre de publication (groups est déjà trié). */
    const top = ok.reduce((a, b) => day(b.date) > day(a.date) ? b : a), t0 = day(top.date);
    /* Fraîcheur (règle distincte de la fenêtre de moyenne) : sondage de référence plus ancien que 30 jours -> aucune estimation (le sondage
       reste consultable dans le sélecteur). Une date postérieure à aujourd'hui compte pour 0 jour. */
    if (today() - t0 > MAX_AGE_DAYS) return null;
    const sc = norm(top.rows[0].scenario), sg = sig(top);
    const comparable = sc ? ok.filter(g => norm(g.rows[0].scenario) === sc && sig(g) === sg && inst(g) && t0 - day(g.date) >= 0 && t0 - day(g.date) <= WINDOW_DAYS) : [];
    const byInst = new Map(); comparable.forEach(g => { const k = inst(g), p = byInst.get(k); if (!p || day(g.date) > day(p.date)) byInst.set(k, g); });
    const set = [...byInst.values()];
    if (set.length >= 2) { const vals = set.map(g => valueOf(g, c)); return { value: vals.reduce((a, b) => a + b, 0) / vals.length, date: top.date, n: set.length, mode: "average" }; }
    return { value: valueOf(top, c), date: top.date, n: 1, mode: "latest", pollster: top.rows[0].pollster || "" };
  };

  /* ---- Résultats ---- */
  const roundName = n => n === 1 ? "Premier tour" : n === 2 ? "Second tour" : "Tour " + n;
  const roundNameLow = n => n === 1 ? "premier tour" : n === 2 ? "second tour" : "tour " + n;
  const statusName = s => s === "final" ? "Définitifs" : s === "provisional" ? "Provisoires" : "";
  const isRes = (r, c) => r.entity_kind === "candidacy" ? r.candidacy_id === c.id
    : r.entity_kind === "person" ? !!(c.people && r.person_id && r.person_id === c.people.id) : false;
  const rounds = res => ((res && res.rounds) || []).filter(r => r && r.round_number != null).slice().sort((a, b) => a.round_number - b.round_number);
  const entryOf = (rd, c) => (rd.candidates || []).find(x => isRes(x, c)) || null;

  /* ====== Logique métier unique des statuts électoraux (fiche, liste, carte de statut, rubrique résultats) ======
     Principe : une valeur brute de candidacies (« elected », « winner », « eliminated », « defeated », « second_round »…) n'est JAMAIS une
     preuve. Élu, qualifié, éliminé, battu ne se déduisent que des résultats enregistrés (election_candidate_results), tour par tour :
       - résultat « final » cohérent  -> statut ferme (Élu, Qualifié pour le tour suivant, Éliminé, Battu) ;
       - résultat « provisional » cohérent -> « Élu provisoire » ou « Qualifié … » avec mention ; aucune conclusion négative ;
       - incohérence (élu ET qualifiés dans le même tour, statut de résultat inconnu) -> AUCUN statut issu de ce tour ;
       - pas de résultat -> aucun statut d'issue. Le nombre d'élus n'est pas limité (scrutins à plusieurs élus).
     Information absente ou non pertinente à la phase : rien n'est produit (null), jamais de texte de remplacement. */
  const verdict = rd => {
    const cs = rd.candidates || [], nEl = cs.filter(x => x.elected).length, nQ = cs.filter(x => x.qualified_next_round).length;
    const final = rd.result_status === "final", prov = rd.result_status === "provisional";
    const contradictory = nEl > 0 && nQ > 0;
    return { nEl, nQ, final, provisional: prov, contradictory, usable: (final || prov) && !contradictory };
  };
  /* Issue d'une ligne de résultat dans son tour : { kind: elected|qualified|eliminated|beaten, provisional } ou null (aucune conclusion). */
  /* Issue TERMINALE d'une ligne dans son tour (élu, ou éliminé/battu sur résultat définitif) : elle clôt le parcours du candidat. */
  const terminal = (en, rd) => { const v = verdict(rd);
    return v.usable && (en.elected || (v.final && !en.qualified_next_round && (v.nEl > 0 || v.nQ > 0))); };
  /* Parcours incohérent : un même candidat porte une issue terminale à un tour ET figure dans un autre tour (avant : « élu » puis candidat d'un tour
     antérieur ne pose pas de problème en soi, mais une issue terminale ANTÉRIEURE suivie d'une présence ultérieure, ou l'inverse vue depuis la ligne
     antérieure, est contradictoire). Aucune issue n'est alors affichée pour ce candidat (aucun statut ultérieur n'écrase silencieusement une victoire
     antérieure, aucune victoire ne masque un résultat ultérieur) ; les scores de chaque tour restent visibles. Pas de règle sur le nombre d'élus. */
  const pathConflict = (en, rd, rds) => rds.some(r => r !== rd && (r.candidates || []).some(x => sameEntity(x, en) &&
    (r.round_number < rd.round_number ? terminal(x, r) : terminal(en, rd))));
  const outcome = (en, rd, rds) => {
    const v = verdict(rd); if (!en || !v.usable) return null;
    if (pathConflict(en, rd, rds)) return null;
    if (en.elected) return { kind: "elected", provisional: !v.final };
    if (en.qualified_next_round) {
      /* Qualifié mais un tour suivant publié ne le mentionne pas : incohérent, aucune conclusion. */
      const later = rds.filter(r => r.round_number > rd.round_number);
      if (later.length && !later.some(r => (r.candidates || []).some(x => sameEntity(x, en)))) return null;
      return { kind: "qualified", provisional: !v.final };
    }
    if ((v.nEl > 0 || v.nQ > 0) && v.final) return { kind: v.nEl > 0 ? "beaten" : "eliminated", provisional: false };
    return null;
  };
  const sameEntity = (a, b) => a.entity_kind === b.entity_kind && (a.candidacy_id || a.party_id || a.person_id || norm(a.entity_label)) === (b.candidacy_id || b.party_id || b.person_id || norm(b.entity_label));
  /* Pastille d'un candidat dans la rubrique résultats : seulement une issue valide (élu / qualifié) ; jamais de statut contradictoire. */
  const tagFor = (en, rd, rds) => { const o = outcome(en, rd, rds); if (!o || (o.kind !== "elected" && o.kind !== "qualified")) return null;
    return o.kind === "elected" ? { text: o.provisional ? "Élu provisoire" : "Élu", provisional: o.provisional, win: true } : { text: "Qualifié pour le " + roundNameLow(rd.round_number + 1), provisional: o.provisional, win: false }; };

  /* Issue COURANTE d'un candidat : celle du dernier tour où il figure. Quand ce tour ne conclut rien pour lui (résultats provisoires sans issue
     pour lui, tour sans élu ni qualifiés renseignés, tour incohérent), la qualification DÉFINITIVEMENT acquise à un tour antérieur est conservée :
     l'absence de résultat définitif n'est pas une perte de qualification. Seul un résultat ultérieur qui conclut (élu, battu, éliminé, nouvelle
     qualification) la remplace. Valable pour toute transition entre tours (1 -> 2, 2 -> 3, …). Une qualification antérieure seulement
     PROVISOIRE n'est jamais reportée. Retourne { o, rd, carried } ou null. */
  const current = (c, rds) => {
    const ent = rds.map(r => ({ rd: r, en: entryOf(r, c) })).filter(x => x.en);
    if (!ent.length) return null;
    const last = ent[ent.length - 1], o = outcome(last.en, last.rd, rds);
    if (o) return { o, rd: last.rd, carried: false };
    for (let i = ent.length - 2; i >= 0; i--) {
      const q = outcome(ent[i].en, ent[i].rd, rds);
      if (q) return q.kind === "qualified" && !q.provisional ? { o: q, rd: ent[i].rd, carried: true, latest: last.rd } : null;
    }
    return null;
  };

  /* Statut d'un candidat : { label, note, provisional, kind, round } ou null. Seule source pour la fiche, la liste et la carte. */
  const status = (c, results) => {
    const rds = rounds(results), raw = g.UI.candidacyStage(c);   /* statuts de candidature uniquement (jamais d'issue brute) */
    if (raw && raw.closed) return { label: raw.label, note: raw.note, kind: "closed", provisional: false };
    const cur = current(c, rds);
    if (cur) { const o = cur.o, rd = cur.rd;
      const next = roundNameLow(rd.round_number + 1), at = roundNameLow(rd.round_number);
      /* qualification reportée : le tour suivant est en cours, ses résultats sont provisoires ou ne concluent pas encore */
      const note = o.provisional ? "résultats provisoires" : cur.carried && cur.latest.result_status === "provisional" ? "résultats du " + roundNameLow(cur.latest.round_number) + " provisoires" : "";
      if (o.kind === "elected") return { label: o.provisional ? "Élu provisoire" : "Élu", note: o.provisional ? "résultats provisoires" : "au " + at, kind: "elected", provisional: o.provisional, round: rd.round_number };
      if (o.kind === "qualified") return { label: "Qualifié pour le " + next, note, kind: "qualified", provisional: o.provisional, round: rd.round_number };
      return { label: o.kind === "beaten" ? "Battu" : "Éliminé au " + at, note: "", kind: o.kind, provisional: false, round: rd.round_number };
    }
    /* Aucun statut issu des résultats. Statut de candidature (avant le vote) : pertinent seulement tant qu'aucun résultat n'existe pour l'élection. */
    return raw && !rds.length ? { label: raw.label, note: raw.note, kind: "candidacy", provisional: false } : null;
  };

  /* Carte de statut : { label, note, provisional, lines } — statut commun (status) + lignes de résultats officiels (kind « result ») et
     d'estimations de sondages (kind « poll »). Rien à afficher -> null (aucune carte, aucun titre, aucun message de remplacement).
     Estimation du 1er tour : tant qu'aucun résultat n'existe ; du tour suivant : pour un qualifié valide dont ce tour n'a pas de résultat. */
  const stageCard = (c, polls, results) => {
    const rds = rounds(results), st = status(c, results), lines = [];
    rds.forEach(rd => { const en = entryOf(rd, c); if (!en) return;
      const parts = [en.percent_expressed != null ? pct(en.percent_expressed) + " des suffrages exprimés" : "", en.votes != null ? nb(en.votes) + " voix" : ""].filter(Boolean);
      if (parts.length) lines.push({ kind: "result", round: rd.round_number, label: roundName(rd.round_number), value: parts[0], detail: [parts[1], statusName(rd.result_status) && "résultats " + statusName(rd.result_status).toLowerCase(), rd.held_on && "scrutin du " + date(rd.held_on)].filter(Boolean).join(" · ") }); });
    const over = !!st && (st.kind === "elected" && !st.provisional || st.kind === "beaten" || st.kind === "eliminated" || st.kind === "closed");
    const has = n => rds.some(r => r.round_number === n && entryOf(r, c));
    const groups = pollGroups(polls && polls.rows);
    const add = (round, text) => { if (over) return; const e = estimate(groups, c, round); if (!e) return;
      lines.push({ kind: "poll", round, label: text, value: pct0(e.value), detail: (e.mode === "average" ? "moyenne de " + e.n + " sondages · " : "") + "au " + date(e.date) }); };
    if (!rds.length) add(1, "Intentions de vote au premier tour");
    if (st && st.kind === "qualified" && !has(st.round + 1)) add(st.round + 1, "Intentions de vote au " + roundNameLow(st.round + 1));
    lines.sort((a, b) => (a.kind === b.kind ? a.round - b.round : a.kind === "result" ? -1 : 1));
    if (!st && !lines.length) return null;
    return { label: st ? st.label : "", note: st ? st.note : "", provisional: !!(st && st.provisional), kind: st ? st.kind : "", lines };
  };

  /* Rapprochement éditorial (diagnostic, lecture seule) : colonnes DÉCLARATIVES second_round_status / second_round_qualified_at (sans source ni
     provenance) comparées aux résultats publiés. N'alimente AUCUN affichage public : ni preuve, ni statut. Retourne { confirmed, unconfirmed, undeclared }. */
  const qualificationAudit = (candidacies, results) => {
    const rds = rounds(results), out = { confirmed: [], unconfirmed: [], undeclared: [] };
    (candidacies || []).forEach(c => {
      const declared = String(c.second_round_status || "").trim().toLowerCase() === "qualified" || !!c.second_round_qualified_at;
      const q = rds.some(rd => { const en = entryOf(rd, c); return en && outcome(en, rd, rds) && outcome(en, rd, rds).kind === "qualified"; });
      if (declared && q) out.confirmed.push(c.id); else if (declared) out.unconfirmed.push(c.id); else if (q) out.undeclared.push(c.id);
    });
    return out;
  };

  g.Scrutin = { qualificationAudit, date, pct, nb, roundName, roundNameLow, statusName, pollGroups, roundOf, roundLabel, estimate, WINDOW_DAYS, MAX_AGE_DAYS, rounds, entryOf, stageCard, status, outcome, verdict, tagFor, dmy };
})(window);
