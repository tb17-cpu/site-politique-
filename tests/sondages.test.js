/* Test du bloc « Dernier sondage » (Espagne, Italie, France). Playwright, Supabase simulé. Serveur statique sur 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0; const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const pb={publication_status:'published'};
const mkEl=(id,name,iso,cn)=>({id,name,year:2027,election_type:'general',scheduled_date:'2027-06-10',...pb,country_id:iso,description:null,countries:{id:iso,name:cn,iso2:iso.toUpperCase(),...pb}});
const ELS=[mkEl('es','Élections générales 2027','es','Espagne'),mkEl('it','Élections générales 2027','it','Italie'),mkEl('fr','Présidentielle 2027','fr','France'),mkEl('xx','Sans sondage','xx','Autre')];
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
const sFa=src('fr1','Notice 10371','Commission des sondages'), sFb=src('fr2','Notice Ifop','Commission des sondages');
for(let i=0;i<6;i++)S.push(prow('fr','fa'+i,{pollster:'OpinionWay pour CNews',poll_date:'2026-11-12',value_percent:5+i*3,candidacy_id:'c'+i,entity_kind:'candidacy',candidacies:{id:'c'+i,candidacy_status:'declared',...pb,people:person(i),parties:null},scenario:'Hypothèse 1 — avec Teddy Riner',sources:sFa}));
for(let i=0;i<3;i++)S.push(prow('fr','fb'+i,{pollster:'Ifop',poll_date:'2026-11-12',value_percent:40-i,candidacy_id:'c'+i,entity_kind:'candidacy',candidacies:{id:'c'+i,candidacy_status:'declared',...pb,people:person(i),parties:null},scenario:'Hypothèse 1 — avec Teddy Riner',sources:sFb}));
// moyenne et brouillon à ignorer
S.push(prow('es','avg',{record_kind:'average',aggregation_note:'m',poll_date:'2026-11-15',value_percent:77,parties:{id:'paX',name:'MOY',...pb},party_id:'paX'}));
S.push(prow('es','drf',{publication_status:'draft',poll_date:'2026-11-15',value_percent:88,parties:{id:'paY',name:'BROUILLON',...pb},party_id:'paY'}));
async function page(w,url,fn,T){
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:w,height:900}}); const errs=[]; const data=T||D;
  await c.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range'};
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
  await page(w,'election.html?e=fr',async p=>{const r=await poll(p);
    const o=/Ifop/.test(r.txt), q=/OpinionWay/.test(r.txt);
    rep(r.n===1&&(o!==q),`${w}px France : un seul institut affiché (pas de mélange)`,r.txt);
    rep(r.vals.length===(o?3:6),`${w}px France : tous les résultats du même sondage seulement (${r.vals.length})`);
    rep(r.links.length===1&&((o&&/fr2/.test(r.links[0]))||(q&&/fr1/.test(r.links[0]))),`${w}px France : la source correspond au sondage affiché`,r.links);});
  await page(w,'election.html?e=xx',async p=>{const x=await p.evaluate(()=>document.body.innerText);rep(/Aucun sondage publié pour cette élection/.test(x)&&!(await p.locator('.bars').count()),`${w}px élection sans sondage : mention sobre, page intacte`);});
 }
 // la sélection est stable : même résultat sur 5 chargements (égalité France)
 const seen=new Set(); for(let i=0;i<5;i++){await page(1280,'election.html?e=fr',async p=>{seen.add((await poll(p)).names.join())})}
 rep(seen.size===1,'France (égalité de date) : sélection déterministe sur 5 chargements',[...seen]);
 console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
