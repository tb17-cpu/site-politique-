/* Regroupement des mesures d'une fiche candidat : ordre FIXE, indépendant de l'ordre renvoyé par la base (mesures multi-thèmes). Playwright, Supabase simulé. Serveur 8765. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
const person={id:'p1',first_name:'Alex',last_name:'Exemple',photo_url:null,biography:'Bio.',publication_status:'published'};
const party={id:'pa1',name:'Parti Test',acronym:'PT'};
const TH={ A:{id:'tA',name:'Économie',slug:'eco',parent_id:null,display_order:1,publication_status:'published'},
           B:{id:'tB',name:'Santé',slug:'sante',parent_id:null,display_order:2,publication_status:'published'},
           C:{id:'tC',name:'Écologie',slug:'ecologie',parent_id:null,display_order:3,publication_status:'published'} };
const link=(...k)=>k.map(x=>({theme_id:TH[x].id,themes:TH[x]}));
const mk=(id,title,order,themes)=>({id,title,display_order:order,reliability_level:'high',measure_themes:themes});
const base=[mk('m1','Mesure 1',1,link('B','A')),mk('m2','Mesure 2',2,link('C')),mk('m3','Mesure 3',3,link('C','B')),mk('m4','Mesure 4',4,[]),mk('m5','Mesure 5',5,link('A'))];
const cand=ms=>({id:'c1',election_id:'e1',candidacy_status:'declared',reliability_level:'medium',publication_status:'published',people:person,parties:party,elections:{id:'e1',name:'Présidentielle 2027',year:2027,publication_status:'published'},
 candidacy_sources:[],candidacy_sponsorship_territories:[],programs:[{id:'pr1',title:'Programme',publication_status:'published',program_versions:[{id:'v1',version_number:1,version_label:'v1',publication_status:'published',measures:ms}]}]});
let res=0,bad=0;const rep=(ok,n,i)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',n,ok?'':JSON.stringify(i||''))};
const shuffle=(a,seed)=>{const r=a.slice();let s=seed;for(let i=r.length-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[r[i],r[j]]=[r[j],r[i]]}return r};
(async()=>{
 const br=await chromium.launch();
 const run=async(ms,reverseThemes,w=1000,fail=null)=>{
  const ctx=await br.newContext({viewport:{width:w,height:900}});const errs=[];let sawTheme=false;
  await ctx.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').pop();
   const h={'access-control-allow-origin':'*','access-control-expose-headers':'content-range','access-control-allow-headers':'*','content-type':'application/json'};
   if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:h});
   const sel=u.searchParams.get('select')||'';
   if(t==='candidacies'&&sel.includes('measure_themes')){sawTheme=true;if(fail)return r.fulfill({status:fail,headers:h,body:'{}'});}
   let rows=[];
   if(t==='candidacies'){const c=cand(ms.map(m=>({...m,measure_themes:!sel.includes('measure_themes')?undefined:reverseThemes?m.measure_themes.slice().reverse():m.measure_themes})));rows=[c];}
   h['content-range']=`0-0/${rows.length}`;r.fulfill({status:200,headers:h,body:r.request().method()==='HEAD'?'':JSON.stringify(rows)});});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+'candidat.html#c1',{waitUntil:'networkidle'});await p.waitForTimeout(600);
  const groups=await p.evaluate(()=>[...document.querySelectorAll('.m-group')].map(g=>({h:g.querySelector('h4').childNodes[0].textContent,m:[...g.querySelectorAll('.mlist a.t')].map(a=>a.textContent)})));
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  const links=await p.evaluate(()=>document.querySelectorAll('.mlist a.t').length);
  await ctx.close();return {groups,errs,ov,sawTheme,links};
 };
 const ref=await run(base,false);
 const expect=[{h:'Économie',m:['Mesure 1','Mesure 5']},{h:'Santé',m:['Mesure 3']},{h:'Écologie',m:['Mesure 2']},{h:'Autres propositions',m:['Mesure 4']}];
 rep(JSON.stringify(ref.groups)===JSON.stringify(expect),'groupes attendus (thème de plus petit display_order ; « Autres » en dernier)',ref.groups);
 rep(ref.errs.length===0,'aucune erreur JavaScript',ref.errs);
 let same=true,info=[];
 for(let s=1;s<=6;s++){const r=await run(shuffle(base,s),s%2===0);if(JSON.stringify(r.groups)!==JSON.stringify(ref.groups)){same=false;info.push(r.groups)}}
 rep(same,'6 ordres aléatoires de mesures et de thèmes : groupement identique',info[0]);
 const m=await run(base,false,390);rep(!m.ov,'mobile 390 px : pas de débordement horizontal');
 const f=await run(base,false,1000,400);
 rep(f.sawTheme&&f.groups.length===0&&f.links===5&&f.errs.length===0,'jointure refusée (400) : fiche affichée sans regroupement, mesures présentes',f.groups);
 await br.close();console.log(`${res} contrôles, ${bad} échec(s)`);process.exit(bad?1:0);
})();
