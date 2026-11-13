/* ---------- helpers ---------- */
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const DV = '<i class="dot v" role="img" aria-label="source consultée"></i>';
const DE = '<i class="dot e" role="img" aria-label="estimation à confirmer"></i>';
const fm = s => s==null ? "" : esc(s).replace(/\^/g,DV).replace(/~/g,DE);
const nf = v => v.toLocaleString("fr-FR",{maximumFractionDigits:1});
const B = (l,v,p,e) => ({l,v,p,e:!!e});

const LV = {c0:"Hors périmètre · comparaison",c1:"Classement largement partagé",c2:"Classement débattu",c3:"Classement très contesté"};
const TN = {pos:"Mieux",neg:"Pire",mix:"Mitigé",neu:"Neutre"};
const TL = {"-2":"Net recul","-1":"Recul","0":"Stable ou mixte","1":"Progrès","2":"Net progrès"};
const PH = {pre:"Avant le mandat",in:"Pendant le mandat",fc:"Prévision",post:"Hors mandat"};

