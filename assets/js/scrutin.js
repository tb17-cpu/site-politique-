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
  const key = r => [r.sources && r.sources.id || r.source_id || "", r.pollster || "", r.scenario || "", r.poll_date || "", r.fieldwork_start || "", r.round == null ? "" : r.round].join("|");
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

  /* Carte de statut : { label, note, lines } à partir du statut de la candidature (UI.candidacyStage) et, selon l'avancement du
     scrutin, des résultats officiels (kind « result ») et des estimations de sondages (kind « poll »). Chaque ligne : { kind, label, value, detail }.
     - tour non tenu (aucun résultat publié) : aucun score ;
     - estimation du 1er tour seulement tant que ce tour n'a pas de résultat ; du 2nd tour seulement pour un candidat qualifié ;
     - le résultat de chaque tour passé est conservé. */
  const stageCard = (c, polls, results) => {
    /* candidacy_status « eliminated » / « defeated » ne suffit JAMAIS à afficher « Éliminé » ou « Battu » : seul un résultat définitif cohérent
       (voir plus bas) peut le conclure. Sans confirmation, ce statut brut est ignoré (aucun statut d'élimination affiché). */
    const claimsLoss = /^(eliminated|defeated)$/.test(String(c.candidacy_status || "").trim().toLowerCase());
    const base = g.UI.candidacyStage(claimsLoss ? Object.assign({}, c, { candidacy_status: "" }) : c) || null;
    const rds = rounds(results), lines = [];
    let label = base && base.label, note = base && base.note || "";
    const closed = /^(withdrawn|dropped_out|stepped_down|invalidated|rejected)$/.test(String(c.candidacy_status || "").toLowerCase());
    let qualified = false, over = false;
    rds.forEach(rd => {
      const en = entryOf(rd, c); if (!en) return;
      const parts = [en.percent_expressed != null ? pct(en.percent_expressed) + " des suffrages exprimés" : "", en.votes != null ? nb(en.votes) + " voix" : ""].filter(Boolean);
      if (parts.length) lines.push({ kind: "result", round: rd.round_number, label: roundName(rd.round_number), value: parts[0], detail: [parts[1], statusName(rd.result_status) && "résultats " + statusName(rd.result_status).toLowerCase(), rd.held_on && "scrutin du " + date(rd.held_on)].filter(Boolean).join(" · ") });
      if (closed) return;
      /* Conclusion fiable : « Éliminé » / « Battu » exigent un résultat DÉFINITIF, des qualifications ou un élu renseignés pour ce tour et
         cohérents (jamais à la fois un élu et des qualifiés). Un résultat provisoire, sans qualification saisie ou incohérent ne
         permet aucune conclusion négative : le statut de la candidature reste inchangé. Élu / qualifié (indicateurs saisis) restent
         affichés, avec la mention « résultats provisoires » tant que le tour n'est pas définitif. */
      const nEl = (rd.candidates || []).filter(x => x.elected).length, nQ = (rd.candidates || []).filter(x => x.qualified_next_round).length;
      const coherent = !(nEl > 0 && nQ > 0), final = rd.result_status === "final", prov = final ? "" : "résultats provisoires";
      if (en.elected && coherent) { label = "Élu"; note = ["au " + roundNameLow(rd.round_number), prov].filter(Boolean).join(" · "); over = final; qualified = false; }
      else if (en.qualified_next_round && coherent) { label = "Qualifié pour le " + roundNameLow(rd.round_number + 1); note = prov; qualified = true; over = false; }
      else if (coherent && (nEl > 0 || nQ > 0)) {
        if (final) { label = nEl > 0 ? "Battu" : "Éliminé au " + roundNameLow(rd.round_number); note = ""; over = true; qualified = false; }
        else { note = "Résultats provisoires : situation à confirmer"; }
      }
    });
    const has = n => rds.some(r => r.round_number === n && entryOf(r, c));
    const groups = pollGroups(polls && polls.rows);
    const add = (round, text) => { if (over || closed) return; const e = estimate(groups, c, round); if (!e) return;
      lines.push({ kind: "poll", round, label: text, value: pct0(e.value), detail: (e.mode === "average" ? "moyenne de " + e.n + " sondages · " : "") + "au " + date(e.date) }); };
    if (!has(1) && !rds.length) add(1, "Intentions de vote au premier tour");
    if (qualified && !has(2)) add(2, "Intentions de vote au second tour");
    /* Intentions du tour à venir placées après les résultats déjà obtenus. */
    lines.sort((a, b) => (a.kind === b.kind ? a.round - b.round : a.kind === "result" ? -1 : 1));
    /* Garde-fou : aucun statut d'élimination ne coexiste avec une estimation de sondage. */
    if (/^(Éliminé|Battu)/.test(label || "")) for (let i = lines.length - 1; i >= 0; i--) if (lines[i].kind === "poll") lines.splice(i, 1);
    if (!label && !lines.length) return null;
    return { label: label || "", note, lines };
  };

  g.Scrutin = { date, pct, nb, roundName, roundNameLow, statusName, pollGroups, roundOf, roundLabel, estimate, WINDOW_DAYS, MAX_AGE_DAYS, rounds, entryOf, stageCard, dmy };
})(window);
