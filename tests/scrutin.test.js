/* Test du sélecteur de sondages, de la rubrique résultats et de la carte de statut évolutive (intentions → résultats par tour).
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES. Serveur statique sur 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0; const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const pb={publication_status:'published'};
const mkEl=(id,extra)=>({id,name:'Présidentielle fictive '+id,year:2027,election_type:'presidential',scheduled_date:'2027-04-10',second_round_date:'2027-04-24',...pb,country_id:'fr',description:null,countries:{id:'fr',name:'France',iso2:'FR',...pb},...extra});
const ELS=['e1','e2','e3','e4','e5'].map(id=>mkEl(id));
ELS[3].second_round_date=null; // e4 : scrutin à un seul tour
const per=(id,fn,ln)=>({id:'p'+id,first_name:fn,last_name:ln,...pb});
const cand=(id,el,fn,ln,st='declared')=>({id,election_id:el,candidacy_status:st,...pb,people:per(id,fn,ln),parties:null,elections:{id:el,name:'Présidentielle fictive '+el,year:2027,scheduled_date:'2027-04-10',second_round_date:'2027-04-24',...pb},programs:[],candidacy_sources:[],candidacy_sponsorship_territories:[]});
const C=[];['e1','e2','e3','e4'].forEach(el=>[['A','Alice','Alpha'],['B','Bruno','Beta'],['C','Carla','Gamma'],['D','David','Delta']].forEach(([k,f,l])=>C.push(cand(k+'-'+el,el,f,l))));
const src=(id,pub)=>({id,title:'Notice '+id,url:'https://example.org/'+id,publisher:'Commission',publication_date:pub,...pb});
const S=[];
const poll=(el,tag,pollster,pub,end,scen,vals,start)=>{const so=src(el+tag,pub);vals.forEach(([k,v],i)=>S.push({id:el+tag+i,election_id:el,snapshot_date:pub,record_kind:'poll',poll_date:end,fieldwork_start:start||end,pollster,entity_kind:'candidacy',candidacy_id:k+'-'+el,candidacies:C.find(c=>c.id===k+'-'+el),scenario:scen,methodology:'Méthode '+pollster,notes:null,sample_size:1000+i,value_percent:v,...pb,sources:so}))};
// e1 : avant le 1er tour. A : deux instituts proches (moyenne 29), B : un seul sondage, C : sondage ancien de 3 mois (hors moyenne), D : aucun sondage exploitable.
poll('e1','a','Ifop','2026-11-12','2026-11-10','Premier tour, hypothèse 1',[['A',28],['B',20],['C',9]]);
poll('e1','b','OpinionWay','2026-11-08','2026-11-05','Premier tour, hypothèse 1',[['A',30],['B',18]]);
poll('e1','c','Elabe','2026-08-01','2026-07-30','Premier tour, hypothèse 1',[['A',25],['C',12]]);
poll('e1','d','Odoxa','2026-11-14','2026-11-13','Second tour : Alpha face à Beta',[['A',47],['B',53]]);   // second tour : jamais utilisé avant le 1er tour
poll('e1','e','Harris','2026-11-15','2026-11-14','Sondage sans mention',[['D',44],['A',56]]);                 // 2 entités sans mention : tour indéterminé, ignoré
// e2 : après le 1er tour (résultats provisoires), sondage de 2nd tour pour les qualifiés A et B
poll('e2','a','Ifop','2027-04-15','2027-04-14','Second tour : Alpha face à Beta',[['A',47],['B',53]]);
poll('e2','b','Ifop','2027-04-01','2027-04-01','Premier tour',[['A',27],['B',21],['C',15]]);
const rr=(el,n,o,list)=>({id:'rr-'+el+n,election_id:el,round_number:n,held_on:n===1?'2027-04-10':'2027-04-24',result_status:'final',registered_voters:48000000,voters:36000000,abstentions:12000000,blank_votes:600000,null_votes:200000,expressed_votes:35200000,source_id:null,sources:src('res'+el+n,'2027-04-25'),notes:null,...pb,...o,
  election_candidate_results:list.map(([k,pc,votes,q,elu],i)=>({id:'cr-'+el+n+i,round_result_id:'rr-'+el+n,entity_kind:'candidacy',candidacy_id:k+'-'+el,candidacies:C.find(c=>c.id===k+'-'+el),percent_expressed:pc,votes,qualified_next_round:!!q,elected:!!elu,...pb}))});
const RR=[
 rr('e2',1,{result_status:'provisional'},[['A',28.5,10032000,1],['B',22.1,7779200,1],['C',15.0,5280000],['D',9.4,3308800]]),
 rr('e3',1,{},[['A',28.5,10032000,1],['B',22.1,7779200,1],['C',15.0,5280000],['D',9.4,3308800]]),
 rr('e3',2,{},[['A',47.2,16614400],['B',52.8,18585600,0,1]]),
 rr('e4',1,{},[['A',41.0,14432000],['B',33.0,11616000],['C',26.0,9152000]]),
];
const D={elections:ELS,candidacies:C,programs:[],poll_snapshots:S,election_round_results:RR};
async function page(w,url,fn,st,theme){
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:w,height:900}}); const errs=[];
  if(theme)await c.addInitScript(t=>{try{localStorage.setItem('ar.theme',t)}catch(e){}},theme);
  await c.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range'};
    if(st&&st[t]===404)return r.fulfill({status:404,headers:h,body:JSON.stringify({message:'relation absente',code:'42P01'})});
    if(st&&st[t]==='abort')return r.abort('failed');
    let rows=D[t]||[];rows=rows.filter(x=>{for(const [k,v] of u.searchParams){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    h['content-range']=`0-0/${rows.length}`;r.fulfill({status:200,headers:h,body:JSON.stringify(rows)})});
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
    const t0=await txt(); rep(/Harris/.test(t0)&&/Sondage 1 sur 5/.test(t0)&&/14 novembre 2026/.test(t0),`${w}px sélecteur : institut, date et position`,t0.slice(0,200));
    await p.locator('[data-ps=older]').click(); const t1=await txt();
    const pn=await p.locator('.poll').innerText(), hd=await p.locator('[data-ps-head]').innerText();
    rep(/Odoxa/.test(hd)&&!/Harris/.test(hd+pn)&&/Sondage 2 sur 5/.test(t1)&&/Alice Alpha/.test(t1),`${w}px sélecteur : flèche -> sondage plus ancien, résultats mis à jour sans mélange`,t1.slice(0,200));
    rep(await p.locator('.poll .bar-v').allInnerTexts().then(v=>v.join()==='53,0 %,47,0 %'),`${w}px sélecteur : pourcentages du sondage affiché uniquement`);
    await p.locator('[data-ps=select]').selectOption({index:4}); const t4=await txt();
    rep(/Elabe/.test(t4)&&/Sondage 5 sur 5/.test(t4)&&await p.locator('[data-ps=older]').isDisabled()&&/Méthode Elabe/.test(t4),`${w}px sélecteur : choix direct, méthodologie propre au sondage`,t4.slice(0,200));
    await p.locator('[data-ps=newer]').click(); rep(/Sondage 4 sur 5/.test(await txt())&&/Ifop|OpinionWay/.test(await txt()),`${w}px sélecteur : retour vers le plus récent`);
    rep(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${w}px sélecteur : pas de débordement horizontal`);
    const bb=await p.locator('.ps-btn').first().boundingBox(); rep(bb.width>=44&&bb.height>=44,`${w}px sélecteur : flèches de 44 px minimum`,bb);
    rep(await p.locator('[data-results]').evaluate(x=>x.hidden),`${w}px sans résultat : rubrique résultats invisible (emplacement prévu)`);
  });
  // ---- 12 : rubrique résultats ----
  await page(w,'election.html?e=e3',async p=>{
    const tabs=await p.locator('.res-tab').allInnerTexts(), t=()=>p.locator('[data-results=ok]').innerText();
    rep(tabs.join('|')==='Premier tour|Second tour'&&await p.locator('.res-tab[aria-selected=true]').innerText()==='Second tour',`${w}px résultats : onglets par tour, dernier tour ouvert`,tabs);
    const t2=await t(); rep(/Résultats définitifs/.test(t2)&&/24 avril 2027/.test(t2)&&/52,8 %/.test(t2)&&/18\s?585\s?600 voix/.test(t2)&&/Élu/.test(t2),`${w}px résultats : % , voix, vainqueur, caractère définitif, date`,t2.slice(0,300));
    rep(/Inscrits/i.test(t2)&&/Abstentions/i.test(t2)&&/Bulletins blancs/i.test(t2)&&/Bulletins nuls/i.test(t2)&&/75,0 %/.test(t2),`${w}px résultats : participation, abstention, blancs, nuls`,t2);
    await p.locator('.res-tab').first().click(); const t1=await t();
    rep(/28,5 %/.test(t1)&&/Qualifié pour le second tour/.test(t1)&&!/Élu/.test(t1)&&/10\s?032\s?000 voix/.test(t1),`${w}px résultats : premier tour, qualifiés identifiés`,t1.slice(0,300));
    rep(await p.locator('.res').count()===1&&await p.locator('.pollsel').count()===0||await p.locator('.pollsel').count()===0,`${w}px résultats : sondages et résultats restent distincts`);
    rep(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${w}px résultats : pas de débordement horizontal`);});
  await page(w,'election.html?e=e2',async p=>{const t=await p.locator('[data-results=ok]').innerText();
    rep(/Résultats provisoires/.test(t)&&await p.locator('.res-tab').count()===1&&!/Second tour/.test(t),`${w}px résultats provisoires : un seul tour, pas de second tour fictif`,t.slice(0,200));});
  await page(w,'election.html?e=e1',async p=>{rep(await p.locator('[data-results=none]').count()===1,`${w}px table absente (404) : rubrique inactive sans erreur`);},{election_round_results:404});
  // ---- 10/11 : carte de statut ----
  await page(w,'candidat.html#A-e1',async p=>{const c=await card(p);
    rep(c&&/Candidat|Candidate|Déclar/i.test(c.t)&&c.lines.length===1&&/Intentions de vote au premier tour/.test(c.lines[0].t)&&/29 %/.test(c.lines[0].t)&&/moyenne de 2 sondages/.test(c.lines[0].t)&&/au 10 novembre 2026/.test(c.lines[0].t),`${w}px carte avant 1er tour : moyenne de sondages comparables, date de référence`,c);
    rep(c&&/Estimation d’après sondages/.test(c.lines[0].t)&&!/Résultat officiel/.test(c.t)&&!/second tour/i.test(c.lines[0].t.replace(/premier tour/ig,'')),`${w}px carte avant 1er tour : estimation signalée, aucun score ni 2nd tour`,c);});
  await page(w,'candidat.html#B-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/19 %/.test(c.lines[0].t)&&/moyenne de 2 sondages/.test(c.lines[0].t),`${w}px carte : moyenne des derniers sondages de chaque institut (20 et 18 -> 19)`,c);});
  await page(w,'candidat.html#C-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/9 %/.test(c.lines[0].t)&&!/moyenne/.test(c.lines[0].t),`${w}px carte : sondage ancien (3 mois) non mêlé, dernier sondage pertinent seul`,c);});
  await page(w,'candidat.html#D-e1',async p=>{const c=await card(p);rep(c&&c.lines.length===0,`${w}px carte : sondage de tour indéterminé ignoré -> aucune valeur`,c);});
  await page(w,'candidat.html#A-e2',async p=>{const c=await card(p);
    rep(c&&/Qualifié pour le second tour/.test(c.t),`${w}px après 1er tour : statut actualisé (qualifié)`,c);
    const r=c&&c.lines.find(l=>/sc-result/.test(l.k)), s=c&&c.lines.find(l=>/sc-poll/.test(l.k));
    rep(r&&/Premier tour/.test(r.t)&&/28,5 %/.test(r.t)&&/10\s?032\s?000 voix/.test(r.t)&&/Résultat officiel/.test(r.t)&&/provisoires/.test(r.t),`${w}px après 1er tour : score réel, voix, caractère provisoire`,r);
    rep(s&&/Intentions de vote au second tour/.test(s.t)&&/47 %/.test(s.t)&&/Estimation d’après sondages/.test(s.t),`${w}px après 1er tour : intentions de 2nd tour distinguées du résultat`,s);
    rep(c&&c.lines.filter(l=>/premier tour/i.test(l.t)&&/sc-poll/.test(l.k)).length===0,`${w}px après 1er tour : plus d'intentions de 1er tour`,c);});
  await page(w,'candidat.html#C-e2',async p=>{const c=await card(p);rep(c&&/Éliminé au premier tour/.test(c.t)&&c.lines.length===1&&/sc-result/.test(c.lines[0].k)&&/15,0 %/.test(c.lines[0].t),`${w}px éliminé : score réel conservé, aucune intention`,c);});
  await page(w,'candidat.html#A-e3',async p=>{const c=await card(p);
    rep(c&&/Battu/.test(c.t)&&c.lines.length===2&&/Premier tour/.test(c.lines[0].t)&&/28,5 %/.test(c.lines[0].t)&&/Second tour/.test(c.lines[1].t)&&/47,2 %/.test(c.lines[1].t)&&c.lines.every(l=>/sc-result/.test(l.k)),`${w}px après 2nd tour : battu, parcours complet (1er et 2nd tour), uniquement des résultats`,c);});
  await page(w,'candidat.html#B-e3',async p=>{const c=await card(p);rep(c&&/Élu/.test(c.t)&&c.lines.length===2&&/52,8 %/.test(c.lines[1].t),`${w}px après 2nd tour : élu`,c);});
  await page(w,'candidat.html#A-e4',async p=>{const c=await card(p);rep(c&&c.lines.length===1&&/Premier tour/.test(c.lines[0].t)&&!/Second tour|Qualifié|Élu|Battu/.test(c.t),`${w}px scrutin à un tour : score, aucun second tour artificiel (aucun marquage de qualification -> statut inchangé)`,c);});
 }
 // cohérence : mêmes données pour l'accueil et la carte (e3, A : 28,5 % au 1er tour partout)
 await page(1280,'election.html?e=e3',async p=>{await p.locator('.res-tab').first().click();rep(/28,5 %/.test(await p.locator('[data-results=ok]').innerText()),'cohérence : accueil = 28,5 % pour A (premier tour)');});
 // mode sombre : la rubrique et la carte restent lisibles (contraste texte/fond de la carte)
 await page(1280,'candidat.html#A-e2',async p=>{await p.waitForSelector('.status-card');const r=await p.evaluate(()=>{const parse=s=>s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};const el=document.querySelector('.sc-v'),bg=getComputedStyle(document.querySelector('.status-card')).backgroundColor;const a=lum(parse(getComputedStyle(el).color)),b=lum(parse(bg));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});rep(r>=4.5,'mode sombre : contraste carte de statut ≥ 4,5',r)},null,'dark');
 // unité : Scrutin.estimate ne mélange pas les tours
 await page(1280,'election.html?e=e1',async p=>{const r=await p.evaluate(()=>{const g=Scrutin.pollGroups([{value_percent:40,entity_kind:'candidacy',candidacy_id:'x',scenario:'Second tour',poll_date:'2026-11-01',pollster:'I'}]);return Scrutin.estimate(g,{id:'x'},1)});rep(r===null,'unité : un sondage de second tour ne produit pas d’estimation de premier tour',r)});
 console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
