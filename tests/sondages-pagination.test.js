/* Pagination + sondages : plus de 1000 lignes de sondage, un seul sondage (le plus récent) affiché. Playwright, Supabase simulé. */
const { chromium } = require('playwright');
const B='http://localhost:8765/site-politique-/';
let res=0,bad=0;
const rep=(ok,name,info)=>{res++;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',name,ok?'':JSON.stringify(info||''))};
const person={id:'p1',first_name:'A',last_name:'B',publication_status:'published'};
const party={id:'pa1',name:'P',acronym:'P',publication_status:'published'};
const pb={publication_status:'published'};
const chain=(n)=>({version_label:'v1',...pb,programs:{...pb,candidacies:{id:'c1',election_id:'e1',...pb,people:person,parties:party}}});
const mkMeasures=n=>Array.from({length:n},(_,i)=>({id:'m'+String(i).padStart(5,'0'),title:'M'+i,reliability_level:'high',...pb,display_order:i%7,program_versions:chain(),measure_themes:[{theme_id:'S1',themes:{id:'S1',...pb}}]}));
const mkCands=n=>Array.from({length:n},(_,i)=>({id:'c'+String(i).padStart(5,'0'),election_id:'e1',candidacy_status:'declared',...pb,display_order:i%5,announcement_date:'2026-01-01',people:{...person,id:'p'+i},parties:party}));
const mkProgs=n=>Array.from({length:n},(_,i)=>({id:'pr'+String(i).padStart(5,'0'),title:'P'+i,...pb,candidacy_id:'c1',candidacies:{id:'c1',election_id:'e1',...pb,people:person,parties:party},program_versions:[]}));
const mkObs=n=>Array.from({length:n},(_,i)=>({id:'o'+String(i).padStart(5,'0'),indicator_id:'i1',country_id:'fr',period_end:'2025-'+String(1+i%12).padStart(2,'0')+'-28',value:i,...pb,countries:{name:'France',iso2:'FR',...pb},sources:{title:'S',url:'https://e.org',...pb}}));
const mkPolls=n=>Array.from({length:n},(_,i)=>({id:'q'+String(i).padStart(5,'0'),election_id:'e1',record_kind:'poll',entity_kind:'person',poll_date:'2026-11-1'+(i%3),snapshot_date:'2026-11-12',value_percent:i%10,...pb,people:person,sources:{id:'s',title:'S',...pb}}));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sortBy=(rows,order)=>{ // ties résolus au hasard si l'ordre ne contient pas id (comportement non déterministe réel)
  const keys=(order||'').split(',').filter(Boolean).map(k=>{const [c,d,n]=k.split('.');return {c,desc:d==='desc',nullsLast:n==='nullslast'}});
  const a=shuffle(rows.slice());
  return a.sort((x,y)=>{for(const k of keys){const p=x[k.c],q=y[k.c];if(p===q)continue;if(p==null)return k.nullsLast?1:-1;if(q==null)return k.nullsLast?-1:1;const c=p<q?-1:1;return k.desc?-c:c}return 0});
};
async function run(browser,data,fn,opts={}){
  const ctx=await browser.newContext(); const reqs=[]; const errs=[];
  await ctx.route('**/rest/v1/**',r=>{
    const req=r.request(),u=new URL(req.url()),t=u.pathname.split('/').pop();
    const h={'access-control-allow-origin':'*','access-control-expose-headers':'content-range','access-control-allow-headers':'*','content-type':'application/json'};
    if(req.method()==='OPTIONS')return r.fulfill({status:204,headers:h});
    const q=u.searchParams, lim=q.get('limit'), off=+(q.get('offset')||0), pref=req.headers()['prefer']||'';
    reqs.push({t,limit:lim,offset:off,order:q.get('order'),count:/count=exact/.test(pref)});
    let rows=data[t]||[];
    rows=rows.filter(x=>{for(const [k,v] of q){if(k.includes('.')||!v.startsWith('eq.'))continue;if(k in x&&String(x[k])!==v.slice(3))return false}return true});
    const total=rows.length; rows=sortBy(rows,q.get('order'));
    const cap=opts.maxRows||1000; const n=Math.min(lim?+lim:cap,cap);
    const part=rows.slice(off,off+n);
    h['content-range']=part.length?`${off}-${off+part.length-1}/${/count=exact/.test(pref)?(opts.badTotal?total+5:total):'*'}`:`*/${total}`;
    r.fulfill({status:200,headers:h,body:JSON.stringify(part)});
  });
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+'index.html',{waitUntil:'networkidle'});
  const out=await fn(p,reqs); await ctx.close(); return {out,reqs,errs};
}
const call=(p,expr)=>p.evaluate(async e=>{try{const v=await eval(e);return {ok:true,v}}catch(x){return {ok:false,kind:x.kind,msg:x.message}}},expr);

const el={id:'e1',name:'Présidentielle 2027',year:2027,election_type:'general',scheduled_date:'2027-06-10',...pb,country_id:'fr',description:null,countries:{id:'fr',name:'France',iso2:'FR',...pb}};
const mkp=(id,date,pub,pollster,v,i)=>({id,election_id:'e1',snapshot_date:'2026-11-15',record_kind:'poll',poll_date:date,fieldwork_start:date,pollster,entity_kind:'other',entity_label:'L'+i,scenario:'S',sample_size:1000,value_percent:v,...pb,sources:{id:'src-'+pollster+date,title:'Notice '+pollster,url:'https://e.org/'+pollster+date,publisher:'Éd',publication_date:pub,...pb}});
const old=[]; // 1100 lignes : 220 anciens sondages de 5 résultats, dates croissantes
for(let k=0;k<220;k++){const d='2026-0'+(1+k%9)+'-'+String(1+k%27).padStart(2,'0'); for(let i=0;i<5;i++) old.push(mkp('old'+k+'_'+i,d,d,'Ancien'+k,50-i,i));}
const fresh=[0,1,2,3,4].map(i=>mkp('new'+i,'2026-11-12','2026-11-13','Récent',40-i*5,i));
(async()=>{
  const browser=await chromium.launch();
  const {out,reqs,errs}=await run(browser,{elections:[el],poll_snapshots:[...old,...fresh]},async p=>{
    await p.goto(B+'election.html?e=e1',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
    return p.evaluate(()=>({n:document.querySelectorAll('.poll').length,vals:[...document.querySelectorAll('.poll .bar-v')].map(x=>x.innerText),txt:(document.querySelector('.poll')||{}).innerText||''}));
  });
  const pq=reqs.filter(r=>r.t==='poll_snapshots');
  rep(old.length+fresh.length===1105,'fixture : 1105 lignes de sondage (> 1000)');
  rep(pq.length>=2&&pq.some(r=>r.offset>0),'les sondages sont bien lus en plusieurs pages',pq.map(r=>r.offset));
  rep(out.n===1&&out.vals.length===5&&/Récent/.test(out.txt)&&!/Ancien/.test(out.txt),'un seul sondage affiché : le plus récent, ses 5 résultats, aucun ancien',out);
  rep(JSON.stringify(out.vals)===JSON.stringify(['40,0 %','35,0 %','30,0 %','25,0 %','20,0 %']),'résultats classés par ordre décroissant',out.vals);
  rep(!errs.length,'aucune erreur JS',errs);
  await browser.close(); console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad?1:0);
})();
