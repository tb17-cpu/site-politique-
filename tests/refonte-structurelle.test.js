/* Refonte structurelle : accueil dense, calendrier en carte latérale, fiche candidat (programme avant informations repliées), rien d'affiché sans résultats.
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES. Serveur statique 8765 sous /site-politique-/. */
const D = require('./fixtures/donnees-factices.js');
const { chromium } = require('playwright');
const B = 'http://localhost:8765/site-politique-/';
let res = 0, bad = 0; const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, ok ? '' : JSON.stringify(i === undefined ? '' : i).slice(0, 500)); };
const photo = (t, u) => { const d = D.route(t, u); const f = p => p && p.id === 1 ? Object.assign({}, p, { photo_url: 'https://example.org/photo-fictive.jpg', photo_credit: 'CRED-FICTIF', photo_source_url: 'https://example.org/p' }) : p;
  return t === 'candidacies' ? JSON.parse(JSON.stringify(d), (k, v) => v).map(c => Object.assign({}, c, { people: f(c.people) })) : d; };
const open = async (br, url, { w, th, route = D.route }) => {
  const ctx = await br.newContext({ viewport: { width: w, height: w < 600 ? 800 : 900 }, isMobile: w < 600, hasTouch: w < 600 });
  await ctx.addInitScript(v => { try { localStorage.setItem('ar.theme', v); } catch (e) {} }, th);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/rest/v1/**', r => { if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' } });
    const u = new URL(r.request().url()), t = u.pathname.split('/').pop(), data = route(t, u);
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(data.length - 1, 0)}/${data.length}`, 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) }); });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pg.goto(B + url, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
  return { ctx, pg, errs };
};
(async () => {
  const br = await chromium.launch();
  for (const th of ['light', 'dark']) for (const w of [1280, 400]) {
    const T = `${th}/${w}`;
    // ---- accueil
    let { ctx, pg, errs } = await open(br, 'index.html', { w, th });
    const h = await pg.evaluate(() => { const d = document.querySelector('.h-door'), r = d && d.getBoundingClientRect(), vh = innerHeight;
      return { door: !!d, tag: d && d.tagName, href: d && d.getAttribute('href'), bottom: r && Math.round(r.bottom), vh, text: d && d.innerText, ow: document.documentElement.scrollWidth - innerWidth,
        chips: [...document.querySelectorAll('#h-chips a')].map(a => a.textContent.trim() + '>' + a.getAttribute('href')), metOpen: document.querySelector('#methode-fold').open, resOpen: document.querySelector('#ressources').open,
        themeH: (document.querySelector('.h-theme') || {}).offsetHeight, longP: !!document.querySelector('.h-door p'), status: !!document.querySelector('.h-badge'), h1: document.querySelector('h1').getBoundingClientRect().height }; });
    rep(h.door && h.tag === 'A' && /election\.html\?e=1/.test(h.href), `${T} accueil : carte d'élection = lien entier`, h);
    rep(h.bottom <= h.vh, `${T} accueil : carte d'élection visible dès le premier écran`, { b: h.bottom, vh: h.vh });
    rep(/présidentielle/i.test(h.text) && /2027/.test(h.text) && h.status && !h.longP, `${T} accueil : nom, date, statut, sans description`, h.text);
    rep(/candidature/.test(h.text), `${T} accueil : nombre de candidatures`, h.text);
    rep(h.chips.length === 4 && h.chips.every(c => /\?e=1/.test(c)), `${T} accueil : 4 accès directs portent l'élection`, h.chips);
    rep(!h.metOpen && !h.resOpen, `${T} accueil : méthode et ressources repliées`);
    rep(h.themeH <= 80, `${T} accueil : cartes de thématique basses`, h.themeH);
    rep(h.ow <= 0, `${T} accueil : pas de débordement horizontal`, h.ow);
    await pg.fill('#h-q', 'retraite'); await pg.waitForTimeout(600);
    const s = await pg.evaluate(() => ({ vis: !document.getElementById('h-results').hidden, n: document.querySelectorAll('#h-results a').length }));
    rep(s.vis && s.n > 0, `${T} accueil : recherche fonctionnelle`, s);
    rep(!errs.length, `${T} accueil : aucune erreur JS`, errs); await ctx.close();
    // ---- élection
    ({ ctx, pg, errs } = await open(br, 'election.html?e=1', { w, th }));
    const e = await pg.evaluate(() => { const c = document.querySelector('.cal'), g = document.querySelector('.p-grid--rubriques'), cr = c && c.getBoundingClientRect(), gr = g && g.getBoundingClientRect();
      return { cal: !!c, cl: cr && Math.round(cr.left), ct: cr && Math.round(cr.top), cb: cr && Math.round(cr.bottom), gl: gr && Math.round(gr.left), gr: gr && Math.round(gr.right), gt: gr && Math.round(gr.top), gb: gr && Math.round(gr.bottom), vh: innerHeight,
        ow: document.documentElement.scrollWidth - innerWidth, txt: c && c.innerText, res: !!document.querySelector('.res'), body: document.getElementById('e-main').innerText, cells: document.querySelectorAll('.p-cell').length }; });
    rep(e.cal && /Date du scrutin/i.test(e.txt) && /Second tour/i.test(e.txt), `${T} élection : carte calendrier groupée`, e.txt);
    if (w > 900) rep(e.cl >= e.gr && Math.abs(e.ct - e.gt) < 40, `${T} élection : calendrier à droite, même niveau que les rubriques`, e);
    else { rep(e.cb <= e.vh && e.ct < e.gt || e.gb <= e.vh, `${T} élection : calendrier et rubriques accessibles sans long défilement`, e); rep(e.cb - e.ct < 260, `${T} élection : calendrier compact (hauteur)`, e.cb - e.ct); }
    rep(!e.res && !/n’ont pas pu|impossible|erreur/i.test(e.body), `${T} élection : aucun bloc ni message quand il n'y a pas de résultats`, e.body.slice(0, 200));
    rep(e.ow <= 0, `${T} élection : pas de débordement horizontal`, e.ow);
    rep(!errs.length, `${T} élection : aucune erreur JS`, errs); await ctx.close();
    // ---- candidat
    ({ ctx, pg, errs } = await open(br, 'candidat.html?e=1#1', { w, th, route: photo }));
    const c = await pg.evaluate(() => { const p = document.getElementById('programme'), i = document.querySelector('details.cand-info'); const pos = x => x && x.getBoundingClientRect().top + scrollY;
      return { prog: !!p, info: !!i, open: i && i.open, order: p && i && pos(p) < pos(i), sum: i && i.querySelector('summary').textContent.trim(), bio: i && i.innerText, txt: document.body.innerText, dot: !!document.querySelector('.credit-dot'), ow: document.documentElement.scrollWidth - innerWidth, progTop: pos(p), vh: innerHeight }; });
    rep(c.prog && c.info && c.order, `${T} candidat : programme avant les informations`, c);
    rep(c.sum === 'Informations sur le candidat' && c.open === false, `${T} candidat : section repliable fermée par défaut`, c.sum);
    rep(!/Source de la photo|Photo : CRED/.test(c.txt) && c.dot, `${T} candidat : crédit photo non affiché explicitement (pastille discrète)`, c.dot);
    const lk = await pg.evaluate(() => { const a = document.querySelector('.cand-info-link'); return a && { t: a.textContent, h: a.getAttribute('href'), top: a.getBoundingClientRect().top, vh: innerHeight }; });
    rep(lk && /Informations sur le candidat/.test(lk.t) && lk.h === '#cand-info' && lk.top < lk.vh, `${T} candidat : lien d'accès rapide près de l'en-tête`, lk);
    await pg.click('.cand-info-link'); await pg.waitForTimeout(900);
    const sc = await pg.evaluate(() => { const d = document.querySelector('details.cand-info'), r = d.getBoundingClientRect(); return { open: d.open, inView: r.top >= 0 && r.top < innerHeight * 0.6 }; });
    rep(sc.inView && sc.open === false, `${T} candidat : le lien descend à la section, qui reste fermée`, sc);
    await pg.click('details.cand-info > summary');
    rep(await pg.evaluate(() => document.querySelector('details.cand-info').open && document.querySelector('.cand-info-body').offsetHeight > 0), `${T} candidat : s'ouvre au clic`);
    await pg.focus('details.cand-info > summary'); await pg.keyboard.press('Enter');
    rep(await pg.evaluate(() => !document.querySelector('details.cand-info').open), `${T} candidat : clavier (Entrée) referme`);
    rep(c.ow <= 0, `${T} candidat : pas de débordement horizontal`, c.ow);
    rep(!errs.length, `${T} candidat : aucune erreur JS`, errs); await ctx.close();
  }
  await br.close(); console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
