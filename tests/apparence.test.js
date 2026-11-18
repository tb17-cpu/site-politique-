/* Apparence : 3 choix (Clair, Sombre, Automatique), mémorisation, absence de flash, focus clavier visible sur bandeau marine et pied de page. Serveur 8765. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0;const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);const ratio=(a,b)=>{const x=lum(rgb(a))+.05,y=lum(rgb(b))+.05;return Math.max(x,y)/Math.min(x,y)};
const ELEC=[{id:1,name:'Élection présidentielle française de 2027',year:2027,scheduled_date:'2027-04-18',second_round_date:'2027-05-02',publication_status:'published',election_type:'presidential',description:'',countries:{id:1,name:'France',iso2:'FR',publication_status:'published'},country_id:1,election_sources:[]}];
(async()=>{
 const br=await chromium.launch();
 const mk=async(scheme)=>{const ctx=await br.newContext({colorScheme:scheme,viewport:{width:1280,height:800}});await ctx.route('**/rest/v1/**',r=>r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*','content-range':'0-0/0'},body:'[]'}));return ctx};
 // 1. options du sélecteur
 let ctx=await mk('light'),p=await ctx.newPage();await p.goto(B+'methodologie.html',{waitUntil:'networkidle'});
 const opts=await p.$$eval('.theme-pick select option',o=>o.map(x=>[x.value,x.textContent.trim()]));
 rep(JSON.stringify(opts)===JSON.stringify([['auto','Automatique'],['light','Clair'],['dark','Sombre']]),'sélecteur : Automatique, Clair, Sombre',opts);
 rep(await p.getAttribute('html','data-theme')==='light','automatique + système clair → clair');
 await p.selectOption('.theme-pick select','dark');await p.waitForTimeout(500);
 rep(await p.getAttribute('html','data-theme')==='dark','choix Sombre appliqué');
 rep(await p.evaluate(()=>localStorage.getItem('ar.theme'))==='dark','choix mémorisé');
 // 2. mémorisation + pas de flash : l'attribut est posé avant tout rendu
 const p2=await ctx.newPage();
 await p2.addInitScript(()=>{document.addEventListener('readystatechange',()=>{if(!window.__first)window.__first=document.documentElement.getAttribute('data-theme')+'|'+(document.body?getComputedStyle(document.body).backgroundColor:'')});new MutationObserver(()=>{(window.__muts=window.__muts||[]).push(document.documentElement.getAttribute('data-theme'))}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})});
 await p2.goto(B+'index.html',{waitUntil:'domcontentloaded'});
 const first=await p2.evaluate(()=>({t:document.documentElement.getAttribute('data-theme'),bg:getComputedStyle(document.documentElement).backgroundColor,muts:window.__muts}));
 rep(first.t==='dark'&&first.bg==='rgb(11, 20, 36)','rechargement : sombre dès le DOMContentLoaded, fond bleu nuit',first);
 rep(!first.muts||first.muts.every(x=>x==='dark'),'aucun changement de thème pendant le chargement (pas de flash)',first.muts);
 await p2.selectOption('.theme-pick select','auto');
 rep(await p2.evaluate(()=>localStorage.getItem('ar.theme'))===null,'automatique : préférence effacée');
 rep(await p2.getAttribute('html','data-theme')==='light','automatique suit le système (clair)');
 await p2.emulateMedia({colorScheme:'dark'});await p2.waitForTimeout(500);
 rep(await p2.getAttribute('html','data-theme')==='dark','automatique : suit le changement système en direct (sombre)');
 await ctx.close();
 // 3. stockage indisponible
 ctx=await br.newContext({colorScheme:'dark'});await ctx.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})});
 p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(B+'index.html',{waitUntil:'networkidle'});
 rep(await p.getAttribute('html','data-theme')==='dark'&&!errs.length,'stockage bloqué : suit le système, sans erreur',errs);await ctx.close();
 // 4. focus clavier
 for(const th of ['light','dark']){
  ctx=await br.newContext({colorScheme:th,viewport:{width:1280,height:800}});await ctx.route('**/rest/v1/**',r=>{if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range'}});const t=new URL(r.request().url()).pathname.split('/').pop();const d=t==='elections'?ELEC:[];r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-range':`0-0/${d.length}`},body:JSON.stringify(d)})});
  p=await ctx.newPage();await p.goto(B+'index.html',{waitUntil:'networkidle'});
  const pe=await ctx.newPage();await pe.goto(B+'election.html?e=1',{waitUntil:'networkidle'});
  for(const [zone,sel] of [['bandeau élection','.elec-bar .eb-nav a'],['pied de page','.site-footer a'],['en-tête','.site-nav a'],['contenu','main a']]){
   const pg=zone==='bandeau élection'?pe:p;const el=pg.locator(sel).first();if(!await el.count()){rep(false,`${th} ${zone} : élément introuvable`);continue}
   await el.focus();await pg.keyboard.press('Shift+Tab');await pg.keyboard.press('Tab');
   const r=await el.evaluate(e=>{const c=getComputedStyle(e);let x=e,bg;while(x){const b=getComputedStyle(x).backgroundColor;if(b&&!/rgba\(0, 0, 0, 0\)|transparent/.test(b)){bg=b;break}x=x.parentElement}return {style:c.outlineStyle,w:parseFloat(c.outlineWidth),col:c.outlineColor,bg:bg||getComputedStyle(document.body).backgroundColor}});
   rep(r.style!=='none'&&r.w>=2&&ratio(r.col,r.bg)>=3,`${th} focus ${zone} : contour ${r.w}px ${r.col} sur ${r.bg} = ${ratio(r.col,r.bg).toFixed(1)}:1 (≥ 3:1)`,r);
  }
  // sélecteur d'apparence au clavier
  await p.locator('.theme-pick select').focus();await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');
  const tp=await p.locator('.theme-pick').evaluate(e=>{const c=getComputedStyle(e);return c.outlineStyle+' '+c.outlineWidth});
  rep(/solid 3px/.test(tp),`${th} focus du sélecteur d'apparence visible`,tp);
  await ctx.close();
 }
 await br.close();console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
