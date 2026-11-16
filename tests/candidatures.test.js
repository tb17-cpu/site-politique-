/* Candidatures : aucun badge « Fiabilité » sur les cartes, conservé sur la fiche. Playwright, Supabase simulé. Serveur statique 8765 sous /site-politique-/. */
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
 const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 await p.goto(B+url,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
 const r=await fn(p,errs,log); rep(writes===0,'  aucune requête d’écriture ('+url+')',writes); rep(!errs.length,'  aucune erreur JS ('+url+')',errs);
 await ctx.close(); return r;
}
const txt=p=>p.evaluate(()=>document.body.innerText);
const TT=ov=>({T:{...T,...ov}});

const mkC=(id,fn,ln,pt,col,pos,unc,photo,credit)=>({...cA,id,political_position:pos,political_position_note:'Justification '+ln,political_position_uncertain:!!unc,
 people:{...person,id:'p'+id,first_name:fn,last_name:ln,photo_url:photo,photo_credit:credit||null,photo_source_url:credit?'https://commons.example/'+id:null},
 parties:pt?{id:'pa'+id,name:pt,acronym:null,political_color:col,publication_status:'published'}:null});
const five=[mkC('a','Jean-Luc','Mélenchon','LFI','#CC2443','left',0,'https://img.test/ok.png','Auteur A, CC BY-SA'),mkC('b','Marine','Le Pen','RN','#17408B','right',0,'https://img.test/ok.png','Auteur B'),
 mkC('c','Édouard','Philippe','Horizons','#00AEEF','center_right',0,'https://img.test/ok.png','Auteur C'),mkC('d','Éric','Zemmour','Reconquête','#172A4A','right',0,'https://img.test/ok.png','Auteur D'),
 mkC('e','David','Lisnard','Nouvelle Énergie','#D5A52A','center_right',1,'https://img.test/ok.png','Auteur E')];
const edge=[mkC('x','Sans','Couleur','Parti X',null,null,0,null),mkC('y','Sans','Parti',null,null,'center',0,'https://invalid.example/x.jpg'),mkC('z','Couleur','Invalide','Parti Z','rouge','left',0,'https://img.test/ok.png')];
(async()=>{
 br=await chromium.launch(); const ex=TT({elections:[E1],candidacies:[...five,...edge]});
 for(const w of [1280,400]){
  await page(w,ex,'candidats.html?e=e1',async p=>{
   const n=await p.locator('.cand').count(); const x=await txt(p);
   rep(n===8,`${w}px cartes : ${n} candidatures affichées (8 attendues)`);
   rep(await p.locator('.cand .rel').count()===0&&!/Fiabilité/.test(x),`${w}px cartes : aucun badge « Fiabilité »`);
   rep(await p.locator('.cand .party-dot').count()===5&&await p.locator('.cand .name, .cand h3, .cand b').count()>=8,`${w}px cartes : nom, parti et couleur conservés`);
   rep(!/Lire le niveau de fiabilité/.test(x),`${w}px page candidats : légende de fiabilité retirée avec l’indicateur`);
  });
  await page(w,ex,'candidat.html?e=e1#a',async p=>{
   const x=await txt(p);
   rep(/Fiabilité/.test(x)&&await p.locator('.rel').count()>=1,`${w}px fiche candidat : indicateur de fiabilité conservé`);
  });
 }
 await br.close(); console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad?1:0);
})();
