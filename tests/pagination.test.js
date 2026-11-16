/* Test de pagination (> 1000 lignes). Simule PostgREST avec Playwright : aucune connexion à Supabase.
   Prérequis : serveur statique sur le port 8765 servant le dépôt sous /site-politique-/ ; lancer : node tests/pagination.test.js */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0;
const rep=(ok,name,info)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',name,ok?'':JSON.stringify(info||''))};
const person={id:'p1',first_name:'A',last_name:'B',publication_status:'published'};
const party={id:'pa1',name:'P',acronym:'P',publication_status:'published'};
const pb={publication_status:'published'};
const chain=(n)=>({version_label:'v1',...pb,programs:{...pb,candidacies:{id:'c1',election_id:'e1',...pb,people:person,parties:party}}});
const mkMeasures=n=>Array.from({length:n},(_,i)=>({id:'m'+String(i).padStart(5,'0'),title:'M'+i,reliability_level:'high',...pb,display_order:i%7,program_versions:chain(),measure_themes:[{theme_id:'S1',themes:{id:'S1',...pb}}]}));
const mkCands=n=>Array.from({length:n},(_,i)=>({id:'c'+String(i).padStart(5,'0'),election_id:'e1',candidacy_status:'declared',...pb,display_order:i%5,announcement_date:'2026-01-01',people:{...person,id:'p'+i},parties:party}));
const mkProgs=n=>Array.from({length:n},(_,i)=>({id:'pr'+String(i).padStart(5,'0'),title:'P'+i,...pb,candidacy_id:'c1',candidacies:{id:'c1',election_id:'e1',...pb,people:person,parties:party},program_versions:[]}));
const mkObs=n=>Array.from({length:n},(_,i)=>({id:'o'+String(i).padStart(5,'0'),indicator_id:'i1',country_id:'fr',period_end:'2025-'+String(1+i%12).padStart(2,'0')+'-28',value:i,...pb,countries:{name:'France',iso2:'FR',...pb},sources:{title:'S',url:'https://e.org',...pb}}));
const mkPolls=n=>Array.from({length:n},(_,i)=>({id:'q'+String(i).padStart(5,'0'),election_id:'e1',record_kind:'poll',entity_kind:'person',poll_date:'2026-11-1'+(i%3),snapshot_date:'2026-11-12',value_percent:i%10,...pb,people:person,sources:{id:'s',title:'S',...pb}}));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sortBy=(rows,order)=>{ // ties résolus au hasard si l'ordre ne contient pas id (comportement non déterministe réel)
  const keys=(order||'').split(',').filter(Boolean).map(k=>{const [c,d,n]=k.split('.');return {c,desc:d==='desc',nullsLast:n==='nullslast'}});
  const a=shuffle(rows.slice());
  return a.sort((x,y)=>{for(const k of keys){const p=x[k.c],q=y[k.c];if(p===q)continue;if(p==null)return k.nullsLast?1:-1;if(q==null)return k.nullsLast?-1:1;const c=p<q?-1:1;return k.desc?-c:c}return 0});
};
async function run(browser,data,fn,opts={}){
  const ctx=await browser.newContext(); const reqs=[]; const errs=[];
  await ctx.route('**/rest/v1/**',r=>{
    const req=r.request(),u=new URL(req.url()),t=u.pathname.split('/').pop();
    const h={'access-control-allow-origin':'*','access-control-expose-headers':'content-range','access-control-allow-headers':'*','content-type':'application/json'};
    if(req.method()==='OPTIONS')return r.fulfill({status:204,headers:h});
    const q=u.searchParams, lim=q.get('limit'), off=+(q.get('offset')||0), pref=req.headers()['prefer']||'';
    reqs.push({t,limit:lim,offset:off,order:q.get('order'),count:/count=exact/.test(pref)});
    let rows=data[t]||[];
    rows=rows.filter(x=>{for(const [k,v] of q){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    const total=rows.length; rows=sortBy(rows,q.get('order'));
    const cap=opts.maxRows||1000; const n=Math.min(lim?+lim:cap,cap);
    const part=rows.slice(off,off+n);
    h['content-range']=part.length?`${off}-${off+part.length-1}/${/count=exact/.test(pref)?(opts.badTotal?total+5:total):'*'}`:`*/${total}`;
    r.fulfill({status:200,headers:h,body:JSON.stringify(part)});
  });
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+'index.html',{waitUntil:'networkidle'});
  const out=await fn(p,reqs); await ctx.close(); return {out,reqs,errs};
}
const call=(p,expr)=>p.evaluate(async e=>{try{const v=await eval(e);return {ok:true,v}}catch(x){return {ok:false,kind:x.kind,msg:x.message}}},expr);
(async()=>{
  const browser=await chromium.launch();
  const ids=a=>a.map(x=>x.id);
  const sorted=(a)=>a.every((x,i)=>i===0||a[i-1]<=x);
  // 1) tailles limites sur "measures" (ex æquo massifs sur display_order)
  for (const N of [999,1000,1001,2500,3001]) {
    const M=mkMeasures(N);
    const {out,reqs,errs}=await run(browser,{measures:M},async p=>{
      const a=await call(p,'DB.measuresByThemes(["S1"],"e1").then(r=>r.map(m=>({id:m.id,o:m.display_order})))');
      const b=await call(p,'DB.measuresForCompare(["S1"],"e1").then(r=>r.map(m=>m.id))');
      const c=await call(p,'DB.searchIndex("e1").then(r=>r.measures.map(m=>m.id))');
      return {a,b,c};
    });
    const a=out.a.v, expectIds=M.map(m=>m.id).sort();
    rep(out.a.ok&&a.length===N,`measuresByThemes ${N} lignes : toutes récupérées`,{got:out.a.ok?a.length:out.a});
    rep(out.a.ok&&new Set(a.map(x=>x.id)).size===N,`measuresByThemes ${N} : aucun doublon`);
    rep(out.a.ok&&JSON.stringify(a.map(x=>x.id).slice().sort())===JSON.stringify(expectIds),`measuresByThemes ${N} : aucune omission`);
    rep(out.a.ok&&a.every((x,i)=>i===0||a[i-1].o<x.o||(a[i-1].o===x.o&&(N<1000||a[i-1].id<x.id))),`measuresByThemes ${N} : ordre display_order${N<1000?' (inchangé sous 1000)':' puis id stable'}`);
    rep(out.b.ok&&out.b.v.length===N&&new Set(out.b.v).size===N,`measuresForCompare ${N} : complet, sans doublon`,out.b.ok?out.b.v.length:out.b);
    rep(out.c.ok&&out.c.v.length===N&&new Set(out.c.v).size===N,`searchIndex ${N} mesures : complet, sans doublon`,out.c.ok?out.c.v.length:out.c);
    const mreq=reqs.filter(r=>r.t==='measures');
    rep(mreq.every(r=>r.limit==='1000'),`measures ${N} : toute requête porte limit=1000 (jamais de tronquage implicite)`);
    if(N<1000) rep(mreq.every(r=>r.offset===0)&&mreq.length===3,`measures ${N} : une seule requête par appel (comportement inchangé)`,mreq.length);
    if(N>=1000) rep(mreq.some(r=>r.offset>0||N===1000)&&mreq.filter(r=>r.offset>0).every(r=>/id\.asc/.test(r.order||'')),`measures ${N} : pages suivantes avec tiebreaker id`);
    rep(!errs.length,`measures ${N} : aucune erreur JS`,errs);
  }
  // 2) ordre : mêmes résultats sur 5 exécutions (ex æquo mélangés par le simulateur)
  {
    const M=mkMeasures(2200); const seqs=new Set();
    for(let k=0;k<5;k++){const {out}=await run(browser,{measures:M},p=>call(p,'DB.measuresByThemes(["S1"],"e1").then(r=>r.map(m=>m.id).join())'));seqs.add(out.v)}
    rep(seqs.size===1,'ordre identique sur 5 chargements indépendants (2200 mesures, ex æquo massifs)',seqs.size);
  }
  // 3) preuve : sans tiebreaker la pagination naïve produirait doublons/omissions (le simulateur est bien discriminant)
  {
    const M=mkMeasures(2500);
    const {out}=await run(browser,{measures:M},async p=>p.evaluate(async()=>{const get=async o=>(await (await fetch(window.SUPABASE_CONFIG.url+'/rest/v1/measures?select=id&order=display_order.asc&limit=1000&offset='+o,{headers:{apikey:window.SUPABASE_CONFIG.key}})).json()).map(x=>x.id);const a=[].concat(await get(0),await get(1000),await get(2000));return {n:a.length,u:new Set(a).size}}));
    rep(out.n===2500&&out.u<2500,'contrôle du simulateur : pagination naïve (sans id) produit des doublons',out);
  }
  // 4) candidatures, programmes, observations, sondages
  const tests=[
    ['candidacies',mkCands(1500),'DB.candidacies("e1").then(r=>r.map(x=>x.id))',1500],
    ['programs',mkProgs(1200),'DB.programs("e1").then(r=>r.map(x=>x.id))',1200],
    ['indicator_observations',mkObs(2100),'DB.observations().then(r=>r.map(x=>x.id))',2100],
    ['poll_snapshots',mkPolls(1300),'DB.polls("e1").then(r=>r.rows.map(x=>x.id))',1300],
    ['themes',Array.from({length:1100},(_,i)=>({id:'t'+String(i).padStart(5,'0'),name:'T'+i,display_order:i%3,...pb})),'DB.themes().then(r=>r.map(x=>x.id))',1100],
  ];
  for(const [t,rowsData,expr,N] of tests){
    const {out,reqs}=await run(browser,{[t]:rowsData},p=>call(p,expr));
    rep(out.ok&&out.v.length===N&&new Set(out.v).size===N,`${t} ${N} lignes : toutes récupérées, sans doublon`,out.ok?out.v.length:out);
    rep(reqs.filter(r=>r.t===t).every(r=>r.limit==='1000'),`${t} : limit=1000 explicite sur chaque page`);
  }
  // candidatures : ordre display_order nullslast puis id
  {
    const C=mkCands(1500);
    const {out}=await run(browser,{candidacies:C},p=>call(p,'DB.candidacies("e1").then(r=>r.map(x=>({id:x.id,o:x.display_order})))'));
    rep(out.ok&&out.v.every((x,i)=>i===0||out.v[i-1].o<x.o||(out.v[i-1].o===x.o&&out.v[i-1].id<x.id)),'candidacies 1500 : ordre display_order puis id');
  }
  // 5) sondages : l'ancien plafond limit=1000 n'existe plus
  {
    const {reqs}=await run(browser,{poll_snapshots:mkPolls(14)},p=>call(p,'DB.polls("e1")'));
    rep(reqs.filter(r=>r.t==='poll_snapshots').length===1,'polls 14 lignes : une seule requête');
  }
  // 6) requêtes à limite explicite inchangées
  {
    const {reqs,out}=await run(browser,{candidacies:mkCands(3)},p=>call(p,'DB.candidacy("c00001")'));
    rep(reqs.filter(r=>r.t==='candidacies').every(r=>r.limit==='1'&&r.offset===0),'requête limit=1 (fiche) inchangée',reqs);
  }
  // 7) incohérences : jamais de silence
  {
    const {out}=await run(browser,{measures:mkMeasures(2500)},p=>call(p,'DB.measuresByThemes(["S1"],"e1")'),{badTotal:true});
    rep(!out.ok&&out.kind==='incomplete','total annoncé incohérent -> erreur « incomplete » (pas de silence)',out);
  }
  await browser.close();
  console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
