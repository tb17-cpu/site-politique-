/* Parcours d'un candidat sur plusieurs tours (aucun statut ultérieur n'écrase silencieusement une victoire antérieure) et colonnes déclaratives
   second_round_status / second_round_qualified_at (jamais une preuve ; rapprochement informatif dans le diagnostic).
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES. Serveur statique 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0; const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const pb={publication_status:'published'};
const IDS=['p1','p3','p4','q1','p5','p6','p7','p8','p9'];
const ELS=IDS.map(id=>({id,name:'Scrutin fictif '+id,year:2027,election_type:'presidential',scheduled_date:'2027-04-10',second_round_date:'2027-04-24',...pb,country_id:'fr',description:null,countries:{id:'fr',name:'France',iso2:'FR',...pb}}));
const NAMES=[['A','Alice','Alpha'],['B','Bruno','Beta'],['C','Carla','Gamma'],['D','David','Delta'],['E','Elsa','Epsilon']];
const C=[];
IDS.forEach(el=>NAMES.forEach(([k,f,l])=>C.push({id:k+'-'+el,election_id:el,candidacy_status:'declared',second_round_status:null,second_round_qualified_at:null,...pb,people:{id:'p'+k+el,first_name:f,last_name:l,...pb},parties:null,
  elections:{id:el,name:'Scrutin fictif '+el,year:2027,scheduled_date:'2027-04-10',second_round_date:null,...pb},programs:[],candidacy_sources:[],candidacy_sponsorship_territories:[]})));
const set=(el,k,o)=>Object.assign(C.find(c=>c.id===k+'-'+el),o);
const RR=[];
const rr=(el,n,status,list)=>RR.push({id:'rr-'+el+n,election_id:el,round_number:n,held_on:n===1?'2027-04-10':'2027-04-24',result_status:status,registered_voters:null,voters:null,abstentions:null,blank_votes:null,null_votes:null,expressed_votes:null,source_id:null,sources:null,notes:null,...pb,
  election_candidate_results:list.map(([k,pc,flag])=>({id:'cr-'+el+n+k,round_result_id:'rr-'+el+n,entity_kind:'candidacy',candidacy_id:k+'-'+el,candidacies:C.find(c=>c.id===k+'-'+el),percent_expressed:pc,votes:Math.round(pc*1000),qualified_next_round:flag==='q',elected:flag==='e',...pb}))});
// p1 : A élu au tour 1 (définitif) puis réapparaît au tour 2 ; B battu au tour 1 puis réapparaît ; C battu au tour 1, absent du tour 2 (parcours normal)
rr('p1',1,'final',[['A',50,'e'],['B',30],['C',20]]); rr('p1',2,'final',[['A',48],['B',52,'e']]);
// p3 : le tour 2 désigne B élu ; A, élu au tour 1, y figure comme non élu (un « Battu » ultérieur ne doit PAS écraser la victoire antérieure)
rr('p3',1,'final',[['A',60,'e'],['B',40]]); rr('p3',2,'final',[['B',55,'e'],['A',45]]);
// p4 : parcours normaux : qualifié puis élu ; éliminé absent du tour suivant ; plusieurs élus au 1er tour d'une autre élection est couvert ailleurs
rr('p4',1,'final',[['A',34,'q'],['B',33,'q'],['C',33]]); rr('p4',2,'final',[['A',49],['B',51,'e']]);
// q1 : colonnes déclaratives vs résultats : A (status qualified) confirmé ; B (qualified_at) confirmé ; C (status qualified) NON confirmé ; D (not_reached) rien ; E qualifié par résultat sans déclaration
set('q1','A',{second_round_status:'qualified'}); set('q1','B',{second_round_qualified_at:'2027-04-11'}); set('q1','C',{second_round_status:'qualified'}); set('q1','D',{second_round_status:'not_reached'});
rr('q1',1,'final',[['A',25,'q'],['B',22,'q'],['E',20,'q'],['C',18],['D',15]]);
// Qualification acquise au tour 1 et second tour PROVISOIRE (ou sans conclusion pour le candidat) : elle ne disparaît pas.
// p5 : r2 provisoire, B élu provisoire ; A figure au tour 2 sans issue -> A reste « Qualifié », B « Élu provisoire »
rr('p5',1,'final',[['A',30,'q'],['B',28,'q'],['C',22],['D',20]]); rr('p5',2,'provisional',[['A',49],['B',51,'e']]);
// p6 : r2 provisoire sans aucune issue renseignée -> A et B restent « Qualifié »
rr('p6',1,'final',[['A',30,'q'],['B',28,'q'],['C',42]]); rr('p6',2,'provisional',[['A',50],['B',50]]);
// p7 : trois tours : A qualifié au tour 2 (définitif) puis tour 3 provisoire sans issue -> « Qualifié pour le tour 3 » ; B qualifié au 1, éliminé au 2 (définitif)
rr('p7',1,'final',[['A',30,'q'],['B',28,'q'],['C',42]]); rr('p7',2,'final',[['A',55,'q'],['B',45]]); rr('p7',3,'provisional',[['A',52]]);
// p8 : tour 2 DÉFINITIF mais sans élu ni qualifié renseignés : pas de conclusion, la qualification n'est pas perdue
rr('p8',1,'final',[['A',30,'q'],['B',28,'q'],['C',42]]); rr('p8',2,'final',[['A',50],['B',50]]);
// p9 : tour 2 définitif avec un élu : le non-élu n'est plus qualifié, il est « Battu » (un résultat définitif ultérieur remplace)
rr('p9',1,'final',[['A',30,'q'],['B',28,'q'],['C',42]]); rr('p9',2,'final',[['A',45],['B',55,'e']]);
const D={elections:ELS,candidacies:C,programs:[],poll_snapshots:[],election_round_results:RR};
async function page(w,url,fn,theme){
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:w,height:900}}); const errs=[];
  await c.clock.setFixedTime(new Date('2027-04-26T10:00:00Z'));
  await c.addInitScript(t=>{try{localStorage.setItem('ar.theme',t)}catch(e){}},theme||'light');
  await c.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await c.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range'};
    let rows=D[t]||[];rows=rows.filter(x=>{for(const [k,v] of u.searchParams){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    h['content-range']=`0-0/${rows.length}`;r.fulfill({status:200,headers:h,body:JSON.stringify(rows)})});
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+url,{waitUntil:'networkidle'});await p.waitForTimeout(500);
  await fn(p); rep(!errs.length,`  ${w}px ${url} : aucune erreur JS`,errs); await b.close();
}
const card=async p=>{await p.waitForSelector('#f-body,.cand-id',{timeout:4000}).catch(()=>{});await p.waitForTimeout(300);return p.evaluate(()=>{const c=document.querySelector('.status-card');return {has:!!c,t:c?c.innerText:''}})};
const list=async p=>{await p.waitForSelector('.cand',{timeout:4000});return p.locator('.cand').evaluateAll(a=>a.map(x=>({t:x.innerText,badge:(x.querySelector('.statut')||{}).innerText||''})))};
const OUT=/Élu|Qualifié|Éliminé|Battu/i;
(async()=>{
 for(const [w,th] of [[1280,'light'],[400,'dark']]){
  const T=`${th} ${w}px`;
  // élu au tour 1 puis réapparu : aucun statut d'issue, les deux scores restent visibles
  await page(w,'candidat.html#A-p1',async p=>{const c=await card(p);rep(c.has&&!OUT.test(c.t)&&/50,0 %/.test(c.t)&&/48,0 %/.test(c.t)&&/Premier tour/.test(c.t)&&/Second tour/.test(c.t),`${T} élu au tour 1 puis présent au tour 2 : aucune issue affichée, scores des deux tours conservés`,c.t);},th);
  await page(w,'candidat.html#B-p1',async p=>{const c=await card(p);rep(c.has&&!OUT.test(c.t),`${T} battu au tour 1 puis réapparu : le statut « Élu » du tour 2 ne s'affiche pas (parcours contradictoire)`,c.t);},th);
  await page(w,'candidat.html#C-p1',async p=>{const c=await card(p);rep(c.has&&/Battu/.test(c.t)&&!/Élu/.test(c.t),`${T} battu au tour 1, absent du tour 2 : parcours normal, « Battu » affiché`,c.t);},th);
  // un statut ultérieur n'écrase pas une victoire antérieure
  await page(w,'candidat.html#A-p3',async p=>{const c=await card(p);rep(c.has&&!/Battu/.test(c.t)&&!/Élu/.test(c.t)&&/60,0 %/.test(c.t)&&/45,0 %/.test(c.t),`${T} élu au tour 1 puis « non élu » au tour 2 : « Battu » n'écrase pas la victoire (aucune issue), scores conservés`,c.t);},th);
  await page(w,'candidats.html?e=p1',async p=>{const l=await list(p);const g=k=>l.find(x=>x.t.includes(k)).badge;rep(g('Alice')===''&&g('Bruno')===''&&/^Battu$/i.test(g('Carla')),`${T} liste : mêmes verdicts que la fiche (A et B neutres, C battu)`,l.map(x=>x.badge));},th);
  await page(w,'candidats.html?e=p3',async p=>{const l=await list(p);rep(l.every(x=>!OUT.test(x.badge)),`${T} liste p3 : aucune issue contradictoire`,l.map(x=>x.badge));},th);
  await page(w,'election.html?e=p3',async p=>{
    const tagsAt=async()=>p.locator('.res-tag').allInnerTexts();
    const t2=await tagsAt(); await p.locator('.res-tab').first().click(); const t1=await tagsAt();
    rep(t2.length===0&&t1.length===0&&await p.locator('.res-tab').count()===2,`${T} rubrique résultats : aucune pastille Élu/Battu contradictoire sur les deux tours, les deux onglets restent consultables`,{t1,t2});},th);
  // parcours normaux inchangés
  await page(w,'candidat.html#B-p4',async p=>{const c=await card(p);rep(c.has&&/Élu/.test(c.t)&&/Premier tour/.test(c.t)&&/Second tour/.test(c.t),`${T} qualifié puis élu : « Élu », parcours complet`,c.t);},th);
  await page(w,'candidat.html#A-p4',async p=>{const c=await card(p);rep(c.has&&!OUT.test(c.t.replace(/Battu/,'')) ,`${T} qualifié puis non élu au tour 2 : pas de « Qualifié » périmé`,c.t);},th);
  await page(w,'candidat.html#C-p4',async p=>{const c=await card(p);rep(c.has&&/Éliminé au premier tour/.test(c.t),`${T} éliminé au tour 1, absent du tour 2 : « Éliminé »`,c.t);},th);
  // qualification conservée pendant un second tour provisoire, et autres transitions
  await page(w,'candidat.html#A-p5',async p=>{const c=await card(p);rep(c.has&&/Qualifié pour le second tour/.test(c.t)&&/provisoires/.test(c.t)&&!/Battu|Éliminé|Élu/.test(c.t)&&/30,0 %/.test(c.t)&&/49,0 %/.test(c.t),`${T} qualifié au tour 1, second tour provisoire (adversaire élu provisoire) : « Qualifié » conservé, mention provisoire, scores des deux tours`,c.t);},th);
  await page(w,'candidat.html#B-p5',async p=>{const c=await card(p);rep(c.has&&/Élu provisoire/.test(c.t)&&!/Qualifié/.test(c.t),`${T} qualifié au tour 1 puis élu provisoire au tour 2 : « Élu provisoire » (progression, pas une perte)`,c.t);},th);
  await page(w,'candidat.html#A-p6',async p=>{const c=await card(p);rep(c.has&&/Qualifié pour le second tour/.test(c.t)&&/provisoires/.test(c.t)&&!/Battu|Éliminé|Élu/.test(c.t),`${T} qualifié au tour 1, second tour provisoire sans aucune issue : « Qualifié » conservé`,c.t);},th);
  await page(w,'candidats.html?e=p6',async p=>{const l=await list(p);const g=k=>l.find(x=>x.t.includes(k)).badge;rep(/Qualifié/i.test(g('Alice'))&&/Qualifié/i.test(g('Bruno'))&&!OUT.test(g('Carla').replace(/Battu|Éliminé/i,'')),`${T} liste p6 : mêmes qualifications que la fiche`,l.map(x=>x.badge));},th);
  await page(w,'candidats.html?e=p5',async p=>{const l=await list(p);const g=k=>l.find(x=>x.t.includes(k)).badge;rep(/Qualifié/i.test(g('Alice'))&&/Élu provisoire/i.test(g('Bruno')),`${T} liste p5 : A qualifié, B élu provisoire`,l.map(x=>x.badge));},th);
  await page(w,'candidat.html#A-p7',async p=>{const c=await card(p);rep(c.has&&/Qualifié pour le tour 3/.test(c.t)&&!/tour 4|Battu|Éliminé/.test(c.t),`${T} 3 tours : qualifié au tour 2 (définitif), tour 3 provisoire : « Qualifié pour le tour 3 » conservé`,c.t);},th);
  await page(w,'candidat.html#B-p7',async p=>{const c=await card(p);rep(c.has&&/Éliminé au second tour/.test(c.t)&&!/Qualifié/.test(c.t),`${T} 3 tours : qualifié au 1, éliminé au 2 (définitif) : « Éliminé » remplace la qualification`,c.t);},th);
  await page(w,'candidat.html#A-p8',async p=>{const c=await card(p);rep(c.has&&/Qualifié pour le second tour/.test(c.t)&&!/Battu|Éliminé/.test(c.t),`${T} tour 2 définitif sans issue renseignée : absence de conclusion, qualification conservée`,c.t);},th);
  await page(w,'candidat.html#A-p9',async p=>{const c=await card(p);rep(c.has&&/Battu/.test(c.t)&&!/Qualifié/.test(c.t),`${T} tour 2 définitif avec un élu : « Battu » remplace la qualification`,c.t);},th);
  await page(w,'candidat.html#B-p9',async p=>{const c=await card(p);rep(c.has&&/Élu/.test(c.t)&&!/provisoire/.test(c.t),`${T} tour 2 définitif : « Élu » ferme`,c.t);},th);
  await page(w,'election.html?e=p5',async p=>{const first=await p.evaluate(()=>0);await p.locator('.res-tab').first().click();const t1=await p.locator('.res-tag').allInnerTexts();
    rep(t1.filter(x=>/Qualifié pour le second tour/.test(x)).length===2,`${T} rubrique résultats p5, onglet tour 1 : les deux qualifications restent affichées`,t1);},th);
  // colonnes déclaratives : aucune qualification affichée d'après elles seules
  for(const k of ['C','D']) await page(w,`candidat.html#${k}-q1`,async p=>{const c=await card(p);rep(!/Qualifié/.test(c.t),`${T} q1 ${k} : colonne déclarative sans résultat confirmant : aucune qualification`,c.t);},th);
  await page(w,'candidat.html#A-q1',async p=>{const c=await card(p);rep(/Qualifié pour le second tour/.test(c.t),`${T} q1 A : qualification affichée parce que le RÉSULTAT la confirme`,c.t);},th);
  await page(w,'candidats.html?e=q1',async p=>{const l=await list(p);const g=k=>l.find(x=>x.t.includes(k)).badge;rep(/Qualifié/i.test(g('Alice'))&&/Qualifié/i.test(g('Elsa'))&&!/Qualifié/i.test(g('Carla'))&&!/Qualifié/i.test(g('David')),`${T} liste q1 : qualifications issues des résultats seulement (Elsa sans déclaration : oui ; Carla déclarée sans résultat : non)`,l.map(x=>x.badge));},th);
 }
 // audit (unités + diagnostic)
 await page(1280,'election.html?e=q1',async p=>{const r=await p.evaluate(async()=>{const c=await DB.candidacies('q1');const res=await DB.results('q1');const a=Scrutin.qualificationAudit(c,res);return {confirmed:a.confirmed.sort(),unconfirmed:a.unconfirmed,undeclared:a.undeclared}});
  rep(JSON.stringify(r)===JSON.stringify({confirmed:['A-q1','B-q1'],unconfirmed:['C-q1'],undeclared:['E-q1']}),'audit : A et B confirmés, C déclarée sans résultat, E résultat sans déclaration, D (not_reached) ignoré',r);});
 await page(1280,'diagnostic.html',async p=>{await p.waitForFunction(()=>/Qualifications/i.test(document.body.innerText),null,{timeout:8000}).catch(()=>{});const t=await p.evaluate(()=>document.body.innerText);
  rep(/Qualifications/i.test(t)&&/2 confirmée\(s\)/.test(t)&&/1 déclarée\(s\) sans résultat confirmant/.test(t)&&/3 résultat\(s\) sans déclaration/.test(t),'diagnostic : rapprochement des colonnes déclaratives et des résultats (3 déclarées : 2 confirmées, 1 non ; 3 qualifiés par résultat sans déclaration : E de q1 et A, B de p4)',(t.match(/Qualifications[\s\S]{0,400}/)||[])[0]);});
 console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
