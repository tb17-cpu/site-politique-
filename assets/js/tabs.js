/* Onglets de la page Analyses internationales.
   #extreme-droite et #gauche sont les deux onglets ; tout autre #ancre (pays, #overview, #methode)
   ouvre l’onglet qui la contient. Les liens existants (analyses-internationales.html#hu…) continuent donc de fonctionner. */
(function () {
  const $ = id => document.getElementById(id);
  const bar = $("a-bar"), nav = $("nav"), chipsBox = document.querySelector(".chips-nav");
  const panels = { extreme: $("extreme-droite"), gauche: $("gauche") };
  const tabs = { extreme: $("tab-extreme"), gauche: $("tab-gauche") };
  const chipsExtreme = nav.innerHTML;
  const chipsGauche = G.map(c => `<a href="#${c.id}"><b>${c.code}</b>${esc(c.name)}</a>`).join("");

  $("countries-gauche").innerHTML = G.map(country).join("");
  $("g-empty").hidden = G.length > 0;

  /* Onglet « La gauche au pouvoir » : visible seulement lorsqu'il contient des fiches. */
  if (G.length === 0 && tabs.gauche) tabs.gauche.hidden = true;
  const gaucheIds = new Set(G.length ? ["gauche"].concat(G.map(c => c.id)) : [])
  let current = null;
  const setBarH = () => document.documentElement.style.setProperty("--bar-h", bar.offsetHeight + "px");

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const k = gaucheIds.has(h) ? "gauche" : "extreme";
    const changed = k !== current;
    if (changed) {
      current = k;
      Object.keys(panels).forEach(n => {
        panels[n].hidden = n !== k;
        if (n === k) tabs[n].setAttribute("aria-current", "page"); else tabs[n].removeAttribute("aria-current");
      });
      nav.innerHTML = k === "extreme" ? chipsExtreme : chipsGauche;   /* la barre de pays suit l’onglet */
      chipsBox.hidden = (k === "gauche" && G.length === 0);
      setBarH();
    }
    const target = h && document.getElementById(h);
    if (h === "gauche" || h === "extreme-droite") panels[k].scrollIntoView();
    else if (target && changed) target.scrollIntoView();
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("resize", setBarH);
  window.addEventListener("load", () => {
    setBarH();
    const t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t && !t.hidden) t.scrollIntoView();
  });
  route();
})();
