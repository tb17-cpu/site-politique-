/* Rendu Markdown sûr, sans dépendance. Tout le texte est échappé AVANT toute mise en forme : aucun HTML
   présent dans la source n'est jamais interprété. Les liens n'acceptent que http(s) et les ancres internes.
   Pris en charge : titres, paragraphes, gras, italique, code, liens, listes (imbriquées), citations, filets, tableaux, blocs de code.
   Les titres du texte sont décalés (« # » devient un titre de niveau `base`) pour respecter la hiérarchie de la page. */
(function (root) {
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const safeUrl = u => { const t = String(u || "").trim(); return /^(https?:\/\/[^\s<>"']+|#[\w\-%.]+)$/i.test(t) ? t : ""; };

  function inline(raw) {
    const hold = []; const keep = h => "\u0000" + (hold.push(h) - 1) + "\u0000";
    let s = String(raw == null ? "" : raw).replace(/\u0000/g, "");
    s = s.replace(/`([^`\n]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));
    s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, t, u) => { const ok = safeUrl(u); return keep(ok ? `<a href="${esc(ok)}"${ok[0] === "#" ? "" : ' target="_blank" rel="noopener noreferrer"'}>${esc(t)}</a>` : esc(t)); });
    s = esc(s);
    s = s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^\w])__([^_\n]+?)__(?!\w)/g, "$1<strong>$2</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\*)/g, "$1<em>$2</em>").replace(/(^|[^\w])_([^_\s][^_\n]*?)_(?!\w)/g, "$1<em>$2</em>");
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => hold[+i]);
  }

  function render(md, opt) {
    const base = Math.min(6, Math.max(1, (opt && opt.headingBase) || 3));
    const lines = String(md == null ? "" : md).replace(/\r\n?/g, "\n").split("\n");
    const out = []; let i = 0;
    const isBlank = l => /^\s*$/.test(l);
    const bullet = l => /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);
    const startsBlock = l => /^\s{0,3}(#{1,6}\s|>|```|([-*_])\s*(\2\s*){2,}$)/.test(l) || bullet(l) || /^\s*\|.*\|\s*$/.test(l);

    function list(startIdx) {
      const first = bullet(lines[startIdx]), baseIndent = first[1].length, ordered = /\d/.test(first[2][0]);
      let html = ordered ? "<ol>" : "<ul>", k = startIdx;
      while (k < lines.length) {
        const m = bullet(lines[k]);
        if (!m || m[1].length < baseIndent) break;
        if (m[1].length > baseIndent) { // sous-liste : rattachée à l'élément précédent
          const sub = list(k); html = html.replace(/<\/li>$/, "") + sub.html + "</li>"; k = sub.next; continue;
        }
        let text = m[3]; k++;
        while (k < lines.length && !isBlank(lines[k]) && !bullet(lines[k]) && /^\s+\S/.test(lines[k])) { text += " " + lines[k].trim(); k++; }
        html += `<li>${inline(text)}</li>`;
        if (k < lines.length && isBlank(lines[k]) && k + 1 < lines.length && bullet(lines[k + 1]) && bullet(lines[k + 1])[1].length >= baseIndent) k++;
      }
      return { html: html + (ordered ? "</ol>" : "</ul>"), next: k };
    }

    while (i < lines.length) {
      const l = lines[i];
      if (isBlank(l)) { i++; continue; }
      let m;
      if ((m = /^\s{0,3}```/.exec(l))) { const buf = []; i++; while (i < lines.length && !/^\s{0,3}```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`); continue; }
      if ((m = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { const lv = Math.min(6, base + m[1].length - 1); out.push(`<h${lv}>${inline(m[2])}</h${lv}>`); i++; continue; }
      if (/^\s{0,3}([-*_])\s*(\1\s*){2,}$/.test(l)) { out.push("<hr>"); i++; continue; }
      if (/^\s{0,3}>/.test(l)) { const buf = []; while (i < lines.length && /^\s{0,3}>/.test(lines[i])) buf.push(lines[i++].replace(/^\s{0,3}>\s?/, "")); out.push(`<blockquote>${render(buf.join("\n"), opt)}</blockquote>`); continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        const head = cells(l); i += 2; const body = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) body.push(cells(lines[i++]));
        out.push(`<div class="md-table"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); continue;
      }
      if (bullet(l)) { const r = list(i); out.push(r.html); i = r.next; continue; }
      const buf = [l.trim()]; i++;
      while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) buf.push(lines[i++].trim());
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
    return out.join("\n");
  }
  const api = { render, inline, esc };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MD = api;
})(typeof window !== "undefined" ? window : globalThis);
