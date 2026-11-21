/* Test du bloc « Dernier(s) sondage(s) » : Espagne, Italie, France, égalités et départages. Playwright, Supabase simulé. Serveur statique sur 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0; const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const pb={publication_status:'published'};
const mkEl=(id,name,iso,cn)=>({id,name,year:2027,election_type:'general',scheduled_date:'2027-06-10',...pb,country_id:iso,description:null,countries:{id:iso,name:cn,iso2:iso.toUpperCase(),...pb}});
const ELS=[mkEl('es','Élections générales 2027','es','Espagne'),mkEl('it','Élections générales 2027','it','Italie'),mkEl('fr','Présidentielle 2027','fr','France'),mkEl('xx','Sans sondage','xx','Autre'),mkEl('d1','Départage publication','d1','D1'),mkEl('d2','Départage terrain','d2','D2'),mkEl('d3','Publication prime sur terrain','d3','D3')];
const src=(id,t,pub)=>({id,title:t,url:'https://example.org/'+id,publisher:pub,...pb});
const person=n=>({id:'p'+n,first_name:'Cand',last_name:'N'+n,...pb});
const prow=(el,id,o)=>({id,election_id:el,snapshot_date:'2026-11-15',record_kind:'poll',poll_date:'2026-11-12',fieldwork_start:'2026-11-10',pollster:'Inst',entity_kind:'party',scenario:'Scénario A',methodology:null,notes:null,sample_size:1500,...pb,sources:null,...o});
const D={elections:ELS,candidacies:[],programs:[],poll_snapshots:[]};
const S=D.poll_snapshots;
// Espagne : deux sondages, le plus récent (CIS, 14 nov) doit seul apparaître ; Ipsos plus ancien
const sEs=src('es1','Barómetro CIS novembre 2026','CIS'), sEs0=src('es0','Encuesta Ipsos octobre','Ipsos');
[['PP',32],['PSOE',27],['Vox',14],['Sumar',9],['Podemos',5]].forEach(([n,v],i)=>S.push(prow('es','es-n'+i,{pollster:'CIS',poll_date:'2026-11-14',fieldwork_start:'2026-11-03',sample_size:4000,scenario:'Intention directe de vote',value_percent:v,parties:{id:'pa'+n,name:n,acronym:n,...pb},party_id:'pa'+n,sources:sEs})));
[['PP',99],['PSOE',98]].forEach(([n,v],i)=>S.push(prow('es','es-o'+i,{pollster:'Ipsos',poll_date:'2026-10-02',value_percent:v,parties:{id:'pa'+n,name:n,acronym:n,...pb},party_id:'pa'+n,sources:sEs0})));
// Italie : libellés libres (entity_kind other) + parti ; sondage unique ; commanditaire dans la méthodologie
const sIt=src('it1','Sondaggio SWG 9 novembre','SWG');
[['Fratelli d’Italia',29],['Partito Democratico',22],['Futuro Nazionale',3]].forEach(([n,v],i)=>S.push(prow('it','it'+i,{pollster:'SWG',poll_date:'2026-11-09',fieldwork_start:'2026-11-04',sample_size:1200,entity_kind:'other',entity_label:n,value_percent:v,scenario:'Voto di lista',methodology:'Sondage SWG pour La7, interviews en ligne',sources:sIt})));
// France : deux sondages le même jour (deux instituts) : un seul doit être présenté, sans mélange
const sFa={...src('fr1','Notice 10371','Commission des sondages'),publication_date:'2026-11-13'}, sFb={...src('fr2','Notice Ifop','Commission des sondages'),publication_date:'2026-11-13'};
for(let i=0;i<6;i++)S.push(prow('fr','fa'+i,{pollster:'OpinionWay pour CNews',poll_date:'2026-11-12',value_percent:5+i*3,candidacy_id:'c'+i,entity_kind:'candidacy',candidacies:{id:'c'+i,candidacy_status:'declared',...pb,people:person(i),parties:null},scenario:'Hypothèse 1 — avec Teddy Riner',sources:sFa}));
for(let i=0;i<3;i++)S.push(prow('fr','fb'+i,{pollster:'Ifop',poll_date:'2026-11-12',value_percent:40-i,candidacy_id:'c'+i,entity_kind:'candidacy',candidacies:{id:'c'+i,candidacy_status:'declared',...pb,people:person(i),parties:null},scenario:'Hypothèse 1 — avec Teddy Riner',sources:sFb}));
const mkPoll=(el,tag,pollster,pub,end,vals)=>{const sc={...src(el+tag,'Notice '+pollster,'Éditeur'),publication_date:pub};vals.forEach((v,i)=>S.push(prow(el,el+tag+i,{pollster,poll_date:end,value_percent:v,entity_kind:'other',entity_label:'L'+i,sources:sc})))};
mkPoll('d1','a','Alpha','2026-11-20','2026-11-10',[30,20]); mkPoll('d1','b','Beta','2026-11-18','2026-11-12',[41,22,3]);          // publication la plus récente l'emporte
mkPoll('d2','a','Alpha','2026-11-20','2026-11-10',[30,20]); mkPoll('d2','b','Beta','2026-11-20','2026-11-12',[41,22,3]);          // même publication : fin de terrain
mkPoll('d3','a','Alpha','2026-11-20','2026-11-01',[30,20]); mkPoll('d3','b','Beta','2026-11-15','2026-11-14',[41,22,3]);          // la publication prime sur la fin de terrain
// moyenne et brouillon à ignorer
S.push(prow('es','avg',{record_kind:'average',aggregation_note:'m',poll_date:'2026-11-15',value_percent:77,parties:{id:'paX',name:'MOY',...pb},party_id:'paX'}));
S.push(prow('es','drf',{publication_status:'draft',poll_date:'2026-11-15',value_percent:88,parties:{id:'paY',name:'BROUILLON',...pb},party_id:'paY'}));
async function page(w,url,fn,T,st){
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:w,height:900}}); const errs=[]; const data=T||D;
  await c.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range'};
    if(st&&st[t]==='abort')return r.abort('failed');
    if(st&&st[t])return r.fulfill({status:st[t],headers:h,body:JSON.stringify({message:'erreur simulée',code:st.code||''})});
    let rows=data[t]||[];rows=rows.filter(x=>{for(const [k,v] of u.searchParams){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    h['content-range']=`0-0/${rows.length}`;r.fulfill({status:200,headers:h,body:JSON.stringify(rows)})});
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+url,{waitUntil:'networkidle'});await p.waitForTimeout(400);
  await fn(p); rep(!errs.length,`  ${w}px ${url} : aucune erreur JS`,errs); await b.close();
}
const poll=p=>p.evaluate(()=>{const s=document.querySelector('.poll');if(!s)return null;return {names:[...s.querySelectorAll('.bar-n')].map(x=>x.innerText.trim()),vals:[...s.querySelectorAll('.bar-v')].map(x=>x.innerText.trim()),txt:s.innerText,links:[...s.querySelectorAll('a')].map(a=>a.href),n:document.querySelectorAll('.poll').length,head:[...document.querySelectorAll('.ov-h')].map(h=>h.innerText)}});
(async()=>{
 for(const w of [1280,400]){
  await page(w,'election.html?e=es',async p=>{const r=await poll(p);
    rep(r&&r.n===1,`${w}px Espagne : un seul bloc sondage`);
    rep(r&&JSON.stringify(r.vals)===JSON.stringify(['32,0 %','27,0 %','14,0 %','9,0 %','5,0 %']),`${w}px Espagne : 5 résultats du sondage CIS, décroissants`,r&&r.vals);
    rep(r&&!/99|98|77|88|MOY|BROUILLON|Ipsos/.test(r.txt),`${w}px Espagne : ni ancien sondage, ni moyenne, ni brouillon`);
    rep(r&&/CIS/.test(r.txt)&&/3 au 14 novembre 2026/.test(r.txt)&&/4\s?000/.test(r.txt),`${w}px Espagne : institut, terrain, échantillon`,r&&r.txt);
    rep(r&&r.links.includes('https://example.org/es1')&&/Barómetro CIS novembre 2026/.test(r.txt),`${w}px Espagne : source exacte cliquable`);
    rep(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${w}px Espagne : pas de débordement horizontal`);});
  await page(w,'election.html?e=it',async p=>{const r=await poll(p);
    rep(r&&r.names.join('|')==='Fratelli d’Italia|Partito Democratico|Futuro Nazionale'&&r.vals[0]==='29,0 %'&&r.vals[2]==='3,0 %',`${w}px Italie : libellés libres, ordre décroissant`,r);
    rep(r&&/commanditaire\s*La7/i.test(r.txt)&&/4 au 9 novembre 2026/.test(r.txt),`${w}px Italie : commanditaire connu et terrain`,r&&r.txt);});
  await page(w,'election.html?e=fr',async p=>{
    /* Sélecteur : un seul sondage à la fois, chacun indépendant ; l'égalité parfaite reste départagée de façon déterministe. */
    const snap=async()=>p.locator('.poll').evaluate(x=>({t:x.innerText,v:x.querySelectorAll('.bar-v').length,links:[...x.querySelectorAll('a')].map(a=>a.href)}));
    const a=await snap(), n=await p.locator('.poll').count();
    rep(n===1&&/Sondages/.test(await p.evaluate(()=>document.body.innerText))&&await p.locator('[data-ps=select] option').count()===2,`${w}px France : un seul sondage affiché, deux disponibles dans le sélecteur`,n);
    const first=/Ifop/.test(a.t)?'Ifop':'OpinionWay';
    rep(!(/Ifop/.test(a.t)&&/OpinionWay/.test(a.t)),`${w}px France : aucun mélange entre instituts`);
    await p.locator('[data-ps=older]').click();
    const b=await snap(), second=/Ifop/.test(b.t)?'Ifop':'OpinionWay';
    rep(first!==second&&!(/Ifop/.test(b.t)&&/OpinionWay/.test(b.t)),`${w}px France : la flèche affiche l’autre sondage, sans mélange`);
    rep(JSON.stringify([a.v,b.v].sort())===JSON.stringify([3,6]),`${w}px France : chaque sondage garde tous ses résultats (3 et 6)`,[a.v,b.v]);
    rep([a,b].every(x=>/fr[12]|Notice/.test(x.t+x.links.join())),`${w}px France : chaque sondage a sa source`);});
  await page(w,'election.html?e=d1',async p=>{const r=await poll(p);rep(r.n===1&&/Alpha/.test(r.txt)&&!/Beta/.test(r.txt),`${w}px départage : publication la plus récente (Alpha)`,r.txt);});
  await page(w,'election.html?e=d2',async p=>{const r=await poll(p);rep(r.n===1&&/Beta/.test(r.txt)&&!/Alpha/.test(r.txt),`${w}px départage : même publication -> fin de terrain la plus récente (Beta)`,r.txt);});
  await page(w,'election.html?e=d3',async p=>{const r=await poll(p);rep(r.n===1&&/Alpha/.test(r.txt)&&!/Beta/.test(r.txt),`${w}px départage : la publication prime sur la fin de terrain (Alpha)`,r.txt);});
  await page(w,'election.html?e=xx',async p=>{const x=await p.evaluate(()=>document.body.innerText);rep(!/Aucun sondage|Sondages/.test(x)&&!(await p.locator('.bars,.pollsel').count()),`${w}px élection sans sondage : aucun bloc, aucun titre, aucun message de remplacement (page intacte)`);});
 }
 const seen=new Set(); for(let i=0;i<5;i++){await page(1280,'election.html?e=fr',async p=>{seen.add((await p.locator('.poll').evaluateAll(a=>a.map(x=>/Ifop/.test(x.innerText)?'I':'O'))).join())})}
 rep(seen.size===1,'égalité : ordre d’affichage identique sur 5 chargements',[...seen]);
 // 11) erreurs techniques : jamais présentées comme « aucun sondage »
 const cases=[[403,'denied',/pas accessibles/,'42501','permission refusée (403)'],[404,'missing',/structure de données attendue est indisponible/,'','relation absente (404)'],[400,'invalid',/structure de données attendue est indisponible/,'PGRST200','schéma / relation invalide (400)'],[500,'server',/n’ont pas pu être chargés/,'','erreur serveur (500)'],['abort','network',/n’ont pas pu être chargés/,'','erreur réseau']];
 for(const w of [1280,400]) for(const [code,cls,re,pg,label] of cases){
  await page(w,'election.html?e=es',async p=>{
   const x=await p.evaluate(()=>document.body.innerText), el=p.locator('[data-poll-error]');
   rep(await el.count()===1&&await el.getAttribute('data-poll-error')===cls&&re.test(x),`${w}px ${label} : message d’erreur « ${cls} »`,x.slice(0,200));
   rep(!/Aucun sondage publié/.test(x)&&await p.locator('.bars').count()===0,`${w}px ${label} : pas de « aucun sondage », pas de graphique`);
   rep(/Calendrier|Candidats|élection/i.test(x)&&(await p.locator('h1').count())>=1,`${w}px ${label} : le reste de la page reste affiché`);
  },null,{poll_snapshots:code,code:pg});
 }
 await page(1280,'election.html?e=xx',async p=>{const x=await p.evaluate(()=>document.body.innerText);rep(!/Aucun sondage/.test(x)&&await p.locator('[data-poll-error]').count()===0,'absence réelle : rien n’est affiché (ni bloc, ni message), et aucun message d’erreur');});
 await page(1280,'election.html?e=es',async p=>{rep(await p.locator('[data-poll-error]').count()===0&&await p.locator('.poll').count()===1,'aucune erreur : sondage affiché normalement');});
 console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
