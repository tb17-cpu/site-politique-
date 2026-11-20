/* Apparence du site : clair, sombre ou automatique (préférence du système).
   Chargé dans <head>, de façon synchrone, AVANT les feuilles de style : <html data-theme="light|dark"> est posé avant le premier
   affichage, il n'y a donc aucun flash de couleurs. Le choix (clé « ar.theme » : light, dark ou auto) est mémorisé dans le navigateur.
   Sans choix enregistré, ou si le stockage est indisponible, le site s'ouvre en CLAIR, quel que soit le réglage du système ;
   « automatique » (suivre le système) n'est actif que si le visiteur l'a choisi. Le sélecteur de l'en-tête est construit par layout.js. */
(function () {
  var KEY = "ar.theme", root = document.documentElement, mq = null, pref = "light";
  var read = function () { try { var v = localStorage.getItem(KEY); return v === "light" || v === "dark" || v === "auto" ? v : "light"; } catch (e) { return "light"; } };
  var write = function (v) { try { localStorage.setItem(KEY, v); } catch (e) { /* stockage indisponible : le choix vaut pour cette page seulement */ } };
  var system = function () { return mq && mq.matches ? "dark" : "light"; };
  try { mq = window.matchMedia("(prefers-color-scheme: dark)"); } catch (e) { mq = null; }
  var COLORS = { light: "#ffffff", dark: "#0f1a2f" };   /* barre du navigateur sur mobile = couleur de l'en-tête */
  var meta = function (t) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m && document.head) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    if (m) m.content = COLORS[t];
  };
  var apply = function (animate) {
    var t = pref === "auto" ? system() : pref;
    if (animate) { root.classList.add("theme-anim"); clearTimeout(apply.t); apply.t = setTimeout(function () { root.classList.remove("theme-anim"); }, 350); }
    root.setAttribute("data-theme", t);
    root.setAttribute("data-theme-pref", pref);
    meta(t);
    document.dispatchEvent(new CustomEvent("themechange", { detail: { pref: pref, theme: t } }));
  };
  pref = read();
  apply(false);
  /* Mode automatique : suit le système en direct. Autre onglet : suit le choix qui vient d'y être fait. */
  var follow = function () { if (pref === "auto") apply(true); };
  if (mq) { if (mq.addEventListener) mq.addEventListener("change", follow); else if (mq.addListener) mq.addListener(follow); }
  window.addEventListener("storage", function (e) { if (e.key === KEY || e.key === null) { pref = read(); apply(true); } });
  window.Theme = {
    pref: function () { return pref; },
    theme: function () { return root.getAttribute("data-theme"); },
    set: function (v) { pref = v === "dark" || v === "auto" ? v : "light"; write(pref); apply(true); }
  };
})();
