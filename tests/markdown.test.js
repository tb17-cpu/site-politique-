/* Rendu Markdown des textes éditoriaux : moteur (Node), puis pages réelles dans un navigateur (Playwright, Supabase simulé, données fictives).
   Vérifie : fonctionnalités, couleur identitaire (--accent) en clair et en sombre, vraies puces, sécurité (aucun script, aucun attribut d'événement,
   aucune URL dangereuse), rétrocompatibilité du texte brut, absence de débordement mobile. Serveur 8765. Variable MD_SHOTS = dossier de captures. */
const MD = require('../assets/js/markdown.js');
const D = require('./fixtures/donnees-factices.js');
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'http://localhost:8765/site-politique-/';
let res = 0, bad = 0;
const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, ok ? '' : JSON.stringify(i === undefined ? '' : i).slice(0, 600)); };
const R = (t, o) => MD.render(t, Object.assign({ headingBase: 3, breaks: true }, o));

/* ---------- A. Moteur ---------- */
rep(/<strong>gras<\/strong>/.test(R('Un **gras** ici.')), 'gras');
rep(/<h4>Sous-titre<\/h4>/.test(R('## Sous-titre')) && /<h3>Titre<\/h3>/.test(R('# Titre')), '« ## » devient un sous-titre h4 (« # » : h3)');
rep(R('- Un\n- Deux\n- Trois') === '<ul><li>Un</li><li>Deux</li><li>Trois</li></ul>', 'liste à puces');
rep(R('1. Un\n2. Deux') === '<ol><li>Un</li><li>Deux</li></ol>' && /<ol start="3">/.test(R('3. Trois\n4. Quatre')), 'liste numérotée (numéro de départ conservé)');
rep(R('- Un élément\n  sur plusieurs lignes\n- Deux') === '<ul><li>Un élément<br>sur plusieurs lignes</li><li>Deux</li></ul>', 'élément de liste sur plusieurs lignes');
rep(R('- a\n- b\n\n1. x\n2. y') === '<ul><li>a</li><li>b</li></ul>\n<ol><li>x</li><li>y</li></ol>', 'liste à puces puis liste numérotée : deux listes');
rep(R('Premier.\n\nSecond.') === '<p>Premier.</p>\n<p>Second.</p>', 'ligne vide = nouveau paragraphe');
rep(R('Ligne 1\nLigne 2') === '<p>Ligne 1<br>Ligne 2</p>' && MD.render('Ligne 1\nLigne 2') === '<p>Ligne 1 Ligne 2</p>', 'retour à la ligne : <br> avec breaks, Markdown standard sans');
const fr = 'L’État a décidé : « œuvre d’été » — 10 Md€, n° 3 ; ça marche ! Ça ?';
rep(R(fr) === '<p>' + fr + '</p>', 'accents, apostrophes, guillemets, ponctuation française inchangés', R(fr));
rep(R('5 * 3 * 2 = 30 et snake_case_name') === '<p>5 * 3 * 2 = 30 et snake_case_name</p>', 'astérisques et underscores isolés non interprétés');
const plain = 'Texte simple sans aucune mise en forme.\n\nDeuxième paragraphe.';
rep(R(plain) === '<p>Texte simple sans aucune mise en forme.</p>\n<p>Deuxième paragraphe.</p>', 'texte sans Markdown : simples paragraphes');
const ATT = [
  '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<a href="javascript:alert(1)">x</a>', '<svg onload=alert(1)>', '<iframe src=//evil></iframe>',
  '[clic](javascript:alert(1))', '[clic](JaVaScRiPt:alert(1))', '[clic](data:text/html;base64,PHNjcmlwdD4=)', '[clic](vbscript:x)', '![i](x" onerror="alert(1))',
  '**<b onclick=alert(1)>t</b>**', '`<script>`', '- <img src=x onerror=alert(1)>', '## <script>alert(1)</script>', '[a](https://ok.org "t\" onmouseover=\"alert(1)")',
  '&lt;script&gt;', '<!-- x --><style>*{display:none}</style>', '\u0000<script>', '[x](//evil.com)', '[x](https://a.org/"onmouseover="alert(1))'];
let unsafe = [];
for (const a of ATT) for (const wrap of [a, 'Début ' + a + ' fin', '- ' + a, '> ' + a, '| h |\n|---|\n| ' + a + ' |']) {
  const h = R(wrap) + MD.inline(wrap);
  const tags = h.match(/<\/?[a-z!][^>]*>/gi) || [];
  if (tags.some(t => !/^<\/?(p|br|strong|em|h[3-6]|ul|ol|li|blockquote|code|pre|hr|table|thead|tbody|tr|th|td|div|a)\b/i.test(t) || /\bon[a-z]+\s*=/i.test(t) || /\bstyle\s*=/i.test(t) || (/^<a\b/i.test(t) && !/^<a href="(https?:\/\/[^"<>\s]*|#[^"<>\s]*)"( target="_blank" rel="noopener noreferrer")?>$/.test(t)))) unsafe.push([wrap, h]);
}
rep(unsafe.length === 0, `${ATT.length * 5} contenus malveillants : aucun élément ni attribut dangereux produit`, unsafe.slice(0, 2));
rep(!/<a /.test(R('[x](javascript:alert(1))')) && />x</.test(R('[x](javascript:alert(1))') + '>x<') && /x/.test(R('[x](javascript:alert(1))')), 'URL javascript: : texte conservé, aucun lien');
rep(/<a href="https:\/\/ex\.org\/a_\(b\)" target="_blank" rel="noopener noreferrer">ok<\/a>/.test(R('[ok](https://ex.org/a_(b))')), 'lien https : ouvert avec rel="noopener noreferrer"');

/* ---------- B. Pages réelles ---------- */
const MDTXT = [
  'Introduction avec **mot clé en gras** et l’apostrophe de l’État.',
  'Deuxième ligne du même paragraphe : « ponctuation française » ; œuvre !',
  '',
  '## Premier sous-titre',
  'Un paragraphe sous le sous-titre, avec un **second passage en gras**.',
  '',
  '- Première puce',
  '- Deuxième puce, assez longue pour passer sur plusieurs lignes lorsque la largeur de l’écran est réduite, afin de contrôler l’alignement',
  '  suite de la deuxième puce',
  '- Troisième puce',
  '',
  '## Second sous-titre',
  '1. Premier point numéroté',
  '2. Deuxième point numéroté, également long pour vérifier le retrait des lignes suivantes sur mobile et sur ordinateur',
  '3. Troisième point',
  '',
  'Tentatives : <script>window.__xss=1</script> <img src=x onerror="window.__xss=1"> [lien](javascript:window.__xss=1) <a href="javascript:window.__xss=1" onclick="window.__xss=1">a</a>'
].join('\n');
const PLAIN = 'Texte rédigé sans aucun Markdown, tel qu’il existe déjà sur le site.';
const TEXT_KEYS = new Set(['biography', 'description', 'announced_objective', 'mechanism', 'reformulation', 'assessment', 'expected_effects', 'risks_and_limitations', 'definition', 'methodology', 'target_groups', 'implementation_details']);
const walk = (x, usePlain) => {
  if (Array.isArray(x)) return x.map(v => walk(v, usePlain));
  if (!x || typeof x !== 'object') return x;
  const o = {};
  for (const [k, v] of Object.entries(x)) {
    if (TEXT_KEYS.has(k) && (typeof v === 'string' || v == null)) o[k] = usePlain ? PLAIN : MDTXT;
    else if (k === 'original_text' && typeof v === 'string') o[k] = 'Citation avec **gras** et <b onclick=1>balise</b>';
    else o[k] = walk(v, usePlain);
  }
  return o;
};
const route = usePlain => (t, u) => {
  let data = D.route(t, u);
  if (t === 'measures' && !(u.searchParams.get('select') || '').startsWith('id,publication_status,formalization_status')) data = data.map(m => Object.assign({}, m, { analyses: [{ id: 1, publication_status: 'published', analysis_type: 'editorial', analysis_title: 'Titre **analysé**', assessment: 'x', analysis_sources: [] }] }));
  return walk(data, usePlain);
};
const PAGES = [['candidat', 'candidat.html?e=1#1'], ['mesure', 'mesure.html?e=1#11'], ['thematiques', 'thematiques.html?e=1#retraites'], 
  ['indicateurs', 'indicateurs.html'], ['comparateur', 'comparateur.html?e=1#retraites'], ['election', 'election.html?e=1'], ['accueil', 'index.html']];
const SHOTS = process.env.MD_SHOTS;
(async () => {
  const br = await chromium.launch();
  const stats = {};
  for (const [vn, w, h, mob] of [['desk', 1280, 900, false], ['mob', 390, 844, true]]) for (const th of ['light', 'dark']) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob, deviceScaleFactor: 1 });
    await ctx.addInitScript(v => { try { localStorage.setItem('ar.theme', v); } catch (e) {} }, th);
    for (const [pn, url] of PAGES) {
      const pg = await ctx.newPage(); const errs = [], dialogs = [];
      pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
      await pg.route('**/rest/v1/**', r => {
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' } });
        const u = new URL(r.request().url()), t = u.pathname.split('/').pop(); const data = route(false)(t, u);
        r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(data.length - 1, 0)}/${data.length}`, 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
      });
      await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      await pg.goto(B + url, { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
      if (pn === 'comparateur') { // sélectionner deux mesures de candidats différents
        await pg.evaluate(() => { const c = [...document.querySelectorAll('input[type=checkbox]')]; c.slice(0, 4).forEach(x => x.click()); const b = document.querySelector('#cmp-go,button.btn--primary,[data-compare]'); if (b) b.click(); });
        await pg.waitForTimeout(700);
      }
      const r = await pg.evaluate(() => {
        const rgb = c => { const d = document.createElement('i'); d.style.color = c; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; };
        const accent = rgb(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
        const md = [...document.querySelectorAll('.md--rich')];
        const strongs = [...document.querySelectorAll('.md--rich strong')];
        const lis = [...document.querySelectorAll('.md--rich ul > li')], ols = [...document.querySelectorAll('.md--rich ol > li')];
        const markerOk = [...lis, ...ols].every(li => getComputedStyle(li, '::marker').color === accent);
        const ul = document.querySelector('.md--rich ul'), ol = document.querySelector('.md--rich ol');
        const h4 = document.querySelector('.md--rich h4');
        const dangerous = document.querySelectorAll('.md--rich script,.md--rich img,.md--rich iframe,[onerror],[onclick],[onload],.md--rich a[href^="javascript" i]').length;
        const liBox = lis[1] && lis[1].getBoundingClientRect(), ulBox = ul && ul.getBoundingClientRect();
        return { n: md.length, strongN: strongs.length, strongOk: strongs.length > 0 && strongs.every(s => getComputedStyle(s).color === accent && parseInt(getComputedStyle(s).fontWeight) >= 700), accent,
          markerOk, nLi: lis.length, nOl: ols.length, ulType: ul && getComputedStyle(ul).listStyleType, olType: ol && getComputedStyle(ol).listStyleType, liDisplay: lis[0] && getComputedStyle(lis[0]).display,
          h4: h4 && { t: h4.textContent, ff: getComputedStyle(h4).fontFamily.slice(0, 20), fw: getComputedStyle(h4).fontWeight, bb: getComputedStyle(h4).borderBottomColor }, dangerous, xss: window.__xss === undefined ? 0 : 1,
          overflow: document.documentElement.scrollWidth - innerWidth, indent: liBox && ulBox ? Math.round(liBox.left - ulBox.left) : null,
          litteral: /<script|onerror=|javascript:/.test(document.body.innerText) ? 1 : 0 };
      });
      const tag = `${vn}/${th}/${pn}`;
      const need = pn === 'candidat' || pn === 'mesure' || pn === 'thematiques' || pn === 'programmes' || pn === 'indicateurs' || pn === 'comparateur';
      if (need) {
        rep(r.n > 0 && r.strongN > 0, `${tag} : texte rédigé rendu par le moteur commun (${r.n} blocs, ${r.strongN} gras)`, r);
        rep(r.strongOk, `${tag} : gras en couleur identitaire (--accent = ${r.accent}), graisse ≥ 700`, r);
        rep(r.nLi >= 3 && r.markerOk, `${tag} : puces = vrais marqueurs en couleur identitaire (${r.nLi} puces, ${r.nOl} numérotées)`, r);
      }
      if (['candidat', 'mesure', 'thematiques', 'programmes', 'indicateurs'].includes(pn)) rep(r.ulType === 'disc' && r.olType === 'decimal' && r.liDisplay === 'list-item' && r.h4 && /serif|Source|Georgia/i.test(r.h4.ff) && r.indent >= 12, `${tag} : listes disc/decimal, retrait ${r.indent}px, sous-titre serif`, r);
      rep(r.dangerous === 0 && r.xss === 0 && dialogs.length === 0 && errs.length === 0, `${tag} : aucune exécution (script, onerror, javascript:), aucune alerte, aucune erreur JS`, { r, dialogs, errs });
      if (need) rep(r.litteral === 1, `${tag} : les balises injectées sont affichées comme texte inerte (visibles, non exécutées)`);
      rep(r.overflow <= 0, `${tag} : pas de débordement horizontal (${r.overflow})`, r);
      if (SHOTS && ['candidat', 'mesure', 'thematiques'].includes(pn)) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: `${SHOTS}/${pn}-${th}-${vn}.png`, fullPage: true }); }
      await pg.close();
    }
    await ctx.close();
  }
  /* Rétrocompatibilité : texte brut → aucune puce, aucun sous-titre, texte identique */
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
  await pg.route('**/rest/v1/**', r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' } });
    const u = new URL(r.request().url()), t = u.pathname.split('/').pop(); const data = route(true)(t, u);
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(data.length - 1, 0)}/${data.length}`, 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
  });
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  for (const [pn, url] of [['candidat', 'candidat.html?e=1#1'], ['mesure', 'mesure.html?e=1#11'],  ['thematiques', 'thematiques.html?e=1#retraites']]) {
    await pg.goto(B + url, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
    const x = await pg.evaluate(p => ({ n: [...document.querySelectorAll('.md--rich')].filter(m => m.textContent.trim() === p).length, any: document.querySelectorAll('.md--rich').length, extra: document.querySelectorAll('.md--rich ul,.md--rich ol,.md--rich h4,.md--rich strong,.md--rich a').length }), PLAIN);
    rep(x.n >= 1 && x.extra === 0, `${pn} : textes existants sans Markdown : ${x.n} champ(s) identiques au texte brut, aucune puce, aucun sous-titre, aucun gras ajouté (${x.any} blocs)`, x);
  }
  await br.close();
  console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
})();
