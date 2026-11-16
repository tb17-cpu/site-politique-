#!/usr/bin/env node
/* Cache-busting des fichiers statiques (GitHub Pages sert JS/CSS avec un cache navigateur).
   Chaque référence « assets/…js|css » des pages HTML reçoit « ?v=<empreinte du contenu du fichier> » : l'URL ne change que
   lorsque le fichier change, un navigateur ne garde donc jamais une ancienne version après un déploiement, et les fichiers
   inchangés restent en cache.
   Usage :  node tools/cache-bust.js           met à jour les pages HTML
            node tools/cache-bust.js --check   ne modifie rien ; code 1 si une référence est périmée ou le fichier absent
   À lancer avant chaque déploiement (aucune infrastructure, aucune dépendance). */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");
const hash = f => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8);
const REF = /((?:src|href)=")(assets\/[^"?#]+\.(?:js|css))(\?v=[0-9a-f]+)?(")/g;
let stale = 0, missing = 0, changed = 0;
for (const page of fs.readdirSync(root).filter(f => f.endsWith(".html")).sort()) {
  const file = path.join(root, page), html = fs.readFileSync(file, "utf8");
  const out = html.replace(REF, (m, a, rel, v, z) => {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) { missing++; console.error(`ABSENT  ${page} -> ${rel}`); return m; }
    const want = `?v=${hash(f)}`;
    if (v !== want) { stale++; if (check) console.error(`PÉRIMÉ  ${page} -> ${rel} (${v || "sans version"} ≠ ${want})`); }
    return a + rel + want + z;
  });
  if (!check && out !== html) { fs.writeFileSync(file, out); changed++; }
}
if (check) { console.log(stale || missing ? `${stale} référence(s) périmée(s), ${missing} absente(s)` : "Références à jour"); process.exit(stale || missing ? 1 : 0); }
console.log(`${changed} page(s) mise(s) à jour${missing ? `, ${missing} fichier(s) absent(s)` : ""}`);
process.exit(missing ? 1 : 0);
