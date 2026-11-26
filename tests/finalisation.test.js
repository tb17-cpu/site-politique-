/* Vérifications ciblées de finalisation : DB.results (42P01 : seule l'absence de election_round_results active le mode de compatibilité) et
   regroupement des sondages indépendant du tour (tour contradictoire ou indéterminé = jamais d'estimation, historique conservé).
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES. Serveur statique 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B = 'http://localhost:8765/site-politique-/';
let res = 0, bad = 0; const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, ok ? '' : JSON.stringify(i === undefined ? '' : i).slice(0, 400)); };
(async () => {
  const b = await chromium.launch(); let MODE = null;
  const c = await b.newContext(); await c.route(/fonts\./, r => r.abort());
  await c.route('**/rest/v1/**', r => { const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json', 'access-control-expose-headers': 'content-range', 'content-range': '0-0/0' };
    const t = new URL(r.request().url()).pathname.split('/').pop();
    if (t === 'election_round_results' && MODE) return r.fulfill({ status: 404, headers: h, body: JSON.stringify({ code: MODE[0], message: MODE[1] }) });
    r.fulfill({ status: 200, headers: h, body: '[]' }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + 'election.html?e=1', { waitUntil: 'networkidle' });
  const call = async m => { MODE = m; return p.evaluate(async () => { try { const x = await DB.results('1'); return { ok: true, absent: !!x.absent, n: x.rounds.length }; } catch (e) { return { ok: false, kind: DB.classify(e), code: e.code }; } }); };
  let r = await call(['42P01', 'relation "public.election_round_results" does not exist']); rep(r.ok && r.absent && r.n === 0, 'DB.results : 42P01 nommant election_round_results = absence avérée (mode de compatibilité)', r);
  r = await call(['42P01', 'relation "public.election_candidate_results" does not exist']); rep(!r.ok, 'DB.results : 42P01 sur UNE AUTRE table (election_candidate_results) : erreur propagée', r);
  r = await call(['42P01', 'relation "public.sources" does not exist']); rep(!r.ok, 'DB.results : 42P01 sur la table sources : erreur propagée', r);
  r = await call(['42P01', 'relation does not exist']); rep(!r.ok, 'DB.results : 42P01 sans nom de table : erreur propagée (absence non avérée)', r);
  r = await call(['42501', 'permission denied for table election_round_results']); rep(!r.ok && r.kind === 'denied', 'DB.results : permission refusée : erreur propagée', r);
  r = await call(['PGRST205', "Could not find the table 'public.election_round_results' in the schema cache"]); rep(r.ok && r.absent && r.n === 0, 'DB.results : PGRST205 sur election_round_results : rubrique inactive, sans message', r);
  // regroupement des sondages
  const g = await p.evaluate(() => {
    const row = (id, round, v, extra) => Object.assign({ id, candidacy_id: 'c' + id, entity_kind: 'candidacy', value_percent: v, pollster: 'Inst', scenario: 'S', poll_date: '2027-03-01', fieldwork_start: '2027-02-27', source_id: 's1', round }, extra || {});
    const summ = rows => Scrutin.pollGroups(rows).map(x => ({ n: x.rows.length, round: x.round, label: Scrutin.roundLabel(x.round) }));
    const est = (rows, round) => { const gs = Scrutin.pollGroups(rows); return Scrutin.estimate(gs, { id: 'ca', people: null }, round); };
    return {
      coherent: summ([row('a', 1, 30), row('b', 1, 25)]),
      contradictory: summ([row('a', 1, 30), row('b', 2, 25)]),
      partial: summ([row('a', 1, 30), row('b', null, 25)]),
      allNull: summ([row('a', null, 30), row('b', null, 25)]),
      two: summ([row('a', 1, 30), row('b', 1, 25), row('a', 1, 31, { scenario: 'S2' }), row('b', 1, 24, { scenario: 'S2' })]),
      estContra1: est([row('a', 1, 30), row('b', 2, 25)], 1), estContra2: est([row('a', 1, 30), row('b', 2, 25)], 2), estOk: !!est([row('a', 1, 30), row('b', 1, 25)], 1) };
  });
  rep(g.coherent.length === 1 && g.coherent[0].n === 2 && g.coherent[0].round === 1, 'sondage cohérent (tour 1 partout) : un groupe, tour 1', g.coherent);
  rep(g.contradictory.length === 1 && g.contradictory[0].n === 2 && g.contradictory[0].round === 0 && g.contradictory[0].label === 'Tour non précisé', 'lignes d\'un même sondage de tours contradictoires (1 et 2) : UN groupe, tour indéterminé, historique conservé « Tour non précisé »', g.contradictory);
  rep(g.partial.length === 1 && g.partial[0].round === 0, 'tour renseigné sur une partie des lignes seulement : un groupe, tour indéterminé', g.partial);
  rep(g.allNull.length === 1 && g.allNull[0].round === 0, 'tour absent partout : un groupe, tour indéterminé', g.allNull);
  rep(g.two.length === 2 && g.two.every(x => x.n === 2 && x.round === 1), 'deux scénarios distincts restent deux sondages distincts', g.two);
  rep(g.estContra1 === null && g.estContra2 === null && g.estOk, 'tours contradictoires : aucune estimation (ni tour 1 ni tour 2) ; sondage cohérent : estimation produite', { c1: g.estContra1, c2: g.estContra2, ok: g.estOk });
  rep(!errs.length, 'aucune erreur JS', errs);
  await b.close(); console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
