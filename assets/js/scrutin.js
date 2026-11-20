/* Scrutin : logique partagée entre l'accueil d'une élection (bloc sondages, rubrique résultats) et la carte de statut des
   candidats. Données : lignes de poll_snapshots (sondages) et d'election_round_results (résultats officiels, migration 005).
   Aucune écriture, aucune donnée inventée. Un sondage n'est jamais présenté comme un résultat ni inversement. */
(function (g) {
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? { d: +m[3], m: +m[2] - 1, y: +m[1] } : null; };
  const date = iso => { const x = dmy(iso); return x ? `${x.d === 1 ? "1er" : x.d} ${mois[x.m]} ${x.y}` : ""; };
  const pct = v => Number(v) < 1 ? "moins de 1 %" : Number(v).toFixed(1).replace(".", ",") + " %";
  const pct0 = v => Number.isInteger(Math.round(v * 10) / 10) && Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)).replace(".", ",") + " %" : pct(v);
  const nb = n => Number(n).toLocaleString("fr-FR");
  const day = iso => { const x = dmy(iso); return x ? Date.UTC(x.y, x.m, x.d) / 864e5 : null; };

  /* ---- Sondages ---- */
  const key = r => [r.sources && r.sources.id || r.source_id || "", r.pollster || "", r.scenario || "", r.poll_date || "", r.fieldwork_start || ""].join("|");
  const refDate = g => g.rows[0].poll_date || g.rows[0].fieldwork_start || (g.rows[0].sources && g.rows[0].sources.publication_date) || "";
  const rank = g => [(g.rows[0].sources && g.rows[0].sources.publication_date) || "", g.rows[0].poll_date || ""];
  const cmp = (A, B) => { const a = rank(A), b = rank(B);
    return a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : a[1] < b[1] ? 1 : a[1] > b[1] ? -1
      : String(A.rows[0].pollster || "").localeCompare(String(B.rows[0].pollster || "")) || String(A.rows[0].scenario || "").localeCompare(String(B.rows[0].scenario || "")) || (A.key < B.key ? -1 : A.key > B.key ? 1 : 0); };

  /* Tour visé par un sondage. Aucune colonne dédiée : déduit du texte du scénario. « 0 » = indéterminé (jamais utilisé pour une estimation). */
  const roundOf = g => {
    const t = g.rows.map(r => [r.scenario, r.methodology, r.notes].filter(Boolean).join(" ")).join(" ");
    if (/second\s+tour|2(?:e|nd|ème)\s+tour|duel|ballottage|face[-\s]à[-\s]face/i.test(t)) return 2;
    if (/premier\s+tour|1(?:er)\s+tour|1re\s+tour/i.test(t)) return 1;
    return g.rows.length >= 3 ? 1 : 0;
  };

  /* Sondages groupés (un sondage = même source, institut, scénario, dates), du plus récent au plus ancien. */
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

  /* Estimation du poids électoral d'un candidat pour un tour donné. Règles :
     - uniquement des sondages dont le tour est identifié et comportant le candidat, avec une date de référence ;
     - dernier sondage pertinent ; s'il existe d'autres instituts récents (21 jours) sur le MÊME scénario, moyenne simple du
       dernier sondage de chaque institut ; jamais de mélange de tours ni de scénarios. Sinon : { value, date, n, mode } ou null. */
  const estimate = (groups, c, round) => {
    const ok = groups.filter(g => g.round === round && g.date && valueOf(g, c) != null);
    if (!ok.length) return null;
    const top = ok[0], t0 = day(top.date), sc = top.rows[0].scenario || "";
    const near = ok.filter(g => (g.rows[0].scenario || "") === sc && t0 != null && day(g.date) != null && t0 - day(g.date) <= 21 && t0 - day(g.date) >= 0);
    const byInst = new Map(); near.forEach(g => { const p = g.rows[0].pollster || g.key; if (!byInst.has(p)) byInst.set(p, g); });
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

  /* Carte de statut : { label, note, lines } à partir du statut de la candidature (UI.candidacyStage) et, selon l'avancement du
     scrutin, des résultats officiels (kind « result ») et des estimations de sondages (kind « poll »). Chaque ligne : { kind, label, value, detail }.
     - tour non tenu (aucun résultat publié) : aucun score ;
     - estimation du 1er tour seulement tant que ce tour n'a pas de résultat ; du 2nd tour seulement pour un candidat qualifié ;
     - le résultat de chaque tour passé est conservé. */
  const stageCard = (c, polls, results) => {
    const base = g.UI.candidacyStage(c) || null;
    const rds = rounds(results), lines = [];
    let label = base && base.label, note = base && base.note || "";
    const closed = /^(withdrawn|dropped_out|stepped_down|invalidated|rejected)$/.test(String(c.candidacy_status || "").toLowerCase());
    let qualified = false, over = false;
    rds.forEach(rd => {
      const en = entryOf(rd, c); if (!en) return;
      const parts = [en.percent_expressed != null ? pct(en.percent_expressed) + " des suffrages exprimés" : "", en.votes != null ? nb(en.votes) + " voix" : ""].filter(Boolean);
      if (parts.length) lines.push({ kind: "result", round: rd.round_number, label: roundName(rd.round_number), value: parts[0], detail: [parts[1], statusName(rd.result_status) && "résultats " + statusName(rd.result_status).toLowerCase(), rd.held_on && "scrutin du " + date(rd.held_on)].filter(Boolean).join(" · ") });
      if (closed) return;
      const decided = (rd.candidates || []).some(x => x.elected || x.qualified_next_round);
      if (en.elected) { label = "Élu"; note = "au " + roundNameLow(rd.round_number); over = true; qualified = false; }
      else if (en.qualified_next_round) { label = "Qualifié pour le " + roundNameLow(rd.round_number + 1); note = ""; qualified = true; over = false; }
      else if (decided) { label = rd.round_number > 1 ? "Battu" : "Éliminé au premier tour"; note = ""; over = true; qualified = false; }
    });
    const has = n => rds.some(r => r.round_number === n && entryOf(r, c));
    const groups = pollGroups(polls && polls.rows);
    const add = (round, text) => { if (over || closed) return; const e = estimate(groups, c, round); if (!e) return;
      lines.push({ kind: "poll", round, label: text, value: pct0(e.value), detail: (e.mode === "average" ? "moyenne de " + e.n + " sondages · " : "") + "au " + date(e.date) }); };
    if (!has(1) && !rds.length) add(1, "Intentions de vote au premier tour");
    if (qualified && !has(2)) add(2, "Intentions de vote au second tour");
    /* Intentions du tour à venir placées après les résultats déjà obtenus. */
    lines.sort((a, b) => (a.kind === b.kind ? a.round - b.round : a.kind === "result" ? -1 : 1));
    if (!label && !lines.length) return null;
    return { label: label || "", note, lines };
  };

  g.Scrutin = { date, pct, nb, roundName, roundNameLow, statusName, pollGroups, roundOf, estimate, rounds, entryOf, stageCard, dmy };
})(window);
