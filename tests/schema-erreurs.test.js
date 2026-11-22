/* Repli de DB.elections (relation election_sources) et chargement des statuts éditoriaux (DB.formalizations) : seules les erreurs réellement
   compatibles avec l'indisponibilité de la relation ou des colonnes sont absorbées ; toutes les autres sont propagées ou signalées.
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES (tests/fixtures/donnees-factices.js). Serveur statique 8765 sous /site-politique-/. */
const D = require('./fixtures/donnees-factices.js');
const { chromium } = require('playwright');
const B = 'http://localhost:8765/site-politique-/';
let res = 0, bad = 0;
const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, ok ? '' : JSON.stringify(i === undefined ? '' : i).slice(0, 500)); };
const ES = "Could not find a relationship between 'elections' and 'election_sources' in the schema cache";
const ERR = {
  es200: [400, { code: 'PGRST200', message: ES }],
  es205: [404, { code: 'PGRST205', message: "Could not find the table 'public.election_sources' in the schema cache" }],
  es42: [404, { code: '42P01', message: 'relation "public.election_sources" does not exist' }],
  other200: [400, { code: 'PGRST200', message: "Could not find a relationship between 'elections' and 'countries' in the schema cache" }],
  elections205: [404, { code: 'PGRST205', message: "Could not find the table 'public.elections' in the schema cache" }],
  col: [400, { code: '42703', message: 'column elections.zzz does not exist' }],
  denied: [403, { code: '42501', message: 'permission denied for table election_sources' }],
  nocode400: [400, { message: 'Bad Request' }], nocode404: [404, { message: 'Not Found' }], server: [500, { message: 'boom' }],
  fcol: [400, { code: '42703', message: 'column measures.formalization_status does not exist' }],
  frel: [400, { code: 'PGRST200', message: "Could not find a relationship between 'measures' and 'measure_sources' in the schema cache", details: "Searched for a foreign key relationship between 'measures' and 'measure_sources' using the hint 'measures_formalization_measure_source_fk'" }],
  othercol: [400, { code: '42703', message: 'column measures.zzz does not exist' }], otherrel: [400, { code: 'PGRST200', message: "Could not find a relationship between 'measures' and 'themes' in the schema cache" }],
  cache: [404, { code: 'PGRST205', message: "Could not find the table 'public.measures' in the schema cache" }]
};
let MODE = {}, LOG = [];
const ELS = [{ id: 'e1', name: 'Scrutin fictif', year: 2027, election_type: 'presidential', scheduled_date: '2027-04-10', publication_status: 'published', country_id: 'fr', description: null, countries: { id: 'fr', name: 'France', iso2: 'FR', publication_status: 'published' } }];
const open = async (br, url, mode, { w = 1280, theme = 'light' } = {}) => {
  MODE = mode; LOG = [];
  const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(v => { try { localStorage.setItem('ar.theme', v); } catch (e) {} }, theme);
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { LOG.push(m.type() + ':' + m.text()); });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pg.route('**/rest/v1/**', r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' } });
    const u = new URL(r.request().url()), t = u.pathname.split('/').pop(), sel = u.searchParams.get('select') || '', h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json', 'access-control-expose-headers': 'content-range' };
    let m = null;
    if (t === 'elections') m = sel.includes('election_sources') ? MODE.elSrc : MODE.elBase;
    if (t === 'measures' && sel.startsWith('id,publication_status,formalization_status')) m = MODE.form;
    if (m === 'network') return r.abort('failed');
    if (m && ERR[m]) return r.fulfill({ status: ERR[m][0], headers: h, body: JSON.stringify(ERR[m][1]) });
    const data = D.route(t, u);
    r.fulfill({ status: 200, headers: Object.assign(h, { 'content-range': `0-${Math.max(data.length - 1, 0)}/${data.length}` }), body: JSON.stringify(data) });
  });
  await pg.goto(B + url, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
  return { ctx, pg, errs };
};
const kind = async (pg, call) => pg.evaluate(async c => { try { const r = await eval(c); return { ok: true, r }; } catch (e) { return { ok: false, kind: DB.classify(e), code: e.code || '' }; } }, call);
(async () => {
  const br = await chromium.launch();
  // ---- DB.elections : repli UNIQUEMENT si election_sources est en cause
  for (const m of ['es200', 'es205', 'es42']) {
    const { ctx, pg } = await open(br, 'index.html', { elSrc: m });
    const r = await kind(pg, "DB.elections().then(l => ({ n: l.length, src: l.some(x => x.election_sources) }))");
    rep(r.ok && r.r.n >= 1 && LOG.some(l => /^warning:.*election_sources indisponible/.test(l)), `DB.elections (${m}) : repli sans election_sources, tracé en console`, [r, LOG.slice(-3)]);
    await ctx.close();
  }
  for (const m of ['other200', 'elections205', 'col', 'denied', 'nocode400', 'nocode404', 'server', 'network']) {
    const { ctx, pg } = await open(br, 'index.html', { elSrc: m });
    const r = await kind(pg, "DB.elections()");
    rep(!r.ok, `DB.elections (${m}) : erreur NON absorbée, propagée (aucun repli)`, r);
    await ctx.close();
  }
  { const { ctx, pg } = await open(br, 'index.html', { elSrc: 'es200', elBase: 'denied' });
    const r = await kind(pg, "DB.elections()"); rep(!r.ok && r.kind === 'denied', 'DB.elections : repli accepté mais requête simplifiée en erreur : erreur propagée', r); await ctx.close(); }
  { const { ctx, pg, errs } = await open(br, 'election.html?e=1', { elSrc: 'denied' });
    const t = await pg.evaluate(() => document.body.innerText);
    rep(/Impossible d.afficher|refusé/i.test(t) && !errs.length, 'page d\'élection : une erreur de permission sur election_sources n\'est plus masquée (message d\'erreur affiché)', t.slice(0, 200)); await ctx.close(); }

  // ---- DB.formalizations
  { const { ctx, pg } = await open(br, 'index.html', {});
    const r = await kind(pg, "DB.formalizations().then(m => ({ n: m.size, abs: !!m.absent, err: m.error || null }))");
    rep(r.ok && r.r.n > 0 && !r.r.abs && !r.r.err, 'DB.formalizations : chargement normal (statuts présents, ni absent ni erreur)', r); await ctx.close(); }
  for (const m of ['fcol', 'frel']) {
    const { ctx, pg } = await open(br, 'index.html', { form: m });
    const r = await kind(pg, "DB.formalizations().then(m => ({ n: m.size, abs: !!m.absent, err: m.error || null }))");
    rep(r.ok && r.r.n === 0 && r.r.abs && !r.r.err, `DB.formalizations (${m}) : colonnes ou clé formalization_* PROUVÉES absentes : fonctionnalité inactive (absent), sans erreur`, r); await ctx.close();
  }
  for (const [m, exp] of [['othercol', 'invalid'], ['otherrel', 'error'], ['nocode400', 'invalid'], ['nocode404', 'missing'], ['denied', 'denied'], ['server', 'server'], ['cache', 'schema-cache'], ['network', 'network']]) {
    const { ctx, pg } = await open(br, 'index.html', { form: m });
    const r = await kind(pg, "DB.formalizations().then(m => ({ n: m.size, abs: !!m.absent, err: m.error || null }))");
    const want = exp === 'error' ? 'invalid' : exp;
    rep(r.ok && r.r.n === 0 && !r.r.abs && r.r.err === want, `DB.formalizations (${m}) : erreur technique signalée (error = ${want}), JAMAIS « fonctionnalité absente »`, r); await ctx.close();
  }
  { const { ctx, pg } = await open(br, 'index.html', { form: 'denied' });
    const a = await kind(pg, "DB.formalizations().then(m => m.error || null)");
    MODE.form = null;
    const b = await kind(pg, "DB.formalizations().then(m => ({ n: m.size, err: m.error || null }))");
    rep(a.ok && a.r === 'denied' && b.ok && b.r.n > 0 && !b.r.err, 'DB.formalizations : une erreur n\'est pas mise en cache (le rechargement suivant retrouve les statuts)', [a, b]); await ctx.close(); }

  // ---- pages : message discret, jamais de désactivation silencieuse ; absence prouvée : aucun message
  for (const [w, th] of [[1280, 'light'], [400, 'dark']]) {
    const T = `${th} ${w}px`;
    const notes = pg => pg.evaluate(() => [...document.querySelectorAll('[data-load-error]')].map(x => x.getAttribute('data-load-error') + '|' + x.innerText));
    for (const [url, n] of [['mesure.html?e=1#2', 'fiche mesure'], ['candidat.html?e=1#1', 'fiche candidat'], ['thematiques.html?e=1#retraites', 'thématiques'], ['comparateur.html?e=1#retraites', 'comparateur']]) {
      for (const m of ['denied', 'nocode400', 'server', 'network']) {
        const { ctx, pg, errs } = await open(br, url, { form: m }, { w, theme: th });
        if (url.startsWith('comparateur')) { await pg.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].slice(0, 4).forEach(x => x.click())); await pg.waitForTimeout(700); }
        const nt = await notes(pg), fs = await pg.locator('.fs').count();
        rep(nt.length === 1 && /^statuses:/.test(nt[0]) && /statuts éditoriaux/.test(nt[0]) && fs === 0 && !errs.length, `${T} ${n}, statuts en erreur (${m}) : message discret, aucun badge, aucune erreur JS`, { nt, fs, errs });
        await ctx.close();
      }
      for (const m of ['fcol', 'frel', null]) {
        const { ctx, pg, errs } = await open(br, url, { form: m }, { w, theme: th });
        if (url.startsWith('comparateur')) { await pg.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].slice(0, 4).forEach(x => x.click())); await pg.waitForTimeout(700); }
        const nt = await notes(pg);
        rep(!nt.length && !errs.length, `${T} ${n}, ${m ? 'schéma ancien (' + m + ')' : 'chargement normal'} : aucun message d'erreur`, { nt, errs });
        await ctx.close();
      }
    }
  }
  await br.close();
  console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
