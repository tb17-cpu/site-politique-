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

let route = (t, u) => D.route(t, u);
/* Variantes de données : programmes multiples et versions successives ; analyses avec ou sans date de publication. */
const withPrograms = base => (t, u) => { const d = base(t, u); if (t !== 'candidacies') return d;
  const M = D.measures, ver = (id, n, label, date, ms) => ({ id, version_number: n, version_label: label, publication_date: date, publication_status: 'published', measures: ms });
  return d.map(c => String(c.id) !== '1' || !c.programs ? c : Object.assign({}, c, { programs: [
    { id: 'pA', title: 'Programme A', description: null, publication_status: 'published', program_versions: [ver('v1', 1, 'Version initiale', '2026-09-01', M.slice(3, 5)), ver('v2', 2, 'Version mise à jour', '2026-11-14', M.slice(0, 3))] },
    { id: 'pB', title: 'Programme B', description: null, publication_status: 'published', program_versions: [ver('v3', 1, 'v1', '2026-10-10', M.slice(5, 7))] }] })); };
const withAnalysis = (extra, base) => (t, u) => { const d = base(t, u); if (t !== 'measures' || (u.searchParams.get('select') || '').startsWith('id,publication_status,formalization_status')) return d;
  return d.map(m => Object.assign({}, m, { analyses: [Object.assign({ id: 1, publication_status: 'published', analysis_type: 'editorial', analysis_title: 'Titre', assessment: 'Évaluation', reliability_level: 'high', reliability_notes: 'NOTE-INTERNE-FIABILITE', analysis_sources: [] }, extra)] })); };
const fixed = D.route;
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
    rep(h.includes('Déclaré par le candidat') && !h.includes('Description') && !h.includes('Thématiques'), `mesure ${label} : « Déclaré par le candidat » conservé, rubriques Description et Thématiques supprimées`, h);
    rep(!/Formulation et éléments annoncés|Reformulation et mise en forme|Description structurée|Non documenté|Type de mesure|relue le|Les analyses ci-dessous|Fiabilité|version\s+\d|Cela ne signifie pas/i.test(t), `mesure ${label} : textes et métadonnées supprimés absents`, (t.match(/Formulation et éléments annoncés|Reformulation et mise en forme|Description structurée|Non documenté|Type de mesure|relue le|Les analyses ci-dessous|Fiabilité|version\s+\d/i) || [])[0]);
    if (id === 2) {
      rep(h.some(x => /^Analyse · .+ · publiée le /.test(x)) || h.some(x => /^Analyse( · .+)?$/.test(x)), 'mesure : titre d’analyse « Analyse · Thème · publiée le … » (date si connue)', h);
      const d = await pg.evaluate(() => { const f = [...document.querySelectorAll('details.m-fold')].find(x => /Sources de l’analyse/.test(x.querySelector('summary').textContent)); return f ? { open: f.open, sum: f.querySelector('summary').textContent } : null; });
      rep(d && !d.open && /Sources de l’analyse/.test(d.sum), 'mesure : sources de l’analyse dans un menu déroulant replié', d);
    }
    rep(!errs.length, `mesure ${label} : aucune erreur JS`, errs);
    await ctx.close();
  }

  /* ---------- Simplification : carte de statut, textes et rubriques supprimés ---------- */
  {
    const { ctx, pg, errs } = await open(br, 'candidat.html?e=1#1');
    const r = await pg.evaluate(() => ({ cards: document.querySelectorAll('.status-card').length, t: document.body.innerText, desc: document.querySelectorAll('.blk .desc').length, badge: document.querySelectorAll('.cand-id .statut').length,
      st: UI.candidacyStage({ candidacy_status: 'declared', announcement_date: '2026-11-06' }), q: UI.candidacyStage({ candidacy_status: 'declared', second_round_status: 'qualified', second_round_qualified_at: '2027-04-10' }),
      none: UI.candidacyStage({}), all: ['validated', 'first_round', 'elected', 'eliminated', 'dropped_out', 'withdrawn', 'invalidated'].map(k => UI.candidacyStage({ candidacy_status: k }).label), unknown: UI.candidacyStage({ candidacy_status: 'zzz' }).label }));
    rep(r.cards === 1 && r.badge === 0, 'fiche candidat : une seule carte de statut de candidature', [r.cards, r.badge]);
    rep(!/Parrainages|Dernière vérification|Situation non documentée/.test(r.t), 'fiche candidat : plus de rubrique Parrainages');
    rep(r.desc === 0, 'fiche candidat : plus de paragraphe de présentation de la sélection', r.desc);
    rep(r.st.label === 'Candidature déclarée' && /annoncée le 6 novembre 2026/.test(r.st.note) && r.q.label === 'Qualifié pour le second tour' && r.none === null, 'statut : déclarée avec date, qualification au second tour prioritaire, rien sans statut', [r.st, r.q, r.none]);
    rep(r.all.join('|') === 'Candidature officiellement validée|Premier tour|Élu|Battu / éliminé|Désisté|Retiré|Candidature invalidée' && r.unknown === 'Statut à préciser', 'statuts de candidature : toutes les étapes ont un libellé, valeur inconnue sans erreur', r.all);
    rep(!errs.length, 'fiche candidat : aucune erreur JS', errs);
    await ctx.close();
    const m = await open(br, 'mesure.html?e=1#2'); const t = await m.pg.evaluate(() => ({ t: document.getElementById('f-body').innerText, bq: document.querySelectorAll('#f-body blockquote').length, fd: document.querySelectorAll('.fs-detail').length }));
    rep(!/Mécanisme|Publics concernés|Modalités d’application|Reformulation|Thématiques|Référence du/.test(t.t) && t.bq === 0 && t.fd === 0, 'fiche mesure : rubriques descriptives, paragraphe de formalisation et mise en forme de citation supprimés');
    await m.ctx.close();
    const c = await open(br, 'comparateur.html?e=1#retraites'); const ct = await c.pg.evaluate(() => document.body.innerText);
    rep(!/Mécanisme \(|Publics concernés \(|Modalités \(/.test(ct), 'comparateur : lignes descriptives supprimées'); await c.ctx.close();
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

  /* ---------- Programmes multiples, versions successives, mesures multi-thèmes ---------- */
  {
    route = withPrograms(fixed);
    const { ctx, pg, errs } = await open(br, 'candidat.html?e=1#1');
    const r = await pg.evaluate(() => ({
      progH3: [...document.querySelectorAll('.blk h3.m-vh')].map(h => h.textContent), vers: [...document.querySelectorAll('h4.m-vh')].map(h => h.textContent),
      titles: [...document.querySelectorAll('.mlist a.mcard b')].map(b => b.textContent), ids: [...document.querySelectorAll('[id^="mg-"]')].map(x => x.id),
      panel: document.querySelector('.prog-panel') ? document.querySelector('.prog-panel').innerText : '', h2: (document.querySelector('.prog-panel h2') || {}).textContent, fs: document.querySelectorAll('.mcard .fs').length }));
    rep(r.progH3.join('|') === 'Programme A|Programme B' && r.vers.length === 3, 'programmes multiples : titres des deux programmes et trois versions affichées', [r.progH3, r.vers]);
    rep(r.titles.length === 7 && new Set(r.titles).size === 7, 'versions successives : les 7 mesures (3 + 2 + 2) sont toutes présentes, aucune répétition', r.titles.length);
    rep(new Set(r.ids).size === r.ids.length, 'identifiants de groupes uniques sur toute la page', r.ids);
    rep(/2 programmes/.test(r.h2) && /\b5\b/.test(r.panel) && !/\b7\b/.test(r.panel), 'panneau : « 2 programmes », propositions comptées sur la dernière version de chaque programme (3 + 2), sans cumuler les anciennes versions', r.panel);
    rep(r.fs >= 4 && !errs.length, 'statuts affichés sur les cartes, aucune erreur JS', [r.fs, errs]);
    await ctx.close(); route = fixed;
  }

  /* ---------- Analyses : date de publication et notes de fiabilité ---------- */
  for (const [extra, label, re, no] of [[{ reviewed_at: '2026-11-01' }, 'sans date de publication (relecture seule)', /^Analyse · [^·]+$/, /publiée le|relue/], [{ reviewed_at: '2026-11-01', published_at: '2026-11-14T10:00:00Z' }, 'avec published_at', /^Analyse · .+ · publiée le 14 novembre 2026$/, /relue/], [{ publication_date: '2026-10-02' }, 'avec publication_date', /publiée le 2 octobre 2026$/, /relue/]]) {
    route = withAnalysis(extra, fixed);
    const { ctx, pg } = await open(br, 'mesure.html?e=1#2');
    const r = await pg.evaluate(() => ({ h: [...document.querySelectorAll('.blk--an > header b')].map(b => b.textContent), t: document.body.innerText, sum: [...document.querySelectorAll('details.m-fold summary')].map(s => s.textContent), open: [...document.querySelectorAll('details.m-fold')].map(d => d.open) }));
    rep(r.h.length === 1 && re.test(r.h[0]) && !no.test(r.t), `analyse ${label} : titre « ${r.h[0]} »`, r.h);
    rep(!/NOTE-INTERNE-FIABILITE/.test(r.t), `analyse ${label} : notes de fiabilité non affichées`);
    rep(r.sum.some(x => /^Voir les sources \(\d+\)$/.test(x)) && r.open.every(o => !o), `fiche mesure ${label} : sources des mesures dans un menu replié`, r.sum);
    await ctx.close();
  }
  route = fixed;

  await br.close();
  console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
