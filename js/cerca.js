/* Sito di Leo - ricerca istantanea in tutto il sito (riferimento + manuale).
   Si apre con il pulsante "Cerca" dell'intestazione, con il tasto "/" o con Ctrl+K (Cmd+K).
   Gli indici (js/indice_riferimento.js e js/indice_manuale.js) si caricano con <script> solo
   alla prima apertura: niente fetch, quindi funziona anche aprendo i file dal disco e dentro
   le app, senza internet. Nessun tracciamento. */
(function () {
  "use strict";
  var doc = document;
  var questo = doc.currentScript || doc.querySelector('script[src$="js/cerca.js"]');
  var radice = questo ? questo.getAttribute("src").replace(/js\/cerca\.js.*$/, "") : "";
  var caricati = false, inCaricamento = false, attese = [];
  var voci = [];

  function tutti(sel, dentro) { return Array.prototype.slice.call((dentro || doc).querySelectorAll(sel)); }
  function normalizza(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9_.]+/g, " ").trim();
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function carica(fatto) {
    if (caricati) { fatto(); return; }
    attese.push(fatto);
    if (inCaricamento) return;
    inCaricamento = true;
    var file = ["js/indice_riferimento.js", "js/indice_manuale.js"], mancano = file.length;
    file.forEach(function (f) {
      var s = doc.createElement("script");
      s.src = radice + f;
      s.onload = s.onerror = function () { if (--mancano === 0) pronto(); };
      doc.head.appendChild(s);
    });
    function pronto() {
      caricati = true;
      (window.INDICE_RIFERIMENTO || []).forEach(function (v) {
        voci.push({ t: v.t, k: v.k || "", c: v.c || "", u: radice + v.u, d: v.d || "",
          nt: normalizza(v.t), np: normalizza((v.p || "") + " " + (v.c || "")), nd: normalizza(v.d || ""), peso: v.k === "Funzione" || v.k === "Controllo" ? 3 : v.k === "Concetto" ? 4 : 2 });
      });
      (window.INDICE_MANUALE || []).forEach(function (v) {
        voci.push({ t: v.t, k: "Manuale", c: v.s, u: radice + "manuale/" + v.p + (v.a ? "#" + v.a : ""), d: (v.x || "").slice(0, 160),
          nt: normalizza(v.t), np: normalizza(v.s), nd: normalizza((v.x || "").slice(0, 1200)), peso: 1 });
      });
      attese.splice(0).forEach(function (f) { f(); });
    }
  }

  function punteggio(v, q, parole) {
    var p = 0;
    if (v.nt === q) p += 120;
    else if (v.nt.indexOf(q) === 0) p += 70;
    else if (v.nt.indexOf(q) >= 0) p += 40;
    for (var i = 0; i < parole.length; i++) {
      var w = parole[i], trovata = false;
      if (v.nt.indexOf(w) >= 0) { p += 12; trovata = true; }
      if (v.np.indexOf(w) >= 0) { p += 5; trovata = true; }
      if (v.nd.indexOf(w) >= 0) { p += 3; trovata = true; }
      if (!trovata) return 0;
    }
    return p ? p + v.peso : 0;
  }
  function cerca(testo) {
    var q = normalizza(testo);
    if (!q) return [];
    var parole = q.split(" ").filter(Boolean);
    var r = [];
    for (var i = 0; i < voci.length; i++) {
      var p = punteggio(voci[i], q, parole);
      if (p) r.push({ v: voci[i], p: p });
    }
    r.sort(function (a, b) { return b.p - a.p || a.v.t.length - b.v.t.length; });
    return r.slice(0, 40).map(function (x) { return x.v; });
  }
  function evidenzia(t, q) {
    var n = normalizza(t), w = normalizza(q).split(" ")[0];
    var i = w ? n.indexOf(w) : -1;
    if (i < 0 || n.length !== t.length) return esc(t);
    return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + w.length)) + "</mark>" + esc(t.slice(i + w.length));
  }

  /* ------------------------------------------------------------ finestra di ricerca */
  var velo, campo, elenco, stato, scelto = -1, risultati = [], ultimoFuoco = null;
  function costruisci() {
    if (velo) return;
    velo = doc.createElement("div");
    velo.className = "cerca-velo";
    velo.hidden = true;
    velo.innerHTML =
      '<div class="cerca-finestra" role="dialog" aria-modal="true" aria-label="Cerca nel sito di Leo">' +
      '<div class="cerca-campo-riga"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>' +
      '<label class="solo-lettori" for="cerca-campo">Cerca nel sito</label>' +
      '<input id="cerca-campo" class="cerca-campo" type="search" autocomplete="off" spellcheck="false" placeholder="Cerca funzioni, controlli, parole, pagine del manuale" role="combobox" aria-expanded="true" aria-controls="cerca-risultati" aria-autocomplete="list">' +
      '<button class="cerca-chiudi" type="button" aria-label="Chiudi la ricerca"><kbd>Esc</kbd></button></div>' +
      '<div id="cerca-risultati" class="cerca-risultati" role="listbox" aria-label="Risultati"></div>' +
      '<p class="cerca-piede"><span><kbd>↑</kbd><kbd>↓</kbd> scegli</span><span><kbd>Invio</kbd> apri</span><span class="cerca-stato" aria-live="polite"></span></p>' +
      '</div>';
    doc.body.appendChild(velo);
    campo = velo.querySelector(".cerca-campo");
    elenco = velo.querySelector(".cerca-risultati");
    stato = velo.querySelector(".cerca-stato");
    velo.addEventListener("mousedown", function (e) { if (e.target === velo) chiudi(); });
    velo.querySelector(".cerca-chiudi").addEventListener("click", chiudi);
    campo.addEventListener("input", aggiorna);
    campo.addEventListener("keydown", function (e) {
      var voci = tutti(".cerca-voce", elenco);
      if (e.key === "ArrowDown") { e.preventDefault(); segna(Math.min(voci.length - 1, scelto + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); segna(Math.max(0, scelto - 1)); }
      else if (e.key === "Enter") { var a = voci[scelto < 0 ? 0 : scelto]; if (a) { e.preventDefault(); vai(a.getAttribute("href")); } }
      else if (e.key === "Escape") { e.preventDefault(); chiudi(); }
      else if (e.key === "Tab") { e.preventDefault(); }
    });
    elenco.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest(".cerca-voce") : null;
      if (a) { e.preventDefault(); vai(a.getAttribute("href")); }
    });
  }
  function vai(url) { chiudi(); location.href = url; }
  function segna(i) {
    var voci = tutti(".cerca-voce", elenco);
    scelto = i;
    voci.forEach(function (a, n) { a.setAttribute("aria-selected", n === i ? "true" : "false"); });
    if (voci[i]) { voci[i].scrollIntoView({ block: "nearest" }); campo.setAttribute("aria-activedescendant", voci[i].id); }
  }
  function aggiorna() {
    var q = campo.value;
    if (!caricati) { stato.textContent = "Carico l'indice…"; carica(aggiorna); return; }
    risultati = cerca(q);
    scelto = -1;
    if (!q.trim()) {
      elenco.innerHTML = '<p class="cerca-vuoto">Scrivi il nome di una funzione (<code>leggi_tabella</code>), di un controllo (<code>Pulsante</code>) o una parola del linguaggio (<code>per ogni</code>).</p>';
      stato.textContent = voci.length + " voci";
      return;
    }
    if (!risultati.length) {
      elenco.innerHTML = '<p class="cerca-vuoto">Nessun risultato per «' + esc(q) + '». Prova con meno parole o con il nome di una funzione.</p>';
      stato.textContent = "Nessun risultato";
      return;
    }
    elenco.innerHTML = risultati.map(function (v, i) {
      return '<a class="cerca-voce" role="option" id="cerca-v' + i + '" aria-selected="false" href="' + esc(v.u) + '">' +
        '<span class="cerca-tipo cerca-' + esc(normalizza(v.k).replace(/ /g, "-")) + '">' + esc(v.k) + '</span>' +
        '<span class="cerca-testo"><strong>' + evidenzia(v.t, q) + '</strong><span>' + esc(v.d) + '</span></span>' +
        '<span class="cerca-dove">' + esc(v.c) + '</span></a>';
    }).join("");
    segna(0);
    stato.textContent = risultati.length + (risultati.length === 1 ? " risultato" : " risultati");
  }
  function apri(testo) {
    costruisci();
    ultimoFuoco = doc.activeElement;
    velo.hidden = false;
    doc.documentElement.classList.add("cerca-aperta");
    campo.value = testo || "";
    campo.focus();
    carica(aggiorna);
    aggiorna();
  }
  function chiudi() {
    if (!velo || velo.hidden) return;
    velo.hidden = true;
    doc.documentElement.classList.remove("cerca-aperta");
    if (ultimoFuoco && ultimoFuoco.focus) ultimoFuoco.focus();
  }
  window.LeoCerca = { apri: apri, chiudi: chiudi };

  function collega() {
    tutti("[data-apri-cerca]").forEach(function (b) { b.addEventListener("click", function () { apri(""); }); });
    tutti("[data-cerca-prova]").forEach(function (b) { b.addEventListener("click", function () { apri(b.getAttribute("data-cerca-prova")); }); });
    tutti("[data-cerca-campo]").forEach(function (c) {
      c.addEventListener("focus", function () { var v = c.value; c.blur(); apri(v); });
    });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", collega); else collega();

  doc.addEventListener("keydown", function (e) {
    var t = e.target, scrive = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); apri(""); return; }
    // nel manuale "/" porta alla sua ricerca: qui solo Ctrl+K
    if (e.key === "/" && !scrive && !e.ctrlKey && !e.metaKey && !e.altKey && !doc.querySelector(".m-cerca-campo")) {
      e.preventDefault(); apri("");
    }
  });
})();
