/* Statuts électoraux dynamiques : Élu / Élu provisoire / Qualifié / Éliminé / Battu ne viennent QUE des résultats ; jamais d'une valeur brute.
   Pas d'information = pas d'affichage. Rendu final vérifié sur la fiche candidat, la liste des candidats et l'accueil de l'élection (résultats).
   Playwright, Supabase simulé, DONNÉES ENTIÈREMENT FICTIVES. Serveur statique 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0; const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const pb={publication_status:'published'};
const mkEl=(id,two,dates)=>({id,name:'Scrutin fictif '+id,year:2027,election_type:'presidential',scheduled_date:dates===false?null:'2027-04-10',second_round_date:two?'2027-04-24':null,...pb,country_id:'fr',description:null,countries:{id:'fr',name:'France',iso2:'FR',...pb}});
// s1 : deux tours, AUCUN résultat. s2 : un tour, provisoire. s3 : un tour, définitif. s3b : plusieurs élus. s4 : après le 1er tour. s6 : provisoire contradictoire.
// s7 : définitif contradictoire. s8 : qualifié absent du tour suivant. s9 : statut de résultat inconnu. s10 : sans aucune date.
const IDS=['s1','s2','s3','s3b','s4','s6','s7','s8','s9','s10'];
const ELS=IDS.map(id=>mkEl(id,['s1','s4','s6','s7','s8'].includes(id),id==='s10'?false:undefined));
Object.assign(ELS.find(e=>e.id==='s10'),{year:null,election_type:null,countries:null,country_id:null});   // élection sans aucune donnée de calendrier
const NAMES=[['A','Alice','Alpha'],['B','Bruno','Beta'],['C','Carla','Gamma'],['D','David','Delta'],['E','Elsa','Epsilon'],['F','Félix','Phi'],['G','Gaël','Gamma2']];
const C=[];
IDS.forEach(el=>NAMES.forEach(([k,f,l])=>C.push({id:k+'-'+el,election_id:el,candidacy_status:'declared',...pb,people:{id:'p'+k+el,first_name:f,last_name:l,...pb},parties:null,
  elections:{id:el,name:'Scrutin fictif '+el,year:2027,scheduled_date:'2027-04-10',second_round_date:null,...pb},programs:[],candidacy_sources:[],candidacy_sponsorship_territories:[]})));
const set=(el,k,o)=>Object.assign(C.find(c=>c.id===k+'-'+el),o);
// s1 : valeurs BRUTES d'issue sans résultat
set('s1','A',{candidacy_status:'elected'}); set('s1','B',{candidacy_status:'winner'}); set('s1','D',{candidacy_status:'second_round',second_round_status:'qualified',second_round_qualified_at:'2027-04-11'});
set('s1','E',{candidacy_status:'eliminated'}); set('s1','F',{candidacy_status:null}); set('s1','G',{candidacy_status:'statut-inconnu-xyz'}); IDS.includes('s10')&&set('s10','F',{candidacy_status:null});
// s2 / s3 : un statut brut « elected » ne change rien ; s4 : brut « defeated » pour un qualifié
set('s3','C',{candidacy_status:'defeated'}); set('s4','B',{candidacy_status:'defeated'});
const RR=[];
const rr=(el,n,status,list,extra)=>RR.push({id:'rr-'+el+n,election_id:el,round_number:n,held_on:n===1?'2027-04-10':'2027-04-24',result_status:status,registered_voters:null,voters:null,abstentions:null,blank_votes:null,null_votes:null,expressed_votes:null,source_id:null,sources:null,notes:null,...pb,...(extra||{}),
  election_candidate_results:list.map(([k,pc,flag],i)=>({id:'cr-'+el+n+k,round_result_id:'rr-'+el+n,entity_kind:'candidacy',candidacy_id:k+'-'+el,candidacies:C.find(c=>c.id===k+'-'+el),percent_expressed:pc,votes:Math.round(pc*1000),qualified_next_round:flag==='q',elected:flag==='e',...pb}))});
const P=[['A',45],['B',30],['C',25]];
rr('s2',1,'provisional',[['A',52,'e'],['B',30],['C',18]]);
rr('s3',1,'final',[['A',52,'e'],['B',30],['C',18]]);
rr('s3b',1,'final',[['A',40,'e'],['B',35,'e'],['C',25]]);                       // plusieurs élus, aucune qualification : aucune limite
rr('s4',1,'final',[['A',34,'q'],['B',28,'q'],['C',20],['D',18]]);
rr('s6',1,'provisional',[['A',40,'e'],['B',35,'q'],['C',25]]);                   // contradictoire provisoire
rr('s7',1,'final',[['A',40,'e'],['B',35,'q'],['C',25]]);                         // contradictoire définitif
rr('s8',1,'final',[['A',34,'q'],['B',33,'q'],['C',33]]); rr('s8',2,'final',[['B',55,'e'],['C',45]]);   // A qualifié mais absent du tour 2
rr('s9',1,'weird',[['A',52,'e'],['B',48]]);
const D={elections:ELS,candidacies:C,programs:[],poll_snapshots:[],election_round_results:RR};
async function page(w,url,fn,st,theme){
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:w,height:900}}); const errs=[];
  await c.clock.setFixedTime(new Date('2027-04-26T10:00:00Z'));
  await c.addInitScript(t=>{try{localStorage.setItem('ar.theme',t)}catch(e){}},theme||'light');
  await c.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','access-control-expose-headers':'content-range'};
    if(st&&st[t]==='denied')return r.fulfill({status:403,headers:h,body:'{"message":"denied"}'});
    let rows=D[t]||[];rows=rows.filter(x=>{for(const [k,v] of u.searchParams){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    h['content-range']=`0-0/${rows.length}`;r.fulfill({status:200,headers:h,body:JSON.stringify(rows)})});
  await c.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+url,{waitUntil:'networkidle'});await p.waitForTimeout(500);
  await fn(p); rep(!errs.length,`  ${w}px ${url} : aucune erreur JS`,errs); await b.close();
}
const FORBID=/non renseign|statut inconnu|à préciser|information non disponible|statut à préciser|non précisé/i;   // (le libellé alternatif d'une photo manquante n'est pas un statut)
const ELU=/Élu(?! provisoire)(?!\w)/;
const card=async p=>{await p.waitForSelector('.cand-id,#f-body',{timeout:4000}).catch(()=>{});await p.waitForTimeout(300);return p.evaluate(()=>{const c=document.querySelector('.status-card');return {has:!!c,t:c?c.innerText:'',prov:!!(c&&c.classList.contains('is-prov')),border:c?getComputedStyle(c).borderLeftStyle:'',all:document.body.innerText}})};
const list=async p=>{await p.waitForSelector('.cand',{timeout:4000});return p.locator('.cand').evaluateAll(a=>a.map(x=>({t:x.innerText,badge:(x.querySelector('.statut')||{}).innerText||'',prov:!!x.querySelector('.statut--prov')})))};
const OUT=/Élu|Qualifié|Éliminé|Battu/i;
(async()=>{
 for(const [w,th] of [[1280,'light'],[400,'dark']]){
  const T=`${th} ${w}px`;
  // 1 / 2 : valeurs brutes « elected » / « winner » sans résultat
  await page(w,'candidat.html#A-s1',async p=>{const c=await card(p);rep(!c.has&&!/Élu/.test(c.all.replace(/Élue?s?\b.*?(présidentiel)/i,'')),`${T} 1. « elected » sans résultat : aucun statut Élu, aucune carte`,c.t);},null,th);
  await page(w,'candidat.html#B-s1',async p=>{const c=await card(p);rep(!c.has&&!ELU.test(c.all),`${T} 2. « winner » sans résultat : aucun statut Élu`,c.t);},null,th);
  // brut d'issue : qualifié, éliminé, inconnu, absent
  await page(w,'candidat.html#D-s1',async p=>{const c=await card(p);rep(!c.has,`${T} valeur brute « second_round » : aucune qualification affichée sans résultat`,c.t);},null,th);
  await page(w,'candidat.html#E-s1',async p=>{const c=await card(p);rep(!c.has&&!/Battu|Éliminé/.test(c.all),`${T} valeur brute « eliminated » : aucun statut d'élimination`,c.t);},null,th);
  // 7 : aucun statut renseigné / statut inconnu : aucun bloc
  for(const k of ['F','G']) await page(w,`candidat.html#${k}-s1`,async p=>{const c=await card(p);rep(!c.has&&!FORBID.test(c.all)&&await p.locator('.status-card, .sc-lines').count()===0,`${T} 7. statut ${k==='F'?'absent':'inconnu'} : aucun bloc de statut, aucun texte de remplacement`,c);},null,th);
  // 3 : élu provisoire
  await page(w,'candidat.html#A-s2',async p=>{const c=await card(p);rep(c.has&&/Élu provisoire/.test(c.t)&&/résultats provisoires/.test(c.t)&&c.prov&&c.border==='dashed'&&!ELU.test(c.t),`${T} 3. élu sur résultat provisoire : « Élu provisoire », distinction visuelle (trait pointillé)`,c);},null,th);
  // 4 : élu définitif
  await page(w,'candidat.html#A-s3',async p=>{const c=await card(p);rep(c.has&&ELU.test(c.t)&&!/provisoire/i.test(c.t)&&!c.prov&&c.border==='solid',`${T} 4. élu sur résultat définitif : « Élu », style plein`,c);},null,th);
  // battu confirmé (brut « defeated » ignoré, issu du résultat)
  await page(w,'candidat.html#C-s3',async p=>{const c=await card(p);rep(c.has&&/Battu/.test(c.t)&&/18,0 %/.test(c.t),`${T} battu : issu du résultat définitif (le statut brut seul n'aurait rien affiché)`,c.t);},null,th);
  // 5 / 6 : après le 1er tour
  await page(w,'candidat.html#A-s4',async p=>{const c=await card(p);rep(c.has&&/Qualifié pour le second tour/.test(c.t)&&!/Élu|Battu|Éliminé/.test(c.t),`${T} 5. qualifié après le 1er tour : qualification affichée, aucun élu`,c.t);},null,th);
  await page(w,'candidat.html#C-s4',async p=>{const c=await card(p);rep(c.has&&/Éliminé au premier tour/.test(c.t)&&!/Qualifié|Élu/.test(c.t),`${T} 6. éliminé confirmé par le résultat : élimination affichée`,c.t);},null,th);
  await page(w,'candidat.html#B-s4',async p=>{const c=await card(p);rep(c.has&&/Qualifié pour le second tour/.test(c.t)&&!/Battu/.test(c.t),`${T} statut brut « defeated » contredit par le résultat : qualifié, jamais « Battu »`,c.t);},null,th);
  // 8 : élection à deux tours sans résultat : aucun bloc de résultat, aucun second tour inventé
  await page(w,'election.html?e=s1',async p=>{const t=await p.evaluate(()=>document.body.innerText);
    rep(await p.locator('.res,[data-results]').count()===0&&!/Résultats officiels/.test(t)&&await p.locator('.res-tab').count()===0,`${T} 8. sans résultat : aucun bloc ni titre de résultats, aucun onglet`);
    rep(await p.locator('.pollsel,.poll').count()===0&&!/Sondages|Aucun sondage/.test(t),`${T} 8. sans sondage : ni bloc, ni titre, ni message de remplacement`);
    rep(!FORBID.test(t),`${T} 8. aucune formulation de remplacement sur l'accueil`,(t.match(FORBID)||[])[0]);},null,th);
  // 9 / 11 : contradictions (élu + qualifiés) : neutralisation de l'affichage
  for(const [el,def] of [['s6','provisoire'],['s7','définitif']]){
    for(const k of ['A','B']) await page(w,`candidat.html#${k}-${el}`,async p=>{const c=await card(p);rep(!OUT.test(c.t)&&/%/.test(c.t),`${T} 9/11. résultats ${def} contradictoires (${k}) : aucun statut Élu/Qualifié affiché, score conservé`,c.t);},null,th);
    await page(w,`election.html?e=${el}`,async p=>{const x=await p.locator('.res').innerText();rep(await p.locator('.res-tag').count()===0&&!/Élu|Qualifié/.test(x),`${T} 9/11. rubrique résultats ${def} contradictoires : aucune pastille Élu/Qualifié`,x.slice(0,200));},null,th);
    await page(w,`candidats.html?e=${el}`,async p=>{const l=await list(p);rep(l.every(x=>!x.badge),`${T} 9/11. liste ${def} contradictoire : aucune pastille de statut`,l.map(x=>x.badge));},null,th);
  }
  // 10 : plusieurs élus sans qualifié : non bloqué
  await page(w,'candidat.html#B-s3b',async p=>{const c=await card(p);rep(c.has&&ELU.test(c.t),`${T} 10. plusieurs élus dans un même tour : chacun reste « Élu »`,c.t);},null,th);
  await page(w,'candidats.html?e=s3b',async p=>{const l=await list(p);rep(l.filter(x=>/^Élu$/i.test(x.badge)).length===2&&/Battu/i.test(l.find(x=>/Carla/.test(x.t)).badge),`${T} 10. liste : deux élus et un battu`,l.map(x=>x.badge));},null,th);
  // statut de résultat inconnu : aucune conclusion
  await page(w,'candidat.html#A-s9',async p=>{const c=await card(p);rep(!OUT.test(c.t),`${T} statut de résultat inconnu : aucune conclusion`,c.t);},null,th);
  // qualifié absent du tour suivant publié : incohérent
  await page(w,'candidat.html#A-s8',async p=>{const c=await card(p);rep(!/Qualifié/.test(c.t)&&/34,0 %/.test(c.t),`${T} qualifié absent du tour suivant publié : aucune qualification affichée`,c.t);},null,th);
  await page(w,'candidat.html#B-s8',async p=>{const c=await card(p);rep(ELU.test(c.t)&&/Premier tour/.test(c.t)&&/Second tour/.test(c.t),`${T} parcours complet d'un élu au 2nd tour (1er et 2nd tours conservés)`,c.t);},null,th);
  // cohérence liste / fiche / résultats (mêmes données, même verdict)
  await page(w,'candidats.html?e=s2',async p=>{const l=await list(p);rep(/^Élu provisoire$/i.test(l.find(x=>/Alice/.test(x.t)).badge)&&l.find(x=>/Alice/.test(x.t)).prov,`${T} liste : « Élu provisoire » avec distinction visuelle`,l);},null,th);
  await page(w,'candidats.html?e=s3',async p=>{const l=await list(p);const g=k=>l.find(x=>x.t.includes(k)).badge;rep(/^Élu$/i.test(g('Alice'))&&/^Battu$/i.test(g('Bruno'))&&/^Battu$/i.test(g('Carla')),`${T} liste : Élu / Battu issus des résultats définitifs (statut brut « defeated » inutile)`,l.map(x=>x.badge));},null,th);
  await page(w,'candidats.html?e=s1',async p=>{const l=await list(p);rep(l.length===7&&l.every(x=>!OUT.test(x.badge))&&!l.some(x=>FORBID.test(x.t)),`${T} liste sans résultat : aucune pastille d'issue ni texte de remplacement (« Parti non renseigné » supprimé)`,l.map(x=>x.badge+'|'+x.t.replace(/\n/g,' ')));},null,th);
  await page(w,'candidats.html?e=s4',async p=>{const l=await list(p);const g=k=>l.find(x=>x.t.includes(k)).badge;rep(/Qualifié pour le second tour/i.test(g('Alice'))&&/Éliminé au premier tour/i.test(g('Carla'))&&!/Élu/i.test(l.map(x=>x.badge).join()),`${T} liste après le 1er tour : qualifiés et éliminé, aucun élu`,l.map(x=>x.badge));},null,th);
  await page(w,'election.html?e=s2',async p=>{const x=await p.locator('.res').innerText();rep(/Élu provisoire/.test(x)&&await p.locator('.res-tag.res-prov').count()===1&&/Résultats provisoires/.test(x),`${T} rubrique résultats : « Élu provisoire » distinct, résultats provisoires`,x.slice(0,200));},null,th);
  await page(w,'election.html?e=s3',async p=>{const x=await p.locator('.res').innerText();rep(ELU.test(x)&&await p.locator('.res-tag.res-prov').count()===0&&/Résultats définitifs/.test(x),`${T} rubrique résultats : « Élu » définitif`,x.slice(0,200));},null,th);
  await page(w,'election.html?e=s4',async p=>{const x=await p.locator('.res').innerText();rep(await p.locator('.res-tag').count()===2&&!ELU.test(x)&&await p.locator('.res-tab').count()===1,`${T} rubrique résultats après le 1er tour : 2 qualifiés, aucun élu, un seul onglet`,x.slice(0,200));},null,th);
  // 12 : blocs sans contenu : disparition complète (aucun titre, aucun emplacement) — élection sans date ni résultat
  await page(w,'election.html?e=s10',async p=>{const t=await p.evaluate(()=>document.body.innerText);
    rep(!/Calendrier/.test(t)&&!/Résultats/.test(t)&&!/Sondages/.test(t)&&await p.locator('.res,[data-results],.pollsel,.poll').count()===0&&!FORBID.test(t),`${T} 12. élection sans date, résultat ni sondage : ni « Calendrier », ni « Résultats », ni « Sondages », ni message`,{cal:/Calendrier/.test(t),res:/Résultats/.test(t),son:/Sondages/.test(t),forb:(t.match(FORBID)||[])[0],n:await p.locator('.res,[data-results],.pollsel,.poll').count(),ctx:(t.match(/.{30}(Calendrier|Résultats|Sondages).{30}/)||[])[0]});
    rep(!/Vue d’ensemble ·/.test(await p.locator('#p-label').innerText()),`${T} 12. aucune « situation » inventée dans l'en-tête`);},null,th);
  await page(w,'candidat.html#F-s10',async p=>{const c=await card(p);rep(!c.has&&await p.locator('.status-card,.sc-lines,.sc-k').count()===0,`${T} 12. fiche sans statut : aucune carte ni élément vide`);},null,th);
  // erreur technique (≠ absence) : message d'erreur conservé pour les résultats
  await page(w,'election.html?e=s2',async p=>{rep(await p.locator('[data-results=error]').count()===1,`${T} erreur technique des résultats : message d'erreur distinct (pas une absence)`);},{election_round_results:'denied'},th);
 }
 // unités : Scrutin.status / tagFor cohérents
 await page(1280,'election.html?e=s3',async p=>{const r=await p.evaluate(()=>{const c={id:'A-s3',candidacy_status:'elected'};return {sans:Scrutin.status(c,{rounds:[]}),w:Scrutin.status({id:'x',candidacy_status:'winner'},null)}});rep(r.sans===null&&r.w===null,'unité : « elected » / « winner » sans résultat -> null',r)});
 console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
