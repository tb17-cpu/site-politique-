/* Refonte visuelle (variante A) : cartes de mesures, groupes par thème, en-tête candidat, nettoyage éditorial des fiches, mobile, contrastes, focus.
   Playwright, Supabase simulé, données entièrement fictives (tests/fixtures/donnees-factices.js). Serveur statique 8765 sous /site-politique-/. */
const D = require('./fixtures/donnees-factices.js');
const { chromium } = require('playwright');
const B = 'http://localhost:8765/site-politique-/';
let res = 0, bad = 0;
const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, ok ? '' : JSON.stringify(i === undefined ? '' : i).slice(0, 500)); };
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const x = lum(rgb(a)) + .05, y = lum(rgb(b)) + .05; return Math.max(x, y) / Math.min(x, y); };

const route = (t, u) => D.route(t, u);
const open = async (br, url, { w = 1280, h = 900, theme = 'light', mob = false } = {}) => {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob });
  await ctx.addInitScript(v => { try { localStorage.setItem('ar.theme', v); } catch (e) {} }, theme);
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/rest/v1/**', r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' } });
    const u = new URL(r.request().url()), t = u.pathname.split('/').pop(), data = route(t, u);
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(data.length - 1, 0)}/${data.length}`, 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
  });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pg.goto(B + url, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
  return { ctx, pg, errs };
};

(async () => {
  const br = await chromium.launch();

  /* ---------- Fiche candidat, ordinateur ---------- */
  for (const th of ['light', 'dark']) {
    const { ctx, pg, errs } = await open(br, 'candidat.html?e=1#1', { theme: th });
    const r = await pg.evaluate(() => {
      const cs = el => getComputedStyle(el), cards = [...document.querySelectorAll('.mlist a.mcard')];
      const cols = new Set(cards.map(c => Math.round(c.getBoundingClientRect().left))).size;
      const gh = [...document.querySelectorAll('.m-group:not(.m-group--autres) > h4')], au = document.querySelector('.m-group--autres > h4');
      const h1 = document.querySelectorAll('h1:not([hidden])'), vis = [...document.querySelectorAll('h1')].filter(h => h.offsetParent);
      return {
        n: cards.length, cols, minH: Math.min(...cards.map(c => c.getBoundingClientRect().height)), arrow: getComputedStyle(cards[0], '::after').content,
        border3: gh.every(h => cs(h).borderTopWidth === '3px'), counters: gh.every(h => h.querySelector('small')), autresBorder: au ? cs(au).borderTopWidth : null,
        autresSize: au ? parseFloat(cs(au).fontSize) : null, gSize: gh[0] ? parseFloat(cs(gh[0]).fontSize) : null,
        titles: cards.map(c => c.querySelector('b').textContent), allHaveB: cards.every(c => c.querySelector('b')),
        h1: vis.length, head: !!document.querySelector('.cand-head .cand-id h1') && !!document.querySelector('.cand-head .prog-panel'),
        sponsorTiles: document.querySelectorAll('.sp').length, dashTile: [...document.querySelectorAll('.sp strong')].some(s => s.textContent.trim() === '—'),
        legendOpen: (document.querySelector('details.m-help') || {}).open, legendExists: !!document.querySelector('details.m-help'),
        txt: document.body.innerText, ov: document.documentElement.scrollWidth - innerWidth
      };
    });
    const nMeasures = D.measures.filter(m => m.program_versions && String(m.program_versions.programs.candidacies.id) === '1').length;
    rep(r.n === nMeasures && new Set(r.titles).size === r.n, `${th} desktop : ${nMeasures} mesures, une carte chacune, aucune perte ni répétition`, [r.n, nMeasures]);
    rep(r.cols === 2, `${th} desktop : cartes sur deux colonnes`, r.cols);
    rep(r.minH >= 80 && r.arrow.includes('→'), `${th} desktop : hauteur raisonnable et flèche d’ouverture`, [r.minH, r.arrow]);
    rep(r.border3 && r.counters, `${th} desktop : thèmes avec filet de 3 px et compteur`);
    rep(r.autresBorder === '1px' && r.autresSize < r.gSize, `${th} desktop : « Autres propositions » plus discret`, [r.autresBorder, r.autresSize, r.gSize]);
    rep(r.head && r.h1 === 1, `${th} desktop : en-tête horizontal (identité + panneau programme), un seul h1 visible`, [r.head, r.h1]);
    rep(!r.dashTile, `${th} desktop : aucune tuile « — » de parrainage`);
    rep(r.legendExists && !r.legendOpen, `${th} desktop : légende des statuts repliée`);
    rep(!/Non documenté/.test(r.txt), `${th} desktop : aucun « Non documenté »`);
    rep(r.ov <= 0 && !errs.length, `${th} desktop : pas de débordement, aucune erreur JS`, [r.ov, errs]);
    /* Carte entièrement cliquable : un clic au bord de la carte ouvre la fiche. */
    if (th === 'light') {
      await pg.locator('.mlist a.mcard').first().scrollIntoViewIfNeeded(); const box = await pg.locator('.mlist a.mcard').first().boundingBox();
      await pg.mouse.click(box.x + box.width - 6, box.y + box.height - 6); await pg.waitForURL(/mesure\.html/, { timeout: 5000 }).catch(() => {});
      rep(/mesure\.html/.test(pg.url()), 'carte : un clic dans le coin ouvre la fiche de la mesure', pg.url());
    }
    await ctx.close();
  }

  /* ---------- Raccourcis de thème : défilement sans changer l'identifiant de la candidature ---------- */
  {
    const { ctx, pg } = await open(br, 'candidat.html?e=1#1');
    const before = await pg.evaluate(() => location.hash);
    await pg.locator('.m-jump button').nth(1).click(); await pg.waitForTimeout(700);
    const r = await pg.evaluate(() => ({ hash: location.hash, y: scrollY, name: document.querySelector('.cand-id h1').textContent }));
    rep(r.hash === before && r.y > 300 && /Fictif/.test(r.name), 'raccourci de thème : défile, la fiche reste celle du candidat', r);
    await pg.keyboard.press('Tab');
    await ctx.close();
  }

  /* ---------- Focus clavier visible sur une carte ---------- */
  {
    const { ctx, pg } = await open(br, 'candidat.html?e=1#1');
    await pg.locator('.mlist a.mcard').first().focus();
    const o = await pg.evaluate(() => { const s = getComputedStyle(document.querySelector('.mlist a.mcard:focus-visible') || document.activeElement); return { w: s.outlineWidth, st: s.outlineStyle }; });
    rep(o.st !== 'none' && parseFloat(o.w) >= 2, 'focus clavier : anneau visible sur une carte', o);
    await ctx.close();
  }

  /* ---------- Parrainages vides : section absente ---------- */
  {
    const { ctx, pg } = await open(br, 'candidat.html?e=1#2');
    const r = await pg.evaluate(() => ({ spons: [...document.querySelectorAll('.blk > header b')].map(b => b.textContent), tiles: [...document.querySelectorAll('.sp strong')].map(s => s.textContent.trim()) }));
    rep(r.tiles.every(t => t !== '—'), 'parrainages partiels : aucune tuile « — »', r.tiles);
    await ctx.close();
  }

  /* ---------- Fiche mesure : nettoyage éditorial ---------- */
  for (const [id, label] of [[2, 'avec analyse'], [11, 'sans analyse']]) {
    const { ctx, pg, errs } = await open(br, `mesure.html?e=1#${id}`);
    const t = await pg.evaluate(() => document.body.innerText);
    const h = await pg.evaluate(() => [...document.querySelectorAll('.blk > header b')].map(b => b.textContent));
    rep(h.includes('Déclaré par le candidat') && h.includes('Description'), `mesure ${label} : titres « Déclaré par le candidat » et « Description »`, h);
    rep(!/Formulation et éléments annoncés|Reformulation et mise en forme|Description structurée|Non documenté|Type de mesure|relue le|Les analyses ci-dessous|Fiabilité|version\s+\d|Cela ne signifie pas/i.test(t), `mesure ${label} : textes et métadonnées supprimés absents`, (t.match(/Formulation et éléments annoncés|Reformulation et mise en forme|Description structurée|Non documenté|Type de mesure|relue le|Les analyses ci-dessous|Fiabilité|version\s+\d/i) || [])[0]);
    if (id === 2) {
      rep(h.some(x => /^Analyse · .+ · publiée le /.test(x)) || h.some(x => /^Analyse( · .+)?$/.test(x)), 'mesure : titre d’analyse « Analyse · Thème · publiée le … » (date si connue)', h);
      const d = await pg.evaluate(() => { const f = document.querySelector('details.m-fold'); return f ? { open: f.open, sum: f.querySelector('summary').textContent } : null; });
      rep(d && !d.open && /Sources de l’analyse/.test(d.sum), 'mesure : sources de l’analyse dans un menu déroulant replié', d);
    }
    rep(!errs.length, `mesure ${label} : aucune erreur JS`, errs);
    await ctx.close();
  }

  /* ---------- Mobile ---------- */
  for (const th of ['light', 'dark']) {
    const { ctx, pg, errs } = await open(br, 'candidat.html?e=1#1', { w: 390, h: 844, theme: th, mob: true });
    const r = await pg.evaluate(() => {
      const cards = [...document.querySelectorAll('.mlist a.mcard')], hdr = document.querySelector('.site-header'), bar = document.querySelector('.elec-bar');
      const tabs = [...document.querySelectorAll('.eb-nav a')], ul = document.querySelector('.eb-nav ul');
      const t = document.querySelector('.eb-title b');
      return { cols: new Set(cards.map(c => Math.round(c.getBoundingClientRect().left))).size, minH: Math.min(...cards.map(c => c.getBoundingClientRect().height)),
        head: hdr.getBoundingClientRect().height + bar.getBoundingClientRect().height, menuOpen: document.getElementById('site-menu').classList.contains('open'),
        menuBtn: !!document.querySelector('.menu-btn') && getComputedStyle(document.querySelector('.menu-btn')).display !== 'none',
        tabsH: Math.min(...tabs.map(a => a.getBoundingClientRect().height)), scrollable: ul.scrollWidth > ul.clientWidth, titleOneLine: t.getBoundingClientRect().height < 30,
        ov: document.documentElement.scrollWidth - innerWidth, sel: document.getElementById('elec-select').offsetParent !== null };
    });
    rep(r.cols === 1 && r.minH >= 44, `${th} mobile : une colonne, cartes ≥ 44 px`, [r.cols, r.minH]);
    rep(r.head <= 190 && r.menuBtn && !r.menuOpen, `${th} mobile : bandeau + barre d’élection ≤ 190 px (menu replié)`, r.head);
    rep(r.titleOneLine && r.tabsH >= 40 && r.scrollable, `${th} mobile : titre d’élection sur une ligne, onglets défilants ≥ 40 px`, [r.titleOneLine, r.tabsH, r.scrollable]);
    rep(r.ov <= 0 && !errs.length, `${th} mobile : pas de débordement, aucune erreur JS`, [r.ov, errs]);
    if (th === 'light') {
      await pg.locator('.menu-btn').click();
      const o = await pg.evaluate(() => ({ open: document.getElementById('site-menu').classList.contains('open'), exp: document.querySelector('.menu-btn').getAttribute('aria-expanded'), sel: document.getElementById('elec-select').offsetParent !== null }));
      rep(o.open && o.exp === 'true' && o.sel, 'mobile : le menu ouvre la navigation et le choix de l’élection', o);
      await pg.keyboard.press('Escape');
      rep(!(await pg.evaluate(() => document.getElementById('site-menu').classList.contains('open'))), 'mobile : Échap referme le menu');
    }
    await ctx.close();
  }

  /* ---------- Contrastes (jetons) : clair et sombre ---------- */
  for (const th of ['light', 'dark']) {
    const { ctx, pg } = await open(br, 'candidat.html?e=1#1', { theme: th });
    const c = await pg.evaluate(() => { const s = getComputedStyle(document.documentElement), g = n => s.getPropertyValue(n).trim(), probe = document.createElement('i'); document.body.appendChild(probe);
      const col = n => { probe.style.color = g(n); return getComputedStyle(probe).color; };
      return { bg: col('--bg'), surface: col('--surface'), line: col('--line'), rule: col('--rule'), muted: col('--muted'), fg: col('--fg'), hex: g('--bg') }; });
    rep(ratio(c.muted, c.bg) >= 4.5 && ratio(c.muted, c.surface) >= 4.5, `${th} : texte secondaire ≥ 4,5:1 sur fond et sur carte`, [ratio(c.muted, c.bg).toFixed(2), ratio(c.muted, c.surface).toFixed(2)]);
    rep(ratio(c.line, c.surface) >= (th === 'light' ? 1.5 : 1.3) && ratio(c.rule, c.bg) >= 2, `${th} : contour de carte et filet de groupe plus visibles`, [ratio(c.line, c.surface).toFixed(2), ratio(c.rule, c.bg).toFixed(2)]);
    if (th === 'light') rep(c.hex.toLowerCase() === '#edf0f6', 'clair : fond #edf0f6', c.hex);
    await ctx.close();
  }

  await br.close();
  console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
