/* Test du sélecteur de sondages, de la rubrique résultats et de la carte de statut évolutive (intentions → résultats par tour).
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES. Serveur statique sur 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0; const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const pb={publication_status:'published'};
const mkEl=(id,extra)=>({id,name:'Présidentielle fictive '+id,year:2027,election_type:'presidential',scheduled_date:'2027-04-10',second_round_date:'2027-04-24',...pb,country_id:'fr',description:null,countries:{id:'fr',name:'France',iso2:'FR',...pb},...extra});
const ELS=['e1','e2','e3','e4','e5','e6','e7','e8','e9','e10'].map(id=>mkEl(id));
ELS[3].second_round_date=null; // e4 : scrutin à un seul tour
const per=(id,fn,ln)=>({id:'p'+id,first_name:fn,last_name:ln,...pb});
const cand=(id,el,fn,ln,st='declared')=>({id,election_id:el,candidacy_status:st,...pb,people:per(id,fn,ln),parties:null,elections:{id:el,name:'Présidentielle fictive '+el,year:2027,scheduled_date:'2027-04-10',second_round_date:'2027-04-24',...pb},programs:[],candidacy_sources:[],candidacy_sponsorship_territories:[]});
const C=[];['e1','e2','e3','e4','e5','e6','e7','e8','e9','e10'].forEach(el=>[['A','Alice','Alpha'],['B','Bruno','Beta'],['C','Carla','Gamma'],['D','David','Delta']].forEach(([k,f,l])=>C.push(cand(k+'-'+el,el,f,l))));
const setSt=(el,k,st)=>{C.find(c=>c.id===k+'-'+el).candidacy_status=st};
['e8','e9','e10'].forEach(el=>{setSt(el,'A','eliminated');setSt(el,'B','defeated')}); setSt('e9','D','eliminated');
const src=(id,pub)=>({id,title:'Notice '+id,url:'https://example.org/'+id,publisher:'Commission',publication_date:pub,...pb});
const S=[];
const poll=(el,tag,pollster,pub,end,scen,vals,start,round)=>{const so=src(el+tag,pub);vals.forEach(([k,v],i)=>S.push({id:el+tag+i,election_id:el,snapshot_date:pub,record_kind:'poll',poll_date:end,fieldwork_start:start||end,pollster,entity_kind:'candidacy',candidacy_id:k+'-'+el,candidacies:C.find(c=>c.id===k+'-'+el),scenario:scen,round:round==null?null:round,methodology:'Méthode '+pollster,notes:null,sample_size:1000+i,value_percent:v,...pb,sources:so}))};
// e1 : avant le 1er tour. A : deux instituts proches (moyenne 29), B : un seul sondage, C : sondage ancien de 3 mois (hors moyenne), D : aucun sondage exploitable.
poll('e1','a','Ifop','2026-11-12','2026-11-10','Premier tour, hypothèse 1',[['A',28],['B',20],['C',9]],null,1);
poll('e1','b','OpinionWay','2026-11-08','2026-11-05','Premier tour, hypothèse 1',[['A',30],['B',18],['C',8]],null,1);
poll('e1','c','Elabe','2026-08-01','2026-07-30','Premier tour, hypothèse 1',[['A',25],['B',15],['C',12]],null,1);
poll('e1','d','Odoxa','2026-11-14','2026-11-13','Second tour : Alpha face à Beta',[['A',47],['B',53]],null,2);   // second tour : jamais utilisé avant le 1er tour
poll('e1','e','Harris','2026-11-15','2026-11-14','Premier tour (le texte ne compte pas)',[['D',44],['A',56]]);   // round NULL : ignoré, même si le texte dit « premier tour »
poll('e5','a','Ifop','2026-11-12','2026-11-10','Premier tour',[['A',30],['B',20],['C',10]],null,1); // e5 : un seul sondage
// e3 / e8 : sondages de 2nd tour récents pour des candidats battus ou éliminés (ne doivent jamais coexister avec « Battu » / « Éliminé »)
poll('e3','z','Ifop','2027-04-20','2027-04-19','Second tour : Alpha face à Beta',[['A',46],['B',54]],null,2);
poll('e8','z','Ifop','2027-04-05','2027-04-04','Premier tour',[['A',20],['B',25],['C',15],['D',30]],null,1);
// e9 : aucun résultat, statuts bruts « éliminé » / « battu » + sondages récents ; e10 : résultats provisoires
poll('e9','a','Ifop','2026-11-12','2026-11-10','Premier tour',[['A',12],['B',14],['C',20]],null,1);
// e2 : après le 1er tour (résultats provisoires), sondage de 2nd tour pour les qualifiés A et B
poll('e2','a','Ifop','2027-04-15','2027-04-14','Second tour : Alpha face à Beta',[['A',47],['B',53]],null,2);
poll('e2','b','Ifop','2027-04-01','2027-04-01','Premier tour',[['A',27],['B',21],['C',15]],null,1);
// e7 : règles de comparabilité (même tour, mêmes candidats, même scénario, un institut une fois, fenêtre de 21 jours, round explicite)
const H1='Premier tour H1';
poll('e7','1','Ifop','2026-11-12','2026-11-10',H1,[['A',30],['B',20],['C',10]],null,1);
poll('e7','2','Elabe','2026-11-10','2026-11-08',H1,[['A',26],['B',22],['C',12]],null,1);
poll('e7','3','Harris','2026-11-11','2026-11-09','  premier TOUR  h1 ',[['A',28],['B',21],['C',11]],null,1);   // casse/espaces : comparable
poll('e7','4','Odoxa','2026-11-11','2026-11-09','Premier tour H2',[['A',40],['B',10],['C',5]],null,1);        // autre scénario : exclu
poll('e7','5','Ipsos','2026-11-11','2026-11-09',H1,[['A',50],['B',10]],null,1);                             // autres candidats : exclu
poll('e7','6','Ifop pour Le Monde','2026-11-03','2026-11-01',H1,[['A',10],['B',10],['C',10]],null,1);      // même institut : compté une fois (le plus récent)
poll('e7','7','BVA','2026-10-03','2026-10-01',H1,[['A',40],['B',5],['C',5]],null,1);                        // hors fenêtre de 21 jours
poll('e7','8','Cluster','2026-11-12','2026-11-10',H1,[['A',90],['B',5],['C',5]]);                           // round NULL : ignoré
poll('e7','9','Yougov','2026-11-12','2026-11-10','Second tour',[['A',99],['B',1],['C',0.5]],null,2);        // autre tour : ignoré
const rr=(el,n,o,list)=>({id:'rr-'+el+n,election_id:el,round_number:n,held_on:n===1?'2027-04-10':'2027-04-24',result_status:'final',registered_voters:48000000,voters:36000000,abstentions:12000000,blank_votes:600000,null_votes:200000,expressed_votes:35200000,source_id:null,sources:src('res'+el+n,'2027-04-25'),notes:null,...pb,...o,
  election_candidate_results:list.map(([k,pc,votes,q,elu],i)=>({id:'cr-'+el+n+i,round_result_id:'rr-'+el+n,entity_kind:'candidacy',candidacy_id:k+'-'+el,candidacies:C.find(c=>c.id===k+'-'+el),percent_expressed:pc,votes,qualified_next_round:!!q,elected:!!elu,...pb}))});
const RR=[
 rr('e2',1,{result_status:'provisional'},[['A',28.5,10032000,1],['B',22.1,7779200,1],['C',15.0,5280000],['D',9.4,3308800]]),
 rr('e3',1,{},[['A',28.5,10032000,1],['B',22.1,7779200,1],['C',15.0,5280000],['D',9.4,3308800]]),
 rr('e3',2,{},[['A',47.2,16614400],['B',52.8,18585600,0,1]]),
 rr('e4',1,{},[['A',41.0,14432000],['B',33.0,11616000],['C',26.0,9152000]]),
 rr('e8',1,{},[['D',30,10000,1],['B',25,8000,1],['A',20,6000],['C',15,4500]]),   // définitif, qualifications saisies
 rr('e10',1,{result_status:'provisional'},[['D',30,10000,1],['B',25,8000,1],['A',20,6000],['C',15,4500]]),
 rr('e6',1,{},[['A',30,10000,1],['B',25,8000,0,1],['C',20,6000]]),   // incohérent : un élu ET un qualifié au même tour
];
const D={elections:ELS,candidacies:C,programs:[],poll_snapshots:S,election_round_results:RR};
async function page(w,url,fn,st,theme,clock){
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:w,height:900}}); const errs=[];
  await c.clock.setFixedTime(new Date(clock||(/e(2|3|4|6|8|10)\b/.test(url)?'2027-04-26T10:00:00Z':'2026-11-21T10:00:00Z')));
  if(theme)await c.addInitScript(t=>{try{localStorage.setItem('ar.theme',t)}catch(e){}},theme);
  await c.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range'};
    if(st&&st[t]===404)return r.fulfill({status:404,headers:h,body:JSON.stringify({message:'relation "public.'+t+'" does not exist',code:'42P01'})});
    if(st&&st[t]==='abort')return r.abort('failed');
    let rows=D[t]||[];rows=rows.filter(x=>{for(const [k,v] of u.searchParams){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    h['content-range']=`0-0/${rows.length}`;r.fulfill({status:200,headers:h,body:JSON.stringify(rows)})});
  await c.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+url,{waitUntil:'networkidle'});await p.waitForTimeout(500);
  await fn(p); rep(!errs.length,`  ${w}px ${url} : aucune erreur JS`,errs); await b.close();
}
const card=async(p)=>{await p.waitForSelector('.status-card',{timeout:4000}).catch(()=>{});return p.evaluate(()=>{const c=document.querySelector('.status-card');return c?{t:c.innerText,lines:[...c.querySelectorAll('.sc-lines li')].map(l=>({k:l.className,t:l.innerText}))}:null})};
(async()=>{
 for(const w of [1280,400]){
  // ---- 9 : sélecteur de sondages (e1 : 5 sondages individuels) ----
  await page(w,'election.html?e=e1',async p=>{
    const n=await p.locator('[data-ps=select] option').count(), txt=()=>p.locator('[data-pollsel]').innerText();
    rep(n===5&&await p.locator('.poll').count()===1,`${w}px sélecteur : 5 sondages, un seul affiché`,n);
    const opts=await p.locator('[data-ps=select] option').allInnerTexts(), dates=opts.map(o=>o.split(' · ')[0]);
    rep(/Harris/.test(opts[0])&&/Elabe/.test(opts[4]),`${w}px sélecteur : du plus récent au plus ancien`,opts);
    rep(await p.locator('[data-ps=newer]').isDisabled()&&!await p.locator('[data-ps=older]').isDisabled(),`${w}px sélecteur : flèche « plus récent » inactive sur le plus récent`);
    const t0=await txt(); rep(/Harris/.test(t0)&&/Sondage 1 sur 5/.test(t0)&&/14 novembre 2026/.test(t0)&&/Tour non précisé/.test(t0),`${w}px sélecteur : institut, date et position`,t0.slice(0,200));
    await p.locator('[data-ps=older]').click(); const t1=await txt();
    const pn=await p.locator('.poll').innerText(), hd=await p.locator('[data-ps-head]').innerText();
    rep(/Odoxa/.test(hd)&&!/Harris/.test(hd+pn)&&/Sondage 2 sur 5/.test(t1)&&/Alice Alpha/.test(t1),`${w}px sélecteur : flèche -> sondage plus ancien, résultats mis à jour sans mélange`,t1.slice(0,200));
    rep(await p.locator('.poll .bar-v').allInnerTexts().then(v=>v.join()==='53,0 %,47,0 %'),`${w}px sélecteur : pourcentages du sondage affiché uniquement`);
    await p.locator('[data-ps=select]').selectOption({index:4}); const t4=await txt();
    rep(/Elabe/.test(t4)&&/Sondage 5 sur 5/.test(t4)&&await p.locator('[data-ps=older]').isDisabled()&&/Méthode Elabe/.test(t4),`${w}px sélecteur : choix direct, méthodologie propre au sondage`,t4.slice(0,200));
    await p.locator('[data-ps=newer]').click(); rep(/Sondage 4 sur 5/.test(await txt())&&/Ifop|OpinionWay/.test(await txt()),`${w}px sélecteur : retour vers le plus récent`);
    rep(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${w}px sélecteur : pas de débordement horizontal`);
    const bb=await p.locator('.ps-btn').first().boundingBox(); rep(bb.width>=44&&bb.height>=44,`${w}px sélecteur : flèches de 44 px minimum`,bb);
    rep(await p.locator('[data-results],.res').count()===0&&!/Résultats officiels/.test(await p.evaluate(()=>document.body.innerText)),`${w}px sans résultat : aucune rubrique, aucun titre, aucun emplacement réservé`);
  });
  // ---- 12 : rubrique résultats ----
  await page(w,'election.html?e=e3',async p=>{
    const tabs=await p.locator('.res-tab').allInnerTexts(), t=()=>p.locator('[data-results=ok]').innerText();
    rep(tabs.join('|')==='Premier tour|Second tour'&&await p.locator('.res-tab[aria-selected=true]').innerText()==='Second tour',`${w}px résultats : onglets par tour, dernier tour ouvert`,tabs);
    const t2=await t(); rep(/Résultats définitifs/.test(t2)&&/24 avril 2027/.test(t2)&&/52,8 %/.test(t2)&&/18\s?585\s?600 voix/.test(t2)&&/Élu/.test(t2),`${w}px résultats : % , voix, vainqueur, caractère définitif, date`,t2.slice(0,300));
    rep(/Inscrits/i.test(t2)&&/Abstentions/i.test(t2)&&/Bulletins blancs/i.test(t2)&&/Bulletins nuls/i.test(t2)&&/75,0 %/.test(t2),`${w}px résultats : participation, abstention, blancs, nuls`,t2);
    await p.locator('.res-tab').first().click(); const t1=await t();
    rep(/28,5 %/.test(t1)&&/Qualifié pour le second tour/.test(t1)&&!/Élu/.test(t1)&&/10\s?032\s?000 voix/.test(t1),`${w}px résultats : premier tour, qualifiés identifiés`,t1.slice(0,300));
    rep(await p.locator('.res').count()===1&&await p.locator('.pollsel').count()===1&&await p.locator('.res .pollsel, .pollsel .res').count()===0,`${w}px résultats : sondages et résultats présents, rubriques distinctes (aucune imbriquée)`);
    await p.locator('.res-tab').first().focus(); await p.keyboard.press('ArrowRight');
    rep(await p.locator('.res-tab[aria-selected=true]').innerText()==='Second tour'&&await p.evaluate(()=>document.activeElement.textContent)==='Second tour',`${w}px résultats : onglets utilisables au clavier (flèches)`);
    rep(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${w}px résultats : pas de débordement horizontal`);});
  await page(w,'election.html?e=e2',async p=>{const t=await p.locator('[data-results=ok]').innerText();
    rep(/Résultats provisoires/.test(t)&&await p.locator('.res-tab').count()===1&&!/Second tour/.test(t),`${w}px résultats provisoires : un seul tour, pas de second tour fictif`,t.slice(0,200));});
  await page(w,'election.html?e=e1',async p=>{rep(await p.locator('[data-results],.res').count()===0&&!/Résultats/.test(await p.evaluate(()=>document.querySelector('main, #p-body, body').innerText)),`${w}px table absente (404) : rien n'est affiché, sans erreur`);},{election_round_results:404});
  // ---- 10/11 : carte de statut ----
  await page(w,'candidat.html#A-e1',async p=>{const c=await card(p);
    rep(c&&/Candidat|Candidate|Déclar/i.test(c.t)&&c.lines.length===1&&/Intentions de vote au premier tour/.test(c.lines[0].t)&&/29 %/.test(c.lines[0].t)&&/moyenne de 2 sondages/.test(c.lines[0].t)&&/au 10 novembre 2026/.test(c.lines[0].t),`${w}px carte avant 1er tour : moyenne de sondages comparables, date de référence`,c);
    rep(c&&/Estimation d’après sondages/.test(c.lines[0].t)&&!/Résultat officiel/.test(c.t)&&!/second tour/i.test(c.lines[0].t.replace(/premier tour/ig,'')),`${w}px carte avant 1er tour : estimation signalée, aucun score ni 2nd tour`,c);});
  await page(w,'candidat.html#B-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/19 %/.test(c.lines[0].t)&&/moyenne de 2 sondages/.test(c.lines[0].t),`${w}px carte : moyenne des derniers sondages de chaque institut (20 et 18 -> 19)`,c);});
  await page(w,'candidat.html#C-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/8,5 %/.test(c.lines[0].t)&&/moyenne de 2 sondages/.test(c.lines[0].t),`${w}px carte : sondage ancien (3 mois) hors fenêtre, non mêlé (moyenne de 2 : 9 et 8 -> 8,5)`,c);});
  await page(w,'candidat.html#D-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===0,`${w}px carte : tour non renseigné (round NULL) ignoré, texte du scénario non interprété -> aucune valeur`,c);});
  await page(w,'candidat.html#A-e2',async p=>{const c=await card(p);
    rep(c&&/Qualifié pour le second tour/.test(c.t),`${w}px après 1er tour : statut actualisé (qualifié)`,c);
    const r=c&&c.lines.find(l=>/sc-result/.test(l.k)), s=c&&c.lines.find(l=>/sc-poll/.test(l.k));
    rep(r&&/Premier tour/.test(r.t)&&/28,5 %/.test(r.t)&&/10\s?032\s?000 voix/.test(r.t)&&/Résultat officiel/.test(r.t)&&/provisoires/.test(r.t),`${w}px après 1er tour : score réel, voix, caractère provisoire`,r);
    rep(s&&/Intentions de vote au second tour/.test(s.t)&&/47 %/.test(s.t)&&/Estimation d’après sondages/.test(s.t),`${w}px après 1er tour : intentions de 2nd tour distinguées du résultat`,s);
    rep(c&&c.lines.filter(l=>/premier tour/i.test(l.t)&&/sc-poll/.test(l.k)).length===0,`${w}px après 1er tour : plus d'intentions de 1er tour`,c);});
  await page(w,'candidat.html#C-e2',async p=>{const c=await card(p);rep(c&&!/Éliminé|Battu/.test(c.t)&&!/situation à confirmer/.test(c.t)&&c.lines.length===1&&/sc-result/.test(c.lines[0].k)&&/15,0 %/.test(c.lines[0].t),`${w}px résultats provisoires : jamais « éliminé », score conservé, aucune intention`,c);});
  await page(w,'candidat.html#C-e3',async p=>{const c=await card(p);rep(c&&/Éliminé au premier tour/.test(c.t)&&c.lines.length===1&&/sc-result/.test(c.lines[0].k)&&/15,0 %/.test(c.lines[0].t)&&!/situation à confirmer/.test(c.t),`${w}px résultats définitifs + qualifications : éliminé, score réel conservé, aucune intention`,c);});
  await page(w,'candidat.html#C-e4',async p=>{const c=await card(p);rep(c&&!/Éliminé|Battu|Qualifié|Élu|déclarée/i.test(c.t)&&c.lines.length===1&&/26,0 %/.test(c.lines[0].t),`${w}px définitif sans aucune qualification saisie : aucune conclusion, score conservé, statut de candidature plus pertinent`,c);});
  for(const k of ['A','B','C']) await page(w,'candidat.html#'+k+'-e6',async p=>{const c=await card(p);rep(c&&!/Éliminé|Battu|Qualifié|Élu|déclarée/i.test(c.t),`${w}px indicateurs incohérents (élu et qualifié au même tour) : aucune conclusion pour ${k}`,c);});
  await page(w,'candidat.html#A-e2',async p=>{const c=await card(p);rep(c&&/Qualifié pour le second tour/.test(c.t)&&/résultats provisoires/.test(c.t),`${w}px qualifié sur résultats provisoires : mention « résultats provisoires »`,c);});
  // ---- statuts bruts « éliminé » / « battu » : jamais suffisants ----
  await page(w,'candidat.html#A-e8',async p=>{const c=await card(p);rep(c&&/Éliminé au premier tour/.test(c.t)&&c.lines.length===1&&/sc-result/.test(c.lines[0].k),`${w}px statut brut « eliminated » CONFIRMÉ par résultat définitif cohérent : Éliminé, aucune estimation`,c);});
  await page(w,'candidat.html#B-e8',async p=>{const c=await card(p);rep(c&&/Qualifié pour le second tour/.test(c.t)&&!/Battu|éliminé/i.test(c.t),`${w}px statut brut « defeated » CONTREDIT par les résultats (qualifié) : jamais « Battu »`,c);});
  await page(w,'candidat.html#C-e8',async p=>{const c=await card(p);rep(c&&/Éliminé au premier tour/.test(c.t)&&!c.lines.some(l=>/sc-poll/.test(l.k)),`${w}px éliminé : aucune estimation de sondage malgré un sondage récent`,c);});
  for(const k of ['A','B']) await page(w,'candidat.html#'+k+'-e9',async p=>{const c=await card(p);
    rep(c&&!/Éliminé|Battu|éliminé/i.test(c.t)&&c.lines.length===1&&/sc-poll/.test(c.lines[0].k),`${w}px statut brut sans résultat (${k}) : aucun statut d'élimination, estimation seule`,c);});
  await page(w,'candidat.html#D-e9',async p=>{const c=await card(p);rep(c===null,`${w}px statut brut « eliminated » sans résultat ni sondage : aucune carte, aucun statut d'élimination`,c);});
  await page(w,'candidat.html#A-e10',async p=>{const c=await card(p);rep(c&&!/Éliminé|Battu|éliminé/i.test(c.t)&&/provisoires/.test(c.t),`${w}px statut brut « eliminated » + résultats PROVISOIRES : aucune élimination affichée (score provisoire seul)`,c);});
  await page(w,'candidat.html#A-e3',async p=>{const c=await card(p);rep(c&&/Battu/.test(c.t)&&!c.lines.some(l=>/sc-poll/.test(l.k)),`${w}px battu : aucune estimation même avec un sondage de 2nd tour récent`,c);});
  await page(w,'candidats.html?e=e8',async p=>{const t=await p.locator('.cand').evaluateAll(a=>a.map(x=>x.innerText));const f=k=>t.find(x=>x.includes(k))||'';
    rep(/Éliminé au premier tour/i.test(f('Alice'))&&!/Battu|éliminé/i.test(f('Bruno'))&&!/Battu|éliminé/i.test(f('David')),`${w}px liste des candidats : « éliminé » seulement si confirmé par un résultat définitif`,t);});
  await page(w,'candidats.html?e=e9',async p=>{const t=await p.locator('.cand').evaluateAll(a=>a.map(x=>x.innerText));rep(t.length===4&&!t.some(x=>/Battu|éliminé/i.test(x)),`${w}px liste des candidats : statuts bruts sans résultat -> aucun badge Battu/éliminé`,t);});
  // ---- fraîcheur (30 jours) ----
  await page(w,'candidat.html#A-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/29 %/.test(c.lines[0].t),`${w}px fraîcheur : 30 jours exactement -> estimation encore présentée`,c);},null,null,'2026-12-10T10:00:00Z');
  await page(w,'candidat.html#A-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===0&&/déclarée/i.test(c.t),`${w}px fraîcheur : 31 jours -> aucune estimation (statut conservé)`,c);},null,null,'2026-12-11T10:00:00Z');
  await page(w,'election.html?e=e1',async p=>{rep(await p.locator('[data-ps=select] option').count()===5,`${w}px fraîcheur : les sondages anciens restent consultables dans le sélecteur`);},null,null,'2027-03-01T10:00:00Z');
  await page(w,'candidat.html#A-e2',async p=>{const c=await card(p);rep(c&&/Qualifié pour le second tour/.test(c.t)&&c.lines.length===1&&/sc-result/.test(c.lines[0].k),`${w}px fraîcheur : sondage de 2nd tour de 36 jours -> pas d'intentions, résultat réel conservé`,c);},null,null,'2027-05-20T10:00:00Z');
  // règles de comparabilité (e7)
  await page(w,'candidat.html#A-e7',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/28 %/.test(c.lines[0].t)&&/moyenne de 3 sondages/.test(c.lines[0].t)&&/au 10 novembre 2026/.test(c.lines[0].t),`${w}px moyenne : même tour, mêmes candidats, même scénario (casse/espaces ignorés), un institut une fois, fenêtre 21 j, round NULL et autre tour exclus`,c);});
  await page(w,'candidat.html#B-e7',async p=>{const c=await card(p);rep(c&&/21 %/.test(c.lines[0].t)&&/moyenne de 3/.test(c.lines[0].t),`${w}px moyenne e7 candidat B (20, 22, 21 -> 21)`,c);});
  await page(w,'candidat.html#C-e7',async p=>{const c=await card(p);rep(c&&/11 %/.test(c.lines[0].t)&&/moyenne de 3/.test(c.lines[0].t),`${w}px moyenne e7 candidat C (10, 12, 11 -> 11)`,c);});
  await page(w,'candidat.html#A-e3',async p=>{const c=await card(p);
    rep(c&&/Battu/.test(c.t)&&c.lines.length===2&&/Premier tour/.test(c.lines[0].t)&&/28,5 %/.test(c.lines[0].t)&&/Second tour/.test(c.lines[1].t)&&/47,2 %/.test(c.lines[1].t)&&c.lines.every(l=>/sc-result/.test(l.k)),`${w}px après 2nd tour : battu, parcours complet (1er et 2nd tour), uniquement des résultats`,c);});
  await page(w,'candidat.html#B-e3',async p=>{const c=await card(p);rep(c&&/Élu/.test(c.t)&&c.lines.length===2&&/52,8 %/.test(c.lines[1].t),`${w}px après 2nd tour : élu`,c);});
  await page(w,'candidat.html#A-e4',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/Premier tour/.test(c.lines[0].t)&&!/Second tour|Qualifié|Élu|Battu/.test(c.t),`${w}px scrutin à un tour : score, aucun second tour artificiel (aucun marquage de qualification -> statut inchangé)`,c);});
 }
 // un seul sondage : pas de flèches ni de liste inutiles
 await page(1280,'election.html?e=e5',async p=>{rep(await p.locator('.ps-btn').count()===0&&await p.locator('[data-ps=select]').count()===0&&await p.locator('.poll').count()===1,'un seul sondage : ni flèches ni liste, affichage direct')}); 
 // sondages ET résultats ensemble (e2 : sondages + résultats provisoires) : deux rubriques distinctes, thèmes clair/sombre, mobile et bureau
 for(const th of ['light','dark'])for(const w of [1280,400]) await page(w,'election.html?e=e2',async p=>{
   rep(await p.locator('.res').count()===1&&await p.locator('.poll').count()===1,`${th} ${w}px : résultats et sondages distincts sur la même page`);
   rep(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${th} ${w}px accueil : pas de débordement horizontal`);
   const cr=await p.evaluate(()=>{const lum=s=>{const m=s.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};const bgOf=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement}return 'rgb(255,255,255)'};
     return ['.res-tab[aria-selected=true]','.res-badge','.ps-pos','.ps-select','.bar-v','.res-tag'].filter(q=>document.querySelector(q)).map(q=>{const e=document.querySelector(q),a=lum(getComputedStyle(e).color),b=lum(bgOf(e));return [q,+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)]})});
   rep(cr.every(x=>x[1]>=4.5),`${th} ${w}px : contrastes de la rubrique résultats et du sélecteur ≥ 4,5`,cr);
 },null,th);
 // carte de statut : thèmes clair/sombre, bureau/mobile (débordement, contraste, lisibilité)
 for(const th of ['light','dark'])for(const w of [1280,400]) await page(w,'candidat.html#A-e2',async p=>{await p.waitForSelector('.status-card');
   const r=await p.evaluate(()=>{const lum=s=>{const m=s.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};const bg=getComputedStyle(document.querySelector('.status-card')).backgroundColor;
     const c=['.status-card b','.sc-k','.sc-lines small'].map(q=>{const e=document.querySelector(q),a=lum(getComputedStyle(e).color),b=lum(bg);return +((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)});
     const sc=document.querySelector('.status-card').getBoundingClientRect();return {c,over:document.documentElement.scrollWidth>innerWidth+1,inside:sc.right<=innerWidth+1}});
   rep(!r.over&&r.inside&&r.c.every(x=>x>=4.5),`${th} ${w}px carte de statut : pas de débordement, contrastes ≥ 4,5`,r)},null,th);
 // cohérence : mêmes données pour l'accueil et la carte (e3, A : 28,5 % au 1er tour partout)
 await page(1280,'election.html?e=e3',async p=>{await p.locator('.res-tab').first().click();rep(/28,5 %/.test(await p.locator('[data-results=ok]').innerText()),'cohérence : accueil = 28,5 % pour A (premier tour)');});
 // mode sombre : la rubrique et la carte restent lisibles (contraste texte/fond de la carte)
 await page(1280,'candidat.html#A-e2',async p=>{await p.waitForSelector('.status-card');const r=await p.evaluate(()=>{const parse=s=>s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};const el=document.querySelector('.sc-v'),bg=getComputedStyle(document.querySelector('.status-card')).backgroundColor;const a=lum(parse(getComputedStyle(el).color)),b=lum(parse(bg));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});rep(r>=4.5,'mode sombre : contraste carte de statut ≥ 4,5',r)},null,'dark');
 // unité : Scrutin.estimate ne mélange pas les tours
 await page(1280,'election.html?e=e1',async p=>{const r=await p.evaluate(()=>{const g=Scrutin.pollGroups([{value_percent:40,entity_kind:'candidacy',candidacy_id:'x',scenario:'Second tour',poll_date:'2026-11-01',pollster:'I'}]);return Scrutin.estimate(g,{id:'x'},1)});rep(r===null,'unité : un sondage de second tour ne produit pas d’estimation de premier tour',r)});
 await page(1280,'election.html?e=e1',async p=>{const r=await p.evaluate(()=>{const row=(round,txt)=>({entity_kind:'candidacy',candidacy_id:'x',value_percent:30,scenario:txt,round,poll_date:'2026-11-01',pollster:'I'});const rd=(r,t)=>Scrutin.pollGroups([row(r,t)])[0].round;return {texte:rd(undefined,'Second tour'),nul:rd(null,'Premier tour'),un:rd(1,'x'),deux:rd(2,'Premier tour'),zero:rd(0,'Second tour'),mixte:Scrutin.pollGroups([row(1,'s'),Object.assign(row(2,'s'),{})]).map(g=>g.round)}});rep(r.texte===0&&r.nul===0&&r.un===1&&r.deux===2&&r.zero===0&&r.mixte.length===1&&r.mixte[0]===0,'unité : le tour vient uniquement de la colonne round (texte ignoré, 0 et absent = indéterminé) ; lignes d\'un même sondage de tours contradictoires : un seul groupe, tour indéterminé (jamais d\'estimation)',r)});
 rep(true,'unité : constantes (fenêtre de moyenne 21 j, fraîcheur 30 j)');await page(1280,'election.html?e=e1',async p=>{const k=await p.evaluate(()=>[Scrutin.WINDOW_DAYS,Scrutin.MAX_AGE_DAYS]);rep(k[0]===21&&k[1]===30,'constantes 21 / 30 jours',k)});
 console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
