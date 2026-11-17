/* Cache-busting : les pages référencent leurs JS/CSS avec une empreinte de contenu à jour (node tests/cache.test.js). Aucun réseau. */
const fs = require("fs"), path = require("path"), os = require("os"), { spawnSync } = require("child_process");
const root = path.resolve(__dirname, ".."), tool = path.join(root, "tools", "cache-bust.js");
let res = 0, bad = 0; const rep = (ok, n, i) => { res++; if (!ok) bad++; console.log(ok ? "ok  " : "FAIL", n, ok ? "" : JSON.stringify(i || "")); };
rep(spawnSync("node", [tool, "--check"]).status === 0, "références à jour dans le dépôt");
const pages = fs.readdirSync(root).filter(f => f.endsWith(".html"));
const unversioned = pages.flatMap(p => (fs.readFileSync(path.join(root, p), "utf8").match(/(?:src|href)="assets\/[^"?#]+\.(?:js|css)"/g) || []).map(m => p + " " + m));
rep(unversioned.length === 0, "aucune référence locale JS/CSS sans empreinte", unversioned.slice(0, 3));
// simulation : copie du dépôt, un JS modifié -> --check doit échouer, puis la mise à jour doit corriger
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cb-")); fs.mkdirSync(path.join(tmp, "tools")); fs.mkdirSync(path.join(tmp, "assets", "js"), { recursive: true }); fs.mkdirSync(path.join(tmp, "assets", "css"), { recursive: true });
fs.copyFileSync(tool, path.join(tmp, "tools", "cache-bust.js"));
fs.writeFileSync(path.join(tmp, "assets", "js", "a.js"), "1"); fs.writeFileSync(path.join(tmp, "assets", "css", "a.css"), "x");
fs.writeFileSync(path.join(tmp, "p.html"), '<link rel="stylesheet" href="assets/css/a.css"><script src="assets/js/a.js"></script><a href="https://e.org/x.js">');
const run = a => spawnSync("node", [path.join(tmp, "tools", "cache-bust.js"), ...a]);
rep(run(["--check"]).status === 1, "page sans empreinte : détectée");
rep(run([]).status === 0 && run(["--check"]).status === 0, "mise à jour puis contrôle : à jour");
const h1 = fs.readFileSync(path.join(tmp, "p.html"), "utf8");
rep(/assets\/js\/a\.js\?v=[0-9a-f]{8}"/.test(h1) && /assets\/css\/a\.css\?v=[0-9a-f]{8}"/.test(h1) && h1.includes('href="https://e.org/x.js"'), "empreintes ajoutées, liens externes intacts");
fs.writeFileSync(path.join(tmp, "assets", "js", "a.js"), "2");
rep(run(["--check"]).status === 1, "fichier JS modifié : référence périmée détectée");
run([]); const h2 = fs.readFileSync(path.join(tmp, "p.html"), "utf8");
rep(h2 !== h1 && h2.match(/a\.css\?v=([0-9a-f]+)/)[1] === h1.match(/a\.css\?v=([0-9a-f]+)/)[1], "seul le fichier modifié change d'empreinte (le CSS inchangé reste en cache)");
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${res} contrôles, ${bad} échec(s)`); process.exit(bad ? 1 : 0);
