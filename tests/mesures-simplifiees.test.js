/* Fiches mesures simplifiées : statut éditorial -> formulation initiale fidèle -> analyse d'Au résultat -> sources de la mesure (volet replié, en dernier).
   Les rubriques descriptives (reformulation, description, mécanisme, publics, modalités, précisions, objectif, coût et financement annoncés) restent en
   base mais ne sont jamais affichées : aucune ne doit réapparaître (fiche mesure, comparateur, fiche candidat, thématiques, programmes, élection).
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES (tests/fixtures/donnees-factices.js). Serveur statique 8765 sous /site-politique-/. */
const D = require('./fixtures/donnees-factices.js');
const { chromium } = require('playwright');
const B = 'http://localhost:8765/site-politique-/';
let res = 0, bad = 0;
const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, ok ? '' : JSON.stringify(i === undefined ? '' : i).slice(0, 500)); };
const SENT = ['REFORMULATION-X', 'DESCRIPTION-X', 'MECANISME-X', 'PUBLICS-X', 'MODALITES-X', 'PRECISIONS-X', 'OBJECTIF-X', 'COUT-X', 'FINANCEMENT-X', 'TEXTE-EXPLICATIF-X'];
const LABELS = /Objectif annoncé|Coût annoncé|Financement annoncé|Reformulation|Mécanisme|Publics concernés|Modalités|Précisions complémentaires|Description de la mesure/;
const src = (id, t) => ({ id, title: t, url: 'https://example.org/' + id, publisher: 'Éditeur ' + id, source_type: 'official_document', publication_status: 'published' });
const enrich = base => (t, u) => { const d = base(t, u);
  if (t !== 'measures' || (u.searchParams.get('select') || '').startsWith('id,publication_status,formalization_status')) return d;
  return d.map(m => Object.assign({}, m, { original_text: 'FORMULATION-INITIALE-FIDELE ' + m.id, reformulation: 'REFORMULATION-X', description: 'DESCRIPTION-X', mechanism: 'MECANISME-X', target_groups: 'PUBLICS-X',
    implementation_details: 'MODALITES-X', additional_notes: 'PRECISIONS-X', explanation: 'TEXTE-EXPLICATIF-X', announced_objective: 'OBJECTIF-X', announced_cost: 'COUT-X', cost_currency: 'EUR', cost_period: 'an', announced_funding: 'FINANCEMENT-X',
    measure_sources: [{ id: 'ms1', measure_id: m.id, page_reference: 'p. 3', exact_quote: null, sources: src('r1', 'Programme officiel') }, { id: 'ms2', measure_id: m.id, page_reference: null, exact_quote: null, sources: src('r2', 'Déclaration publique') }],
    analyses: [{ id: 1, publication_status: 'published', analysis_type: 'editorial', analysis_title: 'Titre de l’analyse', assessment: 'ÉVALUATION-AU-RESULTAT', published_at: '2026-11-14T10:00:00Z', analysis_sources: [{ id: 'as1', evidence_excerpt: null, sources: src('a1', 'Étude indépendante') }] }] })); };
const open = async (br, url, { w = 1280, theme = 'light', fn } = {}) => {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(v => { try { localStorage.setItem('ar.theme', v); } catch (e) {} }, theme);
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  const route = enrich(D.route);
  await pg.route('**/rest/v1/**', r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' } });
    const u = new URL(r.request().url()), t = u.pathname.split('/').pop(), data = route(t, u);
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(data.length - 1, 0)}/${data.length}`, 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
  });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pg.goto(B + url, { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
  return { ctx, pg, errs };
};
const clean = (t, n) => { const hit = SENT.filter(s => t.includes(s)); return { ok: !hit.length && !LABELS.test(t), hit, lab: (t.match(LABELS) || [])[0], n }; };
(async () => {
  const br = await chromium.launch();
  for (const [w, th] of [[1280, 'light'], [400, 'dark']]) {
    const T = `${th} ${w}px`;
    for (const id of [1, 2, 3, 5]) {
      const { ctx, pg, errs } = await open(br, 'mesure.html?e=1#' + id, { w, theme: th });
      const r = await pg.evaluate(() => { const body = document.getElementById('f-body'), q = s => body.querySelector(s), pos = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
        const lead = q('.blk--lead'), an = q('.blk--an'), meta = q('.m-meta'), secs = [...body.querySelectorAll('section.blk')], last = secs[secs.length - 1], refs = secs.find(s => /Sources et références/.test(s.querySelector('header').innerText));
        const fold = refs && refs.querySelector('details.m-fold');
        return { t: document.body.innerText, hasLead: !!lead, lead: lead ? lead.innerText : '', order: (!meta || pos(meta, lead)) && pos(lead, an) && pos(an, refs), lastIsRefs: last === refs, fold: !!fold, open: fold ? fold.open : null,
          between: lead && an ? [...body.children].filter(x => pos(lead, x) && pos(x, an)).map(x => x.innerText.slice(0, 40)) : null, anSrc: !!(an && an.querySelector('details.m-fold')), h: document.documentElement.scrollWidth <= innerWidth + 1 }; });
      const c = clean(r.t, id);
      rep(c.ok, `${T} mesure ${id} : aucune rubrique descriptive (reformulation, description, mécanisme, publics, modalités, précisions, objectif, coût, financement)`, c);
      rep(r.hasLead && new RegExp('FORMULATION-INITIALE-FIDELE ' + id).test(r.lead), `${T} mesure ${id} : formulation initiale conservée fidèlement`, r.lead);
      rep(r.order && r.lastIsRefs, `${T} mesure ${id} : ordre statut -> formulation -> analyse -> sources de la mesure (en dernier)`, { order: r.order, last: r.lastIsRefs });
      rep(Array.isArray(r.between) && r.between.length === 0, `${T} mesure ${id} : rien entre la formulation initiale et l'analyse`, r.between);
      rep(r.fold && r.open === false, `${T} mesure ${id} : sources de la mesure dans un volet replié`, [r.fold, r.open]);
      rep(r.anSrc && /ÉVALUATION-AU-RESULTAT/.test(r.t), `${T} mesure ${id} : l'analyse et son volet de sources restent accessibles`, r.anSrc);
      rep(r.h && !errs.length, `${T} mesure ${id} : pas de défilement horizontal, aucune erreur JS`, [r.h, errs]);
      await ctx.close();
    }
  }
  // comparateur : formulation originale + statut seulement
  for (const w of [1280, 400]) {
    const { ctx, pg, errs } = await open(br, 'comparateur.html?e=1#retraites', { w });
    await pg.waitForSelector('table.cmp', { timeout: 4000 }).catch(() => {});
    const r = await pg.evaluate(() => ({ t: document.body.innerText, rows: [...document.querySelectorAll('table.cmp tbody th')].map(x => x.innerText.replace(/\s+/g, ' ').trim()), n: document.querySelectorAll('table.cmp').length }));
    const c = clean(r.t);
    rep(r.n === 1 && c.ok && r.rows.some(x => /^Formulation originale/.test(x)) && !r.rows.some(x => /Objectif|Coût|Financement/.test(x)), `${w}px comparateur : lignes « Candidat » et « Formulation originale » (+ statut), plus d'objectif, de coût ni de financement`, { rows: r.rows, c });
    rep(/FORMULATION-INITIALE-FIDELE/.test(r.t) && !errs.length, `${w}px comparateur : formulation initiale affichée, aucune erreur JS`, errs);
    await ctx.close();
  }
  // autres pages : aucune rubrique supprimée
  for (const [u, n] of [['candidat.html?e=1#1', 'fiche candidat'], ['thematiques.html?e=1', 'thématiques'], ['programmes.html?e=1', 'programmes'], ['election.html?e=1', 'élection'], ['candidats.html?e=1', 'liste des candidats']]) {
    const { ctx, pg, errs } = await open(br, u); const t = await pg.evaluate(() => document.body.innerText); const c = clean(t);
    rep(c.ok && !errs.length, `${n} : aucune rubrique descriptive de mesure affichée, aucune erreur JS`, [c, errs]); await ctx.close();
  }
  await br.close();
  console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
