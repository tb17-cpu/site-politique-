/* Non-régression : embeds PostgREST de measure_sources (relation historique désignée) + parcours candidat → mesure. PostgREST est simulé et REJETTE (300, PGRST201) tout embed ambigu. Playwright, Supabase simulé. Serveur statique sur 8765 sous /site-politique-/. */
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
  const sel=decodeURIComponent(u.search);
  const amb=sel.match(/measure_sources(!?[a-z_]*)\(/g)||[];
  if(t==='measures'||t==='measure_sources'){ for(const a of amb){ if(a==='measure_sources(') {ov.ambiguous=(ov.ambiguous||0)+1; return r.fulfill({status:300,headers:h,body:JSON.stringify({code:'PGRST201',message:"Could not embed because more than one relationship was found for 'measures' and 'measure_sources'"})});} } if(!/measure_sources!(measure_sources_measure_id_fkey|measures_formalization_measure_source_fk)\(/.test(sel)&&/measure_sources!/.test(sel)) return r.fulfill({status:400,headers:h,body:JSON.stringify({code:'PGRST200',message:'unknown relationship hint'})}); ov.hinted=(ov.hinted||0)+amb.length; }
  if(ov.badSelect&&ov.badSelect.re.test(u.search))return r.fulfill({status:ov.badSelect.status,headers:h,body:JSON.stringify({code:'42703',message:'column measures.formalization_status does not exist'})});
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


const L={official_program:'Programme officiel publié du candidat',party_position:'Position officielle du parti',candidate_pledge:'Engagement public du candidat',recent_announcement:'Annonce récente non intégrée à un programme',press_reported:'Information rapportée par la presse, à confirmer'};
const base={...mk1([]),case_measure_relations:[]};
const J=(id,o)=>({id:'ms-'+id,measure_id:id,page_reference:'p3',sources:S1,...o});
const fm=(id,o)=>({...base,id,title:'Mesure '+id,measure_sources:[{id:'ms'+id,sources:S1}],formalization_status:null,formalization_status_date:null,formalization_measure_source_id:null,formalization_note:null,justification:null,...o});
const M=[
 fm('m1',{formalization_status:'official_program',formalization_status_date:'2026-10-02',formalization_measure_source_id:'ms-m1',justification:J('m1')}),
 fm('m2',{formalization_status:'candidate_pledge',formalization_status_date:'2026-10-02',formalization_measure_source_id:'ms-m9',justification:J('m2',{id:'ms-m9',measure_id:'m9'})}),   // ligne d'une AUTRE mesure
 fm('m3',{formalization_status:'press_reported',formalization_status_date:'2026-10-02',formalization_measure_source_id:'ms-m3',justification:J('m3',{sources:null})}),                      // source dépubliée
 fm('m4',{formalization_status:'foo',formalization_status_date:'2026-10-02',formalization_measure_source_id:'ms-m4',justification:J('m4')}),
 fm('m5',{formalization_status:'recent_announcement',formalization_status_date:null,formalization_measure_source_id:'ms-m5',justification:J('m5')}),
 fm('m6',{}),
 fm('m7',{formalization_status:'party_position',formalization_status_date:'2026-09-15',formalization_measure_source_id:'ms-m7',justification:J('m7'),formalization_note:'Note éditoriale test'}),
 fm('m8',{formalization_status:'official_program',formalization_status_date:'2026-10-02',formalization_measure_source_id:null,justification:null}),                                         // aucune association
];

(async()=>{
 br=await chromium.launch();
 // 1. contrôle statique : tout embed de measure_sources désigne sa relation
 const fs=require('fs'),path=require('path');
 const js=fs.readdirSync('assets/js').filter(f=>f.endsWith('.js'));
 const un=[];js.forEach(f=>{const s=fs.readFileSync('assets/js/'+f,'utf8');(s.match(/measure_sources\([^)]{0,30}/g)||[]).forEach(x=>un.push(f+': '+x))});
 rep(un.length===0,'aucun embed measure_sources sans relation désignée dans assets/js',un);
 const dbs=fs.readFileSync('assets/js/db.js','utf8');
 rep(/measure_sources!measure_sources_measure_id_fkey\(\*,sources\(\*\)\)/.test(dbs),'DB.measure embarque measure_sources!measure_sources_measure_id_fkey(*,sources(*))');
 for(const w of [1280,400]){
  // 2. parcours complet : candidat -> liste de mesures -> clic -> fiche détaillée
  const ov=TT({elections:[E1],measures:M});
  await page(w,ov,'candidat.html?e=e1#c1',async p=>{
   const links=p.locator('.mlist a.t'); const nl=await links.count();
   rep(nl>=1,`${w}px candidat : mesures listées`,nl);
   const first=(await links.first().innerText()).trim();
   await links.first().click(); await p.waitForURL(/mesure\.html/); await p.waitForSelector('#f-body, .st-err',{timeout:8000}).catch(()=>{}); await p.waitForTimeout(600);
   const x=await p.evaluate(()=>document.body.textContent);
   rep(await p.locator('.st-err').count()===0&&!/Impossible d.afficher/.test(x),`${w}px clic sur « ${first} » : la fiche s’ouvre sans erreur`);
   rep(x.includes(first)&&/Sources et références/i.test(x)&&/Programme officiel/.test(x)&&/Éditeur 1/.test(x),`${w}px fiche : sources et références (titre et éditeur de la source)`);
   rep(/Analyse X/.test(x)||/analyse/i.test(x),`${w}px fiche : analyse présente`);
   rep(/Reformulation|Mécanisme|Objectif/.test(x),`${w}px fiche : contenu de la mesure présent`);
  });
  await page(w,{...ov,T:{...ov.T,measures:[{...M[0],case_measure_relations:rels}]}},'mesure.html?e=e1#m1',async p=>{
   const x=await txt(p);
   rep(/Cas 1/.test(x)&&await p.locator('.cs').count()>=1,`${w}px fiche : cas concrets et résultats accessibles`);
   rep(await p.locator('.fs-official_program').count()===1,`${w}px fiche : badge de statut quand renseigné`);
  });
  const ov0=TT({elections:[E1],measures:M.map(m=>({...m,formalization_status:null,formalization_status_date:null,formalization_measure_source_id:null,formalization_note:null,justification:null}))});
  await page(w,ov0,'candidat.html?e=e1#c1',async p=>{
   rep(await p.locator('.fs').count()===0&&await p.locator('.mlist a.t').count()>=1,`${w}px aucun statut renseigné : aucun badge, mesures listées`);
  });
  await page(w,ov,'candidat.html?e=e1#c1',async p=>{
   rep(await p.locator('.mlist .fs').count()>=1,`${w}px cartes/listes de mesures : badge sur les mesures avec statut`);
  });
  const ovA=TT({elections:[E1],measures:M}); await page(w,ovA,'mesure.html?e=e1#m1',async()=>{}); 
  rep((ovA.hinted||0)>0&&!(ovA.ambiguous),`${w}px requêtes : relations désignées, aucune ambiguïté PGRST201 (hinted=${ovA.hinted}, ambigu=${ovA.ambiguous||0})`);
 }
 await br.close(); console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad?1:0);
})();
