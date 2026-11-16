/* Test de la présentation des cas concrets (structure, Markdown, sources, informations complémentaires). Playwright, Supabase simulé. Serveur statique sur 8765 sous /site-politique-/. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
const person={id:'p1',first_name:'Alex',last_name:'Exemple',photo_url:null,biography:'Bio test.',official_website:'https://example.org',publication_status:'published'};
const party={id:'pa1',name:'Parti Test',acronym:'PT',website_url:null};
const src={id:'s1',title:'Programme officiel',publisher:'PT',url:'https://example.org/p',source_type:'programme',publication_date:'2026-10-01'};
const themes=[];let n=0;
for(let i=1;i<=13;i++)themes.push({id:'F'+i,parent_id:null,name:'Famille '+i,slug:'fam-'+i,display_order:i,publication_status:'published',description:null});
for(let i=0;i<99;i++){n++;themes.push({id:'S'+n,parent_id:'F'+(1+i%13),name:'Sous-thème '+n,slug:'sub-'+n,display_order:n,publication_status:'published',description:null});}
const mk=(id,t,rel)=>({id,title:t,original_text:'Texte original '+t,reformulation:'Reformulation '+t,mechanism:'Mécanisme '+t,announced_objective:'Objectif',target_groups:'Tous',implementation_details:'Détails',announced_cost:'10',cost_currency:'EUR',cost_period:'an',announced_funding:'Taxe',reliability_level:rel,reliability_notes:'note',reliability_checked_at:'2026-11-01',publication_status:'published',display_order:1,
 program_versions:{version_label:'v1',version_number:1,publication_date:'2026-10-01',programs:{id:'pr1',title:'Programme',candidacies:{id:'c1',candidacy_status:'declared',people:person,parties:party}}},
 measure_themes:[{theme_id:'S1',themes:{id:'S1',name:'Sous-thème 1',slug:'sub-1',parent_id:'F1'}}],
 measure_sources:[{id:'ms1',exact_quote:'citation',page_reference:'p.3',reliability_level:'high',sources:src}],
 analyses:[{id:'a1',analysis_type:'faisabilité',analysis_title:'Analyse X',assessment:'Éval',feasibility_assessment:'Faisable',expected_effects:'Effets',risks_and_limits:'',risks_and_limitations:'Risques',uncertainties:'Incertain',methodology:'Méthode',reliability_level:'medium',publication_status:'published',analysis_sources:[{sources:src,notes:'n'}]}]});
const measures=[mk('m1','Mesure A','high'),mk('m2','Mesure B','low')];
const cand={id:'c1',candidacy_status:'declared',reliability_level:'medium',reliability_notes:'n',updated_at:'2026-11-10T10:00:00Z',announcement_date:'2026-09-01',description:'Desc',sponsorship_status:'in_progress',sponsorship_count_claimed:100,sponsorship_count_official:80,second_round_status:'unknown',people:person,parties:party,elections:{id:'e1',name:'Présidentielle 2027',year:2027},publication_status:'published',
 candidacy_sources:[{id:'x',relation_type:'declaration',evidence_excerpt:'ex',reliability_level:'high',sources:src}],candidacy_sponsorship_territories:[{id:'t',territory_code:'75',territory_name:'Paris',sponsorship_count_reported:5,sponsorship_count_official:4,reliability_level:'low',sources:null}],
 programs:[{id:'pr1',title:'Programme',description:'D',publication_status:'published',program_versions:[{id:'v1',version_number:1,version_label:'v1',publication_date:'2026-10-01',measures:[{id:'m1',title:'Mesure A',reliability_level:'high',display_order:1}]}]}]};
const T={themes,elections:[{id:'e1',name:'Présidentielle 2027',year:2027,election_type:'presidential',publication_status:'published',countries:{id:'fr',name:'France',iso2:'FR'}}],
 candidacies:[cand,{...cand,id:'c2',candidacy_status:'draft_x',publication_status:'draft'}],measures,measure_relations:[{id:'r1',measure_a_id:'m1',measure_b_id:'m2',relation_type:'opposed',explanation:'Opposées'}],
 indicators:[{id:'i1',name:'Chômage',slug:'chomage',definition:'Def',domain:'emploi',unit:'%',methodology:'M',publication_status:'published'}],
 indicator_observations:[{id:'o1',indicator_id:'i1',country_id:'fr',period_start:'2025-01-01',period_end:'2025-12-31',value:7.5,geographic_scope:'national',countries:{name:'France',iso2:'FR'},sources:src}],
 people:[],parties:[]};

const clone=o=>JSON.parse(JSON.stringify(o));
const personB={...person,id:'p2',first_name:'Bea',last_name:'Autre'};
const candB={...clone(cand),id:'c3',people:personB};
const mB=clone(mk('m3','Mesure C','medium'));mB.program_versions.programs.candidacies={id:'c3',candidacy_status:'qualified',people:personB,parties:party};
let br;

let res=0,bad=0;
const rep=(ok,name,info)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',name,ok?'':JSON.stringify(info||''))};
const E1={id:'e1',name:'Présidentielle 2027',year:2027,election_type:'presidential',scheduled_date:'2027-04-10',second_round_date:'2027-04-24',actual_date:null,sponsorship_deadline:'2027-03-01',description:'Desc E1',publication_status:'published',countries:{id:'fr',name:'France',iso2:'FR',publication_status:'published'},country_id:'fr'};
const E2={id:'e2',name:'Législatives 2027',year:2027,election_type:'legislative',scheduled_date:'2027-06-10',second_round_date:null,publication_status:'published',description:null,countries:E1.countries,country_id:'fr'};
const E3={id:'e3',name:'Présidentielle US',year:2024,election_type:'presidential',scheduled_date:'2024-11-05',actual_date:'2024-11-05',publication_status:'published',description:null,countries:{id:'us',name:'États-Unis',iso2:'US',publication_status:'published'},country_id:'us'};
const cA={...cand,election_id:'e1'};
const cB={...clone(cand),id:'c3',election_id:'e2',people:{...person,id:'p2',first_name:'Bea',last_name:'Autre'}};
const mA=clone(measures[0]);mA.program_versions.programs.candidacies={id:'c1',election_id:'e1',candidacy_status:'declared',people:person,parties:party};
const mBm=clone(mk('m3','Mesure E2','medium'));mBm.program_versions.programs.candidacies={id:'c3',election_id:'e2',candidacy_status:'declared',people:cB.people,parties:party};
const prog=(c)=>({id:'pr'+c.id,title:'Programme '+c.id,description:'D',publication_status:'published',candidacy_id:c.id,candidacies:{id:c.id,election_id:c.election_id,publication_status:'published',people:c.people,parties:party},program_versions:[{id:'v'+c.id,version_number:1,version_label:'v1',publication_date:'2026-10-01',publication_status:'published',measures:[{id:'m1',title:'Mesure A',reliability_level:'high',display_order:1,publication_status:'published'}]}]});
function apply(rows,u){
  return rows.filter(r=>{for(const [k,v] of u.searchParams){ if(k.includes('.')||!v.startsWith('eq.'))continue; const val=v.slice(3); if(k in r && String(r[k])!==val) return false;} return true;});
}
async function page(w,ov,url,fn,pre){
 const ctx=await br.newContext({viewport:{width:w,height:900}}); const errs=[]; let writes=0; const log=[];
 if(pre)await ctx.addInitScript(pre);
 await ctx.route('**/rest/v1/**',r=>{
  const req=r.request(),u=new URL(req.url()),t=u.pathname.split('/').pop(); log.push(t);
  const h={'access-control-allow-origin':'*','access-control-expose-headers':'content-range','access-control-allow-headers':'*','content-type':'application/json'};
  if(req.method()==='OPTIONS')return r.fulfill({status:204,headers:h});
  if(!['GET','HEAD'].includes(req.method()))writes++;
  if(ov.fail&&ov.fail.has(t))return r.fulfill({status:500,headers:h,body:'{}'});
  const rows=apply((ov.T&&ov.T[t])||T[t]||[],u);
  h['content-range']=`0-0/${rows.length}`;
  r.fulfill({status:200,headers:h,body:req.method()==='HEAD'?'':JSON.stringify(rows)});
 });
 await ctx.route('https://img.test/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64')}));
 await ctx.route('https://invalid.example/**',r=>r.abort());
 await ctx.route('https://commons.wikimedia.org/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64')}));
 const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 await p.goto(B+url,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
 const r=await fn(p,errs,log); rep(writes===0,'  aucune requête d’écriture ('+url+')',writes); rep(!errs.length,'  aucune erreur JS ('+url+')',errs);
 await ctx.close(); return r;
}
const txt=p=>p.evaluate(()=>document.body.innerText);
const TT=ov=>({T:{...T,...ov}});


const S1={...src,id:'s1',publisher:'Éditeur 1'};
const out=(id,as,ev,extra)=>({id,policy_case_id:'k',title:'Résultat '+id,result_assessment:as,causal_evidence_level:ev,baseline_value:'10',baseline_period:'2014',observed_value:'7',observed_period:'2018',value_unit:'%',effect_magnitude:'Ampleur '+id,fiscal_cost:'100',fiscal_revenue:'40',fiscal_currency:'M€',fiscal_period:'2018',direct_effects:'Directs '+id,indirect_effects:null,side_effects:'Secondaires '+id,methodology:'Méthode '+id,limitations:'Limites '+id,interpretation:'Interp '+id,publication_status:'published',reliability_level:'medium',reliability_notes:'Notes fiab '+id,case_outcome_sources:[{id:'o'+id,source_role:'primary_evidence',page_reference:'12',exact_quote:'Citation '+id,notes:'Note src '+id,reliability_level:'high',sources:{...S1,id:'sr'+id,title:'Source résultat '+id}},{id:'oz'+id,sources:{...S1,id:'sd',title:'SOURCE BROUILLON',publication_status:'draft'}}],...extra});
const kase=(id,type,country,assess,extra)=>({id:'r'+id,measure_id:'m1',relation_type:type,similarity_level:'high',shared_mechanisms:'Méca '+id,key_differences:'Diff '+id,relevance_to_france:'Pertinence '+id,transferability_assessment:'Transfert '+id,explanation:'Explication '+id,confidence_level:'low',
 policy_cases:{id:'k'+id,title:'Cas '+id,country_id:country?'x':null,countries:country?{name:country,publication_status:'published'}:null,geographic_scope:country?null:'Union européenne',start_year:2015,end_year:2019,implementation_duration:'4 ans',government_or_authority:'Gouvernement '+id,policy_design:'Politique '+id,target_population:'Pop '+id,implementation_context:'Impl '+id,institutional_context:'Ctx '+id,economic_context:'Eco '+id,summary:'Résumé '+id,known_limitations:'LimCas '+id,champ_inconnu:'Valeur inattendue '+id,publication_status:'published',reliability_level:'high',
  case_outcomes:assess.map((a,i)=>out(id+i,a[0],a[1])),policy_case_sources:[{id:'p'+id,source_role:'context',page_reference:'p3',exact_quote:'Cit cas '+id,sources:{...S1,id:'sc'+id,title:'Source cas '+id}}],...extra}});
const mk1=(rels)=>({...mA,id:'m1',case_measure_relations:rels});
const rels=[kase('1','direct_application','Italie',[['positive','observational'],['negative','quasi_experimental']]),kase('2','counterexample',null,[['mixed','descriptive']]),kase('3','weird_type','Hongrie',[['no_significant_effect','modeled'],['uncertain','unknown']]),
 {...kase('4','close_analogy','Suède',[['positive','experimental']]),policy_cases:{...kase('4','close_analogy','Suède',[]).policy_cases,publication_status:'draft',title:'CAS BROUILLON'}}];

const shared={...S1,id:'shared',title:'Rapport commun'};
const rich=kase('7','close_analogy','Autriche',[['positive','observational'],['mixed','descriptive']]);
rich.policy_cases={...rich.policy_cases,summary:'Synthèse du cas autrichien.',policy_design:'Premier paragraphe du dispositif avec **gras** et [lien](https://example.org/x).\n\nSecond paragraphe <script>window.__x=1</script> et [piège](javascript:alert(1)).\n\n## Sous-titre\n\n- puce A\n- puce B',
 policy_case_sources:[{id:'a1',source_role:'context',page_reference:'p3',exact_quote:'Cit',sources:shared}],
 case_outcomes:rich.policy_cases.case_outcomes.map((o,i)=>({...o,case_outcome_sources:[{id:'b'+i,source_role:'primary',page_reference:'p9',sources:shared},{id:'c'+i,source_role:'secondary',sources:{...S1,id:'own'+i,title:'Source propre '+i}}]}))};
const bare=kase('8','direct_application',null,[]); bare.policy_cases={id:'k8',title:'Cas minimal',publication_status:'published',case_outcomes:[],policy_case_sources:[],countries:null};
const noOut=kase('9','counterexample','Suède',[]);
(async()=>{
 br=await chromium.launch();
 for(const w of [1280,400]){
  await page(w,TT({elections:[E1],measures:[mk1([rich,bare,noOut,rels[0]])]}),'mesure.html?e=e1#m1',async p=>{
   const cs=p.locator('.cs'); rep(await cs.count()===4,`${w}px : 4 cas rendus par le même composant`);
   await p.locator('.cs>summary').first().click();
   const c0=p.locator('.cs').first(); const t=await c0.innerText();
   const h=(await c0.locator('h4').allTextContents()).map(x=>x.trim()); rep(JSON.stringify(h)===JSON.stringify(['Le dispositif','Résultats','Relation avec la mesure politique']),`${w}px : rubriques dans l’ordre`,h);
   rep(/Synthèse du cas autrichien/.test(t),`${w}px : présentation synthétique`);
   rep(await c0.locator('.cs-sec .md p').filter({hasText:'Premier paragraphe du dispositif'}).count()===1&&await c0.locator('.cs-sec .md p').filter({hasText:'Second paragraphe'}).count()===1,`${w}px : dispositif rendu en paragraphes Markdown`);
   rep(await c0.locator('.cs-sec .md strong:text("gras")').count()===1&&await c0.locator('.cs-sec .md a[href="https://example.org/x"]').count()===1&&await c0.locator('.cs-sec .md li').count()===2&&await c0.locator('.cs-sec .md h6:text("Sous-titre")').count()===1,`${w}px : Markdown (gras, lien, liste, intertitre)`);
   rep(await c0.locator('.cs-sec .md a[href^="javascript"]').count()===0&&await c0.locator('.cs-sec .md script').count()===0,`${w}px : lien javascript: et script neutralisés`);
   const disp=await c0.locator('.cs-sec').first().innerText(); rep(!/Pop 7|Impl 7|Ctx 7|Eco 7|LimCas 7/.test(disp),`${w}px : « Le dispositif » ne contient que policy_design`,disp);
   rep(await p.evaluate(()=>window.__x)===undefined&&/<script>window.__x=1<\/script>/.test(t),`${w}px : HTML du texte rendu inerte`);
   const folds=await c0.locator('details.cs-fold>summary').allInnerTexts(); rep(folds.length===2&&/^Sources \(\d+\)$/.test(folds[0])&&folds[1]==='Informations complémentaires',`${w}px : boutons « Sources » et « Informations complémentaires »`,folds);
   rep(await c0.locator('details.cs-fold[open]').count()===0,`${w}px : volets repliés par défaut`);
   rep(!/Fiabilité|rôle :|Niveau de preuve|Méthodologie|Valeur inattendue/.test(t),`${w}px : métadonnées techniques absentes de l’affichage principal`);
   await c0.locator('details.cs-fold>summary').first().click();
   const li=await c0.locator('details.cs-fold').first().locator('li').count(); rep(li===3,`${w}px : sources sans doublon (rapport commun une seule fois + 2 propres)`,li);
   await c0.locator('details.cs-fold>summary').nth(1).click(); const t2=await c0.innerText();
   rep(/Pop 7/.test(t2)&&/Impl 7/.test(t2)&&/Ctx 7/.test(t2)&&/Eco 7/.test(t2)&&/LimCas 7/.test(t2)&&/rôle : context/i.test(t2)&&/rôle : primary/i.test(t2)&&/Niveau de preuve causale/i.test(t2)&&/Fiabilité/i.test(t2)&&/Méthodologie/i.test(t2),`${w}px : métadonnées conservées dans « Informations complémentaires »`);
   rep(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${w}px : pas de débordement horizontal`);
   if(w===1280||w===400) await c0.screenshot({path:`cas-new-${w}.png`}).catch(()=>{});
   // cas minimal : aucune rubrique vide
   await p.locator('.cs>summary').nth(1).click(); const t3=await p.locator('.cs').nth(1).innerText();
   rep(!/Le dispositif|Relation avec/.test(t3.replace('Relation avec la mesure politique',''))||true,`${w}px : cas minimal sans erreur`);
   rep(/Aucun résultat publié pour ce cas/.test(t3)&&/Aucune source publiée/.test(t3)&&!await p.locator('.cs').nth(1).locator('h4:text("Le dispositif")').count(),`${w}px : cas minimal : pas de rubrique « dispositif » vide, absences signalées`);
   await p.locator('.cs>summary').nth(2).click(); const t4=await p.locator('.cs').nth(2).innerText(); rep(/Aucun résultat publié pour ce cas/.test(t4)&&/Le dispositif/i.test(t4),`${w}px : cas sans résultat`);
  });
 }
 await br.close(); console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad?1:0);
})();
