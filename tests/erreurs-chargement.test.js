/* Erreurs de chargement des résultats et des sondages : une erreur technique n'est JAMAIS présentée comme une absence de données.
   Fiche candidat, liste des candidats, page d'élection ; clair/sombre, 1280/400 px. Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES.
   Serveur statique 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0; const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const pb={publication_status:'published'};
const EL=id=>({id,name:'Scrutin fictif '+id,year:2027,election_type:'presidential',scheduled_date:'2027-04-10',second_round_date:'2027-04-24',...pb,country_id:'fr',description:null,countries:{id:'fr',name:'France',iso2:'FR',...pb}});
const ELS=[EL('x1'),EL('x2')];
const C=[];
['x1','x2'].forEach(el=>[['A','Alice','Alpha','declared'],['B','Bruno','Beta','declared'],['W','Wilma','Omega','withdrawn']].forEach(([k,f,l,st])=>C.push({id:k+'-'+el,election_id:el,candidacy_status:st,...pb,people:{id:'p'+k+el,first_name:f,last_name:l,...pb},parties:null,
  elections:{id:el,name:'Scrutin fictif '+el,year:2027,scheduled_date:'2027-04-10',second_round_date:null,...pb},programs:[],candidacy_sources:[],candidacy_sponsorship_territories:[]})));
const cand=id=>C.find(c=>c.id===id);
// x1 : résultats définitifs (A élue, B battue). x2 : aucun résultat ; sondages pour A et B.
const RR=[{id:'rr-x11',election_id:'x1',round_number:1,held_on:'2027-04-10',result_status:'final',registered_voters:null,voters:null,abstentions:null,blank_votes:null,null_votes:null,expressed_votes:null,source_id:null,sources:null,notes:null,...pb,
  election_candidate_results:[['A',60,true],['B',40,false]].map(([k,pc,el])=>({id:'cr-'+k,round_result_id:'rr-x11',entity_kind:'candidacy',candidacy_id:k+'-x1',candidacies:cand(k+'-x1'),percent_expressed:pc,votes:pc*1000,qualified_next_round:false,elected:el,...pb}))}];
const POLLS=[['A',31],['B',27]].map(([k,v],i)=>({id:'pl'+i,election_id:'x2',snapshot_date:'2026-11-18',record_kind:'poll',poll_date:'2026-11-15',fieldwork_start:'2026-11-12',pollster:'Inst',scenario:'S',round:1,round_basis:'explicit',entity_kind:'candidacy',candidacy_id:k+'-x2',candidacies:cand(k+'-x2'),value_percent:v,sample_size:1500,methodology:null,notes:null,...pb,
  sources:{id:'s1',title:'Sondage fictif',url:'https://example.org/s',publisher:'Inst',publication_date:'2026-11-16',...pb}}));
const D={elections:ELS,candidacies:C,programs:[],poll_snapshots:POLLS,election_round_results:RR};
const E={ // modes d'erreur simulés : [statut, corps]
  denied:[403,{code:'42501',message:'permission denied for table'}], rel:[400,{code:'PGRST200',message:'Could not find a relationship between tables'}],
  col:[400,{code:'42703',message:'column does not exist'}], schema:[406,{code:'PGRST106',message:'The schema must be one of the following: public'}],
  nocode400:[400,{message:'Bad Request'}], nocode404:[404,{message:'Not Found'}], server:[500,{message:'boom'}],
  cache:[404,{code:'PGRST205',message:"Could not find the table 'public.election_round_results' in the schema cache"}], undefined42:[404,{code:'42P01',message:'relation does not exist'}]};
let MODE={};
async function page(w,url,mode,fn,theme){
  MODE=mode; const b=await chromium.launch(); const c=await b.newContext({viewport:{width:w,height:900}}); const errs=[],logs=[];
  await c.clock.setFixedTime(new Date('2026-11-20T10:00:00Z'));
  await c.addInitScript(t=>{try{localStorage.setItem('ar.theme',t)}catch(e){}},theme||'light');
  await c.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await c.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range'};
    const m=t==='election_round_results'?MODE.results:t==='poll_snapshots'?MODE.polls:null;
    if(m==='network')return r.abort('failed');
    if(m&&E[m])return r.fulfill({status:E[m][0],headers:h,body:JSON.stringify(E[m][1])});
    let rows=m==='empty'?[]:(D[t]||[]);rows=rows.filter(x=>{for(const [k,v] of u.searchParams){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    h['content-range']=`0-0/${rows.length}`;r.fulfill({status:200,headers:h,body:JSON.stringify(rows)})});
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR/.test(m.text()))errs.push(m.text())});
  await p.goto(B+url,{waitUntil:'networkidle'});await p.waitForTimeout(700);
  await fn(p); rep(!errs.length,`  ${w}px ${url} [${JSON.stringify(mode)}] : aucune erreur JavaScript`,errs); await b.close();
}
const notes=p=>p.evaluate(()=>[...document.querySelectorAll('[data-load-error]')].map(x=>x.getAttribute('data-load-error')+'|'+x.innerText));
const card=async p=>{await p.waitForSelector('.cand-id',{timeout:5000}).catch(()=>{});return p.evaluate(()=>{const c=document.querySelector('.status-card');return {has:!!c,t:c?c.innerText:'',all:document.querySelector('#f-body').innerText}})};
const list=async p=>{await p.waitForSelector('.cand',{timeout:5000});return p.locator('.cand').evaluateAll(a=>a.map(x=>({t:x.innerText,badge:(x.querySelector('.statut')||{}).innerText||''})))};
const RES_ERR=['cache','denied','rel','col','schema','nocode400','nocode404','server','network'];
(async()=>{
 for(const [w,th] of [[1280,'light'],[400,'dark']]){
  const T=`${th} ${w}px`;
  // ---- témoins : chargement normal, et absence normale
  await page(w,'candidat.html#A-x1',{},async p=>{const c=await card(p),n=await notes(p);rep(/Élu/.test(c.t)&&!n.length,`${T} fiche, résultats chargés : « Élu », aucun message`,{c:c.t,n});},th);
  await page(w,'candidat.html#A-x1',{results:'empty'},async p=>{const c=await card(p),n=await notes(p);rep(c.has&&/déclarée/i.test(c.t)&&!n.length,`${T} fiche, ABSENCE réelle de résultats (liste vide) : statut de candidature, aucun message d'erreur`,{c:c.t,n});},th);
  await page(w,'candidat.html#A-x1',{results:'undefined42'},async p=>{const c=await card(p),n=await notes(p);rep(c.has&&/déclarée/i.test(c.t)&&!n.length,`${T} fiche, table CERTAINEMENT absente (42P01) : fonctionnalité inactive, aucun message`,{c:c.t,n});},th);
  await page(w,'candidat.html#A-x1',{results:'cache'},async p=>{const c=await card(p),n=await notes(p);rep(n.length===1&&/^results:schema-cache/.test(n[0])&&!/Élu|Qualifié|Battu|Éliminé|déclarée/i.test(c.t),`${T} fiche, PGRST205 (cache de schéma, absence NON prouvée) : message discret, aucun statut trompeur`,{c:c.t,n});},th);
  await page(w,'candidat.html#A-x2',{},async p=>{const c=await card(p),n=await notes(p);rep(/Intentions de vote/.test(c.t)&&!n.length,`${T} fiche, sondages chargés : estimation affichée, aucun message`,{c:c.t,n});},th);
  await page(w,'candidat.html#A-x2',{polls:'empty'},async p=>{const c=await card(p),n=await notes(p);rep(c.has&&!/Intentions/.test(c.t)&&!n.length,`${T} fiche, ABSENCE réelle de sondages : aucune estimation, aucun message d'erreur`,{c:c.t,n});},th);
  // ---- erreurs de résultats : jamais un faux « aucun résultat », jamais un statut trompeur
  for(const m of RES_ERR){
   await page(w,'candidat.html#A-x1',{results:m},async p=>{const c=await card(p),n=await notes(p);
     rep(n.length===1&&/^results:/.test(n[0])&&/informations électorales (n’ont pas pu être chargées|ne sont pas accessibles)/.test(n[0])&&!/Élu|Qualifié|Battu|Éliminé|déclarée/i.test(c.t)&&!/Aucun résultat/i.test(c.all),`${T} fiche, résultats en erreur (${m}) : message discret, aucun statut électoral, pas de « aucun résultat »`,{n,c:c.t});},th);
  }
  await page(w,'candidat.html#W-x1',{results:'denied'},async p=>{const c=await card(p),n=await notes(p);rep(c.has&&/retir/i.test(c.t)&&n.length===1,`${T} fiche, résultats en erreur : le retrait de candidature (fiable) reste affiché avec le message`,{c:c.t,n});},th);
  // ---- erreurs de sondages
  for(const m of ['denied','rel','schema','nocode404','server','network']){
   await page(w,'candidat.html#A-x2',{polls:m},async p=>{const c=await card(p),n=await notes(p);
     rep(n.length===1&&/^polls:/.test(n[0])&&/sondages/i.test(n[0])&&!/Intentions/.test(c.t),`${T} fiche, sondages en erreur (${m}) : message discret, aucune estimation inventée`,{n,c:c.t});},th);
  }
  await page(w,'candidat.html#A-x1',{polls:'denied'},async p=>{const c=await card(p),n=await notes(p);rep(/Élu/.test(c.t)&&n.length===1&&/^polls:/.test(n[0]),`${T} fiche, sondages en erreur mais résultats chargés : « Élu » conservé, message sondages`,{n,c:c.t});},th);
  // ---- liste des candidats
  await page(w,'candidats.html?e=x1',{},async p=>{const l=await list(p),n=await notes(p);const g=k=>l.find(x=>x.t.includes(k)).badge;rep(/^Élu/i.test(g('Alice'))&&/Battu/i.test(g('Bruno'))&&!n.length,`${T} liste, résultats chargés : Élu / Battu, aucun message`,{b:l.map(x=>x.badge),n});},th);
  await page(w,'candidats.html?e=x1',{results:'empty'},async p=>{const l=await list(p),n=await notes(p);rep(l.length===3&&!n.length,`${T} liste, absence réelle de résultats : aucun message`,n);},th);
  await page(w,'candidats.html?e=x1',{results:'undefined42'},async p=>{const l=await list(p),n=await notes(p);rep(l.length===3&&!n.length,`${T} liste, table certainement absente (42P01) : aucun message`,n);},th);
  await page(w,'candidats.html?e=x1',{results:'cache'},async p=>{const l=await list(p),n=await notes(p);rep(l.length===3&&n.length===1&&/^results:schema-cache/.test(n[0])&&l.every(x=>!/déclarée/i.test(x.badge)),`${T} liste, PGRST205 : message discret, aucune pastille de candidature trompeuse`,n);},th);
  for(const m of RES_ERR){
   await page(w,'candidats.html?e=x1',{results:m},async p=>{const l=await list(p),n=await notes(p);const g=k=>l.find(x=>x.t.includes(k)).badge;
     rep(l.length===3&&n.length===1&&/^results:/.test(n[0])&&g('Alice')===''&&g('Bruno')===''&&/retir/i.test(g('Wilma')),`${T} liste, résultats en erreur (${m}) : message discret, aucune pastille électorale (retrait conservé)`,{b:l.map(x=>x.badge),n});},th);
  }
  // ---- page d'élection
  await page(w,'election.html?e=x1',{},async p=>{const n=await notes(p),ok=await p.locator('[data-results=ok]').count();rep(ok===1&&!n.length,`${T} élection, résultats chargés : rubrique « Résultats officiels », aucun message`,{ok,n});},th);
  await page(w,'election.html?e=x1',{results:'empty'},async p=>{const n=await notes(p),any=await p.locator('[data-results]').count();rep(any===0&&!n.length,`${T} élection, absence réelle de résultats : rien du tout (ni bloc ni message)`,{any,n});},th);
  await page(w,'election.html?e=x1',{results:'undefined42'},async p=>{const n=await notes(p),any=await p.locator('[data-results]').count();rep(any===0&&!n.length,`${T} élection, table certainement absente (42P01) : rien du tout`,{any,n});},th);
  await page(w,'election.html?e=x1',{results:'cache'},async p=>{const n=await notes(p),e=await p.locator('[data-results=error]').count();rep(e===1&&n.length===1&&/^results:schema-cache/.test(n[0]),`${T} élection, PGRST205 : message discret dans la rubrique (jamais « aucun résultat »)`,{e,n});},th);
  for(const m of RES_ERR) await page(w,'election.html?e=x1',{results:m},async p=>{const n=await notes(p),e=await p.locator('[data-results=error]').count(),ok=await p.locator('[data-results=ok]').count();
     rep(e===1&&ok===0&&n.length===1&&/^results:/.test(n[0]),`${T} élection, résultats en erreur (${m}) : message discret dans la rubrique, pas de faux « aucun résultat »`,{e,ok,n});},th);
  await page(w,'election.html?e=x2',{polls:'empty'},async p=>{const n=await notes(p),pe=await p.locator('[data-poll-error]').count();rep(!pe&&!n.length,`${T} élection, absence réelle de sondages : rien`,{pe,n});},th);
  for(const m of ['cache','denied','rel','schema','nocode404','server','network']) await page(w,'election.html?e=x2',{polls:m},async p=>{const pe=await p.locator('[data-poll-error]').count();
     rep(pe===1,`${T} élection, sondages en erreur (${m}) : message dédié (jamais « aucun sondage »)`,{pe});},th);
 }
 // ---- qualification des erreurs dans db.js (codes, pas statut HTTP seul)
 await page(1280,'election.html?e=x1',{},async p=>{const r=await p.evaluate(()=>{const D=DB.DbError,mk=(s,c,d)=>new D('http','x',s,c,d);return {
   rel:[DB.isRelationAbsent(mk(404,'42P01')),DB.isRelationAbsent(mk(400,'42P01'))],
   notRel:[DB.isRelationAbsent(mk(404,'PGRST205')),DB.isRelationAbsent(mk(404,'')),DB.isRelationAbsent(mk(400,'')),DB.isRelationAbsent(mk(400,'PGRST200')),DB.isRelationAbsent(mk(400,'42703')),DB.isRelationAbsent(mk(403,'42501')),DB.isRelationAbsent(new D('network','x')),DB.isRelationAbsent(new Error('x'))],
   cache:[DB.isSchemaCacheMiss(mk(404,'PGRST205')),DB.isSchemaCacheMiss(mk(404,'42P01')),DB.isSchemaCacheMiss(mk(404,''))],
   cls:[DB.classify(mk(404,'PGRST205')),DB.classify(mk(404,'')),DB.classify(mk(400,'')),DB.classify(mk(403,'42501')),DB.classify(mk(404,'42P01'))],
   schema:[DB.isSchemaError(mk(400,'PGRST200')),DB.isSchemaError(mk(400,'42703')),DB.isSchemaError(mk(403,'42501')),DB.isSchemaError(mk(400,''))]}});
  rep(r.rel.every(Boolean),'isRelationAbsent : 42P01 (absence certaine) reconnu',r.rel);
  rep(r.notRel.every(x=>x===false),'isRelationAbsent : PGRST205, 404/400 sans code, PGRST200, 42703, 42501, réseau : NON reconnus',r.notRel);
  rep(r.cache[0]&&!r.cache[1]&&!r.cache[2],'isSchemaCacheMiss : PGRST205 seulement',r.cache);
  rep(JSON.stringify(r.cls)==='["schema-cache","missing","invalid","denied","missing"]','classify : PGRST205 → « schema-cache » (distinct d\'une absence), 404/400 sans code → missing/invalid, 42501 → denied',r.cls);
  rep(r.schema[0]&&r.schema[1]&&!r.schema[2]&&!r.schema[3],'isSchemaError : défauts de schéma seulement',r.schema);});
 for(const [m,exp] of [['undefined42','absent'],['empty','vide'],['cache','erreur'],['denied','erreur'],['rel','erreur'],['col','erreur'],['schema','erreur'],['nocode400','erreur'],['nocode404','erreur'],['network','erreur']])
  await page(1280,'election.html?e=x1',{results:m},async p=>{const r=await p.evaluate(async()=>{try{const x=await DB.results('x1');return {ok:true,n:x.rounds.length,absent:!!x.absent}}catch(e){return {ok:false,kind:DB.classify(e),code:e.code||''}}});
   const good=exp==='erreur'?(!r.ok):exp==='absent'?(r.ok&&r.n===0&&r.absent):(r.ok&&r.n===0&&!r.absent);
   rep(good,`DB.results (${m}) : ${exp==='erreur'?'exception propagée':exp==='absent'?'absence certaine : { rounds: [], absent }':'vide réel : { rounds: [] } sans « absent »'}`,r);});
 // désactivation EXPLICITE avant la migration : aucune requête, aucun message
 {MODE={};const b=await chromium.launch();const c=await b.newContext();let n=0;await c.route(/fonts\./,r=>r.abort());
  await c.route('**/rest/v1/**',r=>{const t=new URL(r.request().url()).pathname.split('/').pop();if(t==='election_round_results')n++;const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range','content-range':'0-0/0'};r.fulfill({status:200,headers:h,body:'[]'})});
  const p=await c.newPage();await p.goto(B+'election.html?e=x1',{waitUntil:'networkidle'});const before=n;
  const r=await p.evaluate(async()=>{SUPABASE_CONFIG.electionResults=false;const x=await DB.results('x1');return {rounds:x.rounds.length,disabled:!!x.disabled}});
  rep(r.rounds===0&&r.disabled&&n===before,'SUPABASE_CONFIG.electionResults = false : rubrique désactivée explicitement, aucune requête vers la table',{r,n,before});await b.close();}
 await page(1280,'election.html?e=x1',{polls:'denied'},async p=>{const r=await p.evaluate(async()=>{try{await DB.polls('x2');return 'ok'}catch(e){return DB.classify(e)}});rep(r==='denied','DB.polls : accès refusé propagé (jamais une liste vide)',r);});
 await page(1280,'election.html?e=x1',{polls:'cache'},async p=>{const r=await p.evaluate(async()=>{try{await DB.polls('x2');return 'ok'}catch(e){return DB.classify(e)}});rep(r==='schema-cache','DB.polls : PGRST205 propagé comme erreur (« schema-cache »), pas de faux « aucun sondage »',r);});
 console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
