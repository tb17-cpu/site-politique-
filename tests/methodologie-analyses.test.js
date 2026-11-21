/* La « méthodologie » d'une analyse est une métadonnée interne : jamais affichée, toujours chargée (donc conservée en base).
   La page générale methodologie.html (et son lien de pied de page / navigation) est distincte et reste intacte.
   Playwright, Supabase simulé, données entièrement fictives. Serveur statique 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const D = require('./fixtures/donnees-factices.js');
const B = 'http://localhost:8765/site-politique-/';
let res = 0, bad = 0; const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, ok ? '' : JSON.stringify(i || '')); };
const MARK = 'CRITERES-INTERNES-ZX81';
const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if ('assessment' in o && 'analysis_title' in o) o.methodology = MARK; Object.values(o).forEach(walk); } return o; };
(async () => {
  const br = await chromium.launch();
  for (const [w, th] of [[1280, 'light'], [400, 'dark']]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(v => { try { localStorage.setItem('ar.theme', v); } catch (e) {} }, th);
    const pg = await ctx.newPage(), errs = [], loaded = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/rest/v1/**', r => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' } });
      const u = new URL(r.request().url()), t = u.pathname.split('/').pop(), data = walk(JSON.parse(JSON.stringify(D.route(t, u))));
      if (JSON.stringify(data).includes(MARK)) loaded.push(t);
      r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(data.length - 1, 0)}/${data.length}`, 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
    });
    await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await pg.goto(B + 'mesure.html#2', { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
    const t = await pg.evaluate(() => document.body.innerText), main = await pg.locator('#f-body').innerText();
    rep(await pg.locator('.blk--an').count() >= 1 && /Évaluation générale/.test(main), `${th} ${w}px : l'analyse reste affichée (évaluation, etc.)`);
    rep(!main.includes(MARK) && !/Méthodologie/i.test(main), `${th} ${w}px : aucune rubrique « Méthodologie » dans l'analyse`, main.slice(0, 200));
    rep(loaded.includes('measures'), `${th} ${w}px : la donnée est toujours chargée depuis la base (conservée, non supprimée)`, loaded);
    const link = pg.locator('a[href="methodologie.html"]');
    rep(await link.count() >= 1, `${th} ${w}px : le lien vers la méthodologie générale du site reste présent`);
    await pg.goto(B + 'methodologie.html', { waitUntil: 'networkidle' }); await pg.waitForTimeout(300);
    const m = await pg.evaluate(() => ({ h: (document.querySelector('h1') || {}).innerText, n: document.body.innerText.length, t: document.title }));
    rep(/Méthodologie/.test(m.h || m.t) && m.n > 500, `${th} ${w}px : la page générale methodologie.html est intacte`, m);
    rep(!errs.length, `${th} ${w}px : aucune erreur JS`, errs);
    await ctx.close();
  }
  await br.close(); console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
