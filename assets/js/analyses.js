/* ---------- rendu ---------- */
function mini(o, max, unit){
  if(!o) return "—";
  const [v,y,ok] = o;
  const w = Math.round(Math.min(100,(v/max)*100));
  const yr = y && y!==2026 ? ` <u>(${y})</u>` : "";
  return `<span class="mini ${ok?"":"est"}"><span>${v}${yr}</span><i style="width:${Math.round(w*0.5)}px"></i></span>`;
}
function ovTable(){
  const head = "<thead><tr><th>Pays</th><th>Dirigeant · parti</th><th>Période</th><th>Situation au 11 nov. 2026</th><th>Classement</th><th>FH</th><th>RSF</th><th>CPI</th></tr></thead>";
  const body = C.map(c=>{
    const rsfDot = c.ov.rsf[1] ? DV : DE;
    const cpiTxt = typeof c.ov.cpi[0]==="string" ? `<span class="mini">${c.ov.cpi[0]}</span>` : mini(c.ov.cpi,100);
    return `<tr>
      <td><a class="nm" href="#${c.id}">${esc(c.name)}</a></td>
      <td>${esc(c.leader)}<span class="sub">${esc(c.party)}</span></td>
      <td>${esc(c.period)}</td>
      <td><span class="chip ${c.end==="ongoing"?"on":""}">${c.end==="ongoing"?"En cours":c.end==="lost"?"Pouvoir perdu":"Terminé"}</span><span class="sub">${esc(c.status)}</span></td>
      <td><span class="chip c${c.lvl}">${LV["c"+c.lvl]}</span></td>
      <td>${mini(c.ov.fh,100)}</td>
      <td class="num"><span class="mono">${esc(c.ov.rsf[0])}</span>${rsfDot}</td>
      <td>${cpiTxt}</td></tr>`;
  }).join("");
  document.getElementById("ovt").innerHTML = head + "<tbody>"+body+"</tbody>";
}
function chart(ch){
  const W=640,H=210,pl=8,pr=8,pt=22,pb=28;
  const vals = ch.bars.map(b=>b.v);
  const mx = Math.max(0,...vals), mn = Math.min(0,...vals), span = (mx-mn)||1;
  const y = v => pt + (mx-v)/span*(H-pt-pb);
  const n = ch.bars.length, slot=(W-pl-pr)/n, bw=Math.min(40,slot*0.64), y0=y(0);
  let s = `<line class="ax" x1="${pl}" x2="${W-pr}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}"/>`;
  ch.bars.forEach((b,i)=>{
    const x = pl + i*slot + (slot-bw)/2, yy=y(b.v), top=Math.min(yy,y0), h=Math.max(1,Math.abs(yy-y0));
    s += `<rect class="b ${b.p}${b.e?" est":""}" x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"><title>${esc(b.l)} : ${nf(b.v)} ${esc(ch.u)}${b.e?" (estimation)":""}</title></rect>`;
    const ly = b.v>=0 ? top-5 : top+h+11;
    s += `<text class="vl" x="${(x+bw/2).toFixed(1)}" y="${ly.toFixed(1)}">${nf(b.v)}</text>`;
    s += `<text class="xl" x="${(x+bw/2).toFixed(1)}" y="${H-8}">${esc(b.l)}</text>`;
  });
  const used = [...new Set(ch.bars.map(b=>b.p))];
  const order = ["pre","in","fc","post"];
  const lg = order.filter(k=>used.includes(k)).map(k=>`<span><i class="${k}"></i>${esc((ch.lg&&ch.lg[k])||PH[k])}</span>`).join("");
  const hasEst = ch.bars.some(b=>b.e);
  return `<div class="chartbox"><div class="ct">${esc(ch.t)}</div><div class="cu">${esc(ch.u)}</div>
    <svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ch.t)}">${s}</svg>
    <div class="lg">${lg}${hasEst?'<span><i class="est"></i>Teinte claire : estimation</span>':""}</div>
    <p class="cnote">${esc(ch.note)}</p></div>`;
}
function trend(ts){
  return ts.map(a=>{
    const v=a[1];
    const cells=[-2,-1,0,1,2].map(k=>`<i class="${v===k?"on "+(k<0?"n":k>0?"p":"z"):""}"></i>`).join("");
    return `<div class="tr"><span class="tl">${esc(a[0])}</span><span class="scale" aria-hidden="true">${cells}</span><span class="tn">${v===null?"Non évalué":TL[String(v)]}</span></div>`;
  }).join("");
}
function country(c){
  const kp = c.k.map(k=>`<div class="kpi"><span class="kl">${esc(k[0])}</span><strong class="kv ${k[3]}">${esc(k[1])}</strong><span class="ks">${fm(k[2])}</span></div>`).join("");
  const rows = c.rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="num">${fm(r[1])}</td><td class="num">${fm(r[2])}</td><td><span class="chip ${r[3]}">${TN[r[3]]}</span></td></tr>`).join("");
  const li = a => a.map(t=>`<li>${fm(t)}</li>`).join("");
  const src = c.src.map(s=>`<li><a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join("");
  return `<section class="country" id="${c.id}" aria-labelledby="${c.id}-h">
   <header class="c-head">
     <span class="c-code">${c.code}</span>
     <div><h2 id="${c.id}-h">${esc(c.name)}</h2><p class="c-lead">${esc(c.leader)} · ${esc(c.party)}</p></div>
     <div class="c-meta"><span class="chip">${esc(c.period)}</span><span class="chip ${c.end==="ongoing"?"on":""}">${esc(c.status)}</span><span class="chip c${c.lvl}">${LV["c"+c.lvl]}</span></div>
   </header>
   <div class="c-grid">
     <article class="ctx"><h3>Avant le mandat</h3><p>${fm(c.ctx)}</p></article>
     <div class="kpis">${kp}</div>
   </div>
   <div class="two">
     <div class="panel"><h3>Indicateurs : avant et pendant</h3>
       <div class="scroll"><table><thead><tr><th>Indicateur</th><th>Avant</th><th>Pendant ou dernier chiffre</th><th>Lecture</th></tr></thead><tbody>${rows}</tbody></table></div></div>
     <div class="panel"><h3>Tendance</h3>${chart(c.chart)}</div>
   </div>
   <div class="trend"><h3>Direction par rapport à la tendance d’avant mandat</h3><p class="sub">Lecture éditoriale, pas un score officiel.</p><div class="trs">${trend(c.tr)}</div></div>
   <div class="bilan">
     <section class="p"><h3><b>+</b> Points positifs</h3><ul>${li(c.pos)}</ul></section>
     <section class="m"><h3><b>±</b> Points mitigés</h3><ul>${li(c.mix)}</ul></section>
     <section class="n"><h3><b>−</b> Points négatifs</h3><ul>${li(c.neg)}</ul></section>
   </div>
   <div class="lecture"><h3>Lecture</h3>${c.lect.map(p=>`<p>${fm(p)}</p>`).join("")}</div>
   <details class="src"><summary>Sources (${c.src.length})</summary><ul>${src}</ul></details>
  </section>`;
}
(function init(){
  document.getElementById("nav").innerHTML =
    '<a href="#overview"><b>ALL</b>Vue d’ensemble</a>' +
    C.map(c=>`<a href="#${c.id}"><b>${c.code}</b>${esc(c.name)}</a>`).join("") +
    '<a href="#methode"><b>i</b>Méthode</a>';
  document.getElementById("findings").innerHTML = FINDINGS.map(f=>`<article><h3>${esc(f[0])}</h3><p>${fm(f[1])}</p></article>`).join("");
  ovTable();
  const DIV = '<div class="divider" id="comparer"><p class="label">Pour comparer</p><h2 class="sec">Deux cas hors périmètre</h2><p class="lede2">La France de Macron (centre) et l’Espagne de Sánchez (gauche) ne relèvent pas du périmètre « droites radicales ». Elles servent de points de repère, avec le même format de fiche.</p></div>';
  document.getElementById("countries").innerHTML = C.map((c,i)=> (c.cmp && !C[i-1].cmp ? DIV : "") + country(c)).join("");
})();
