/* Manuale di Leo: ricerca istantanea, indice laterale con la sezione attiva,
   pulsanti "Copia", barra di lettura, "torna su", cassetto dell'indice sul telefono,
   comparse leggere. Niente moduli, niente fetch: funziona anche aprendo i file dal disco.
   L'indice di ricerca arriva da js/indice_manuale.js (window.INDICE_MANUALE). */
(function () {
  "use strict";

  var doc = document;
  var radice = doc.documentElement;
  var riduci = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function tutti(sel, dentro) { return Array.prototype.slice.call((dentro || doc).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ testo normalizzato */
  function normalizza(t) {
    t = String(t || "").toLowerCase();
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return t.replace(/[^a-z0-9_]+/g, " ").trim();
  }
  function escHtml(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* ------------------------------------------------------------------ ricerca */
  var indice = (window.INDICE_MANUALE || []).map(function (v) {
    return { v: v, t: normalizza(v.t), s: normalizza(v.s), x: normalizza(v.x) };
  });

  function parole(q) { return normalizza(q).split(" ").filter(function (p) { return p.length > 0; }); }

  function punteggio(voce, termini, frase) {
    var tot = 0;
    for (var i = 0; i < termini.length; i++) {
      var p = termini[i];
      var inTitolo = (" " + voce.t + " ").indexOf(" " + p) >= 0;
      var inSezione = (" " + voce.s + " ").indexOf(" " + p) >= 0;
      var inTesto = voce.x.indexOf(p);
      if (!inTitolo && !inSezione && inTesto < 0 && voce.t.indexOf(p) < 0) return 0;
      if (inTitolo) tot += 30;
      else if (voce.t.indexOf(p) >= 0) tot += 16;
      if (inSezione) tot += 6;
      if (inTesto >= 0) {
        tot += 4;
        var volte = voce.x.split(p).length - 1;
        tot += Math.min(volte, 8);
      }
    }
    if (frase.length > 2 && termini.length > 1) {
      if (voce.t.indexOf(frase) >= 0) tot += 40;
      else if (voce.x.indexOf(frase) >= 0) tot += 14;
    }
    if (voce.v.l === 1) tot -= 2;
    return tot;
  }

  /* evidenzia i termini in un testo originale (con accenti): confronto sul testo normalizzato carattere per carattere */
  function evidenzia(originale, termini) {
    if (!termini.length) return escHtml(originale);
    var norm = "", mappa = [];
    for (var i = 0; i < originale.length; i++) {
      var c = originale[i].toLowerCase();
      if (c.normalize) c = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      for (var k = 0; k < c.length; k++) { norm += c[k]; mappa.push(i); }
    }
    var segni = new Array(originale.length);
    termini.forEach(function (p) {
      var da = 0, pos;
      while ((pos = norm.indexOf(p, da)) >= 0) {
        if (pos > 0 && /[a-z0-9_]/.test(norm[pos - 1])) { da = pos + 1; continue; }
        for (var j = pos; j < pos + p.length; j++) segni[mappa[j]] = true;
        da = pos + p.length;
      }
    });
    var out = "", dentro = false;
    for (var n = 0; n < originale.length; n++) {
      if (segni[n] && !dentro) { out += "<mark>"; dentro = true; }
      if (!segni[n] && dentro) { out += "</mark>"; dentro = false; }
      out += escHtml(originale[n]);
    }
    if (dentro) out += "</mark>";
    return out;
  }

  function estratto(testo, termini) {
    if (!testo) return "";
    var norm = normalizza(testo);
    var primo = -1;
    termini.forEach(function (p) { var i = norm.indexOf(p); if (i >= 0 && (primo < 0 || i < primo)) primo = i; });
    /* la posizione nel testo normalizzato e' vicina a quella nell'originale: basta per un estratto */
    var inizio = Math.max(0, primo - 70);
    var pezzo = testo.slice(inizio, inizio + 190);
    if (inizio > 0) pezzo = "…" + pezzo.replace(/^\S*\s/, "");
    if (inizio + 190 < testo.length) pezzo = pezzo.replace(/\s\S*$/, "") + "…";
    return evidenzia(pezzo, termini);
  }

  function cerca(q) {
    var termini = parole(q);
    if (!termini.length) return [];
    var frase = termini.join(" ");
    var trovati = [];
    indice.forEach(function (voce) {
      var p = punteggio(voce, termini, frase);
      if (p > 0) trovati.push({ voce: voce, p: p });
    });
    trovati.sort(function (a, b) { return b.p - a.p || a.voce.v.n - b.voce.v.n; });
    var visti = {};
    return trovati.filter(function (r) {
      var k = r.voce.v.p + "#" + r.voce.v.a;
      if (visti[k]) return false;
      visti[k] = true;
      return true;
    }).slice(0, 12).map(function (r) { return r.voce.v; }).concat([]).map(function (v) { v._termini = termini; return v; });
  }

  function collegaRicerca(box) {
    var campo = box.querySelector(".m-cerca-campo");
    var elenco = box.querySelector(".m-risultati");
    var stato = box.querySelector(".m-cerca-stato");
    if (!campo || !elenco) return;
    var scelto = -1;
    var voci = [];

    function chiudi() { elenco.hidden = true; scelto = -1; campo.setAttribute("aria-expanded", "false"); }
    function apri() { elenco.hidden = false; campo.setAttribute("aria-expanded", "true"); }

    function segna(i) {
      voci.forEach(function (a, n) { a.setAttribute("aria-selected", n === i ? "true" : "false"); });
      scelto = i;
      if (voci[i]) voci[i].scrollIntoView({ block: "nearest" });
    }

    function mostra() {
      var q = campo.value;
      if (!q.trim()) { chiudi(); elenco.innerHTML = ""; if (stato) stato.textContent = ""; return; }
      var risultati = cerca(q);
      if (!risultati.length) {
        elenco.innerHTML = '<div class="m-nessuno">Nessun risultato per <strong>' + escHtml(q) +
          "</strong>. Prova con un'altra parola, per esempio il nome di una funzione o di un controllo.</div>";
        voci = [];
        apri();
        if (stato) stato.textContent = "Nessun risultato.";
        return;
      }
      elenco.innerHTML = risultati.map(function (v, i) {
        var dove = (v.n < 10 ? "0" : "") + v.n + " · " + v.s;
        var href = v.p + "?evidenzia=" + encodeURIComponent(v._termini.join(" ")) + (v.a ? "#" + v.a : "");
        return '<a class="m-risultato" role="option" id="' + campo.id + "-r" + i + '" href="' + href + '">' +
          '<span class="m-risultato-dove">' + escHtml(dove) + "</span>" +
          '<span class="m-risultato-titolo">' + evidenzia(v.t, v._termini) + "</span>" +
          '<span class="m-risultato-testo">' + estratto(v.x, v._termini) + "</span></a>";
      }).join("");
      voci = tutti(".m-risultato", elenco);
      scelto = -1;
      apri();
      if (stato) stato.textContent = risultati.length + (risultati.length === 1 ? " risultato." : " risultati.");
    }

    campo.setAttribute("role", "combobox");
    campo.setAttribute("aria-autocomplete", "list");
    campo.setAttribute("aria-expanded", "false");
    campo.addEventListener("input", mostra);
    campo.addEventListener("focus", function () { if (campo.value.trim()) mostra(); });
    campo.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (voci.length) segna(Math.min(scelto + 1, voci.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (voci.length) segna(Math.max(scelto - 1, 0)); }
      else if (e.key === "Enter") {
        var voce = voci[scelto >= 0 ? scelto : 0];
        if (voce) { e.preventDefault(); voce.click(); }
      } else if (e.key === "Escape") {
        if (campo.value) { campo.value = ""; mostra(); } else { campo.blur(); }
        chiudi();
      }
    });
    doc.addEventListener("click", function (e) { if (!box.contains(e.target)) chiudi(); });
    elenco.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest(".m-risultato");
      if (!a) return;
      chiudi();
      /* nella stessa pagina: solo scorrere ed evidenziare */
      var url = a.getAttribute("href");
      var pagina = url.split("?")[0];
      var qui = location.pathname.split("/").pop() || "index.html";
      if (pagina === qui) {
        e.preventDefault();
        var ancora = url.split("#")[1];
        var termini = decodeURIComponent((url.split("evidenzia=")[1] || "").split("#")[0]);
        evidenziaPagina(termini, ancora);
        chiudiCassetto();
      }
    });
  }

  tutti(".m-cerca").forEach(collegaRicerca);

  tutti("[data-prova-ricerca]").forEach(function (b) {
    b.addEventListener("click", function () {
      var campo = doc.getElementById("m-cerca-grande");
      if (!campo) return;
      campo.value = b.getAttribute("data-prova-ricerca");
      campo.dispatchEvent(new Event("input"));
      campo.focus();
    });
  });

  /* "/" porta alla ricerca (se non si sta scrivendo altrove) */
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var campo = doc.getElementById("m-cerca-grande") || doc.getElementById("m-cerca-lato");
    if (!campo) return;
    e.preventDefault();
    if (window.innerWidth <= 1020 && campo.id === "m-cerca-lato") apriCassetto();
    campo.focus();
    campo.select();
  });

  /* ------------------------------------------------------------------ evidenzia i termini cercati nella pagina */
  function evidenziaPagina(termini, ancora) {
    var corpo = doc.querySelector(".m-corpo");
    tutti("mark.m-evidenza").forEach(function (m) {
      var t = doc.createTextNode(m.textContent);
      m.parentNode.replaceChild(t, m);
      t.parentNode.normalize();
    });
    var destinazione = ancora ? doc.getElementById(ancora) : null;
    var lista = parole(termini).filter(function (p) { return p.length > 1; });
    if (corpo && lista.length) {
      /* solo nella parte che comincia dal titolo trovato (o in tutta la pagina) */
      var inizio = destinazione || corpo.firstElementChild;
      var nodi = [];
      var el = inizio;
      var fermati = false;
      while (el && !fermati) {
        if (el !== inizio && destinazione && /^H[23]$/.test(el.tagName) &&
            (el.tagName === "H2" || destinazione.tagName === "H3")) break;
        var giro = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        var n;
        while ((n = giro.nextNode())) {
          if (n.parentNode.closest && n.parentNode.closest(".m-ancora, .m-copia, script, style")) continue;
          nodi.push(n);
        }
        el = el.nextElementSibling;
      }
      var primo = null;
      nodi.forEach(function (nodo) {
        var testo = nodo.nodeValue;
        var html = evidenzia(testo, lista);
        if (html.indexOf("<mark>") < 0) return;
        var span = doc.createElement("span");
        span.innerHTML = html.replace(/<mark>/g, '<mark class="m-evidenza">');
        var frammento = doc.createDocumentFragment();
        while (span.firstChild) frammento.appendChild(span.firstChild);
        nodo.parentNode.replaceChild(frammento, nodo);
      });
      primo = doc.querySelector("mark.m-evidenza");
      setTimeout(function () { tutti("mark.m-evidenza").forEach(function (m) { m.classList.add("svanisci"); }); }, 4500);
      if (!destinazione && primo) destinazione = primo;
    }
    if (destinazione) {
      destinazione.scrollIntoView({ behavior: riduci ? "auto" : "smooth", block: destinazione.tagName && /^H/.test(destinazione.tagName) ? "start" : "center" });
      if (destinazione.tagName === "H2") {
        destinazione.classList.remove("lampeggia");
        void destinazione.offsetWidth;
        destinazione.classList.add("lampeggia");
      }
      if (ancora && history.replaceState) history.replaceState(null, "", "#" + ancora);
    }
  }

  (function () {
    var m = /[?&]evidenzia=([^&#]*)/.exec(location.search);
    if (!m) return;
    var termini = decodeURIComponent(m[1].replace(/\+/g, " "));
    var ancora = location.hash ? decodeURIComponent(location.hash.slice(1)) : "";
    window.addEventListener("load", function () { evidenziaPagina(termini, ancora); });
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.hash);
  })();

  /* ------------------------------------------------------------------ copia codice */
  function copiaTesto(testo) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(testo).catch(function () { return copiaVecchioStile(testo); });
    }
    return Promise.resolve(copiaVecchioStile(testo));
  }
  function copiaVecchioStile(testo) {
    var area = doc.createElement("textarea");
    area.value = testo;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    doc.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
    doc.body.removeChild(area);
    if (!ok) throw new Error("copia non riuscita");
    return ok;
  }
  tutti(".m-copia").forEach(function (b) {
    var etichetta = b.querySelector("span");
    b.addEventListener("click", function () {
      var codice = b.closest(".m-codice").querySelector(".m-pre code");
      var righe = tutti(".r", codice).map(function (r) {
        var copia = r.cloneNode(true);
        tutti(".m-prompt", copia).forEach(function (p) { p.remove(); });
        return copia.textContent;
      });
      var testo = (righe.length ? righe.join("\n") : codice.textContent) + "\n";
      Promise.resolve().then(function () { return copiaTesto(testo); }).then(function () {
        b.classList.add("copiato");
        if (etichetta) etichetta.textContent = "Copiato!";
        b.setAttribute("aria-label", "Codice copiato");
        setTimeout(function () {
          b.classList.remove("copiato");
          if (etichetta) etichetta.textContent = "Copia";
          b.setAttribute("aria-label", "Copia il codice");
        }, 1800);
      }).catch(function () {
        if (etichetta) etichetta.textContent = "Seleziona e copia";
        var sel = window.getSelection();
        var r = doc.createRange();
        r.selectNodeContents(codice);
        sel.removeAllRanges();
        sel.addRange(r);
      });
    });
  });

  /* ------------------------------------------------------------------ indice attivo durante lo scorrimento */
  var collegamentiToc = tutti(".m-toc a[data-toc]");
  var titoli = collegamentiToc.map(function (a) { return doc.getElementById(a.getAttribute("data-toc")); }).filter(Boolean);
  var doveMobile = doc.querySelector(".m-barra-dove");
  var titoloBase = doveMobile ? doveMobile.textContent : "";
  var attuale = null;

  function aggiornaAttivo() {
    if (!titoli.length) return;
    var soglia = 140;
    var scelto = null;
    for (var i = 0; i < titoli.length; i++) {
      if (titoli[i].getBoundingClientRect().top - soglia <= 0) scelto = titoli[i];
      else break;
    }
    /* in fondo alla pagina: l'ultimo titolo */
    if ((window.innerHeight + window.scrollY) >= doc.documentElement.scrollHeight - 4) scelto = titoli[titoli.length - 1];
    if (scelto === attuale) return;
    attuale = scelto;
    collegamentiToc.forEach(function (a) {
      var si = scelto && a.getAttribute("data-toc") === scelto.id;
      a.classList.toggle("attivo", !!si);
      if (si) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
    });
    if (doveMobile) doveMobile.textContent = scelto ? scelto.textContent.replace(/#$/, "") : titoloBase;
  }

  /* ------------------------------------------------------------------ barra di lettura e torna su */
  var barra = doc.querySelector(".m-progresso span");
  var su = doc.querySelector(".m-su");
  var articolo = doc.querySelector(".m-articolo") || doc.querySelector("main");
  var inAttesa = false;
  function alloScorrere() {
    if (inAttesa) return;
    inAttesa = true;
    requestAnimationFrame(function () {
      inAttesa = false;
      if (barra && articolo) {
        var r = articolo.getBoundingClientRect();
        var totale = r.height - window.innerHeight;
        var letto = totale > 0 ? Math.min(1, Math.max(0, -r.top / totale)) : 1;
        barra.style.setProperty("--m-letto", letto.toFixed(4));
      }
      if (su) su.classList.toggle("visibile", window.scrollY > 700);
      aggiornaAttivo();
    });
  }
  window.addEventListener("scroll", alloScorrere, { passive: true });
  window.addEventListener("resize", alloScorrere);
  alloScorrere();
  if (su) {
    su.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: riduci ? "auto" : "smooth" });
      var destinazione = doc.getElementById("contenuto");
      if (destinazione) { destinazione.setAttribute("tabindex", "-1"); destinazione.focus({ preventScroll: true }); }
    });
  }

  /* ------------------------------------------------------------------ cassetto dell'indice (telefono) */
  var lato = doc.getElementById("m-lato");
  var apriIndice = doc.querySelector(".m-apri-indice");
  var velo = doc.querySelector(".m-velo");
  function apriCassetto() {
    if (!lato || !apriIndice) return;
    lato.classList.add("aperto");
    apriIndice.setAttribute("aria-expanded", "true");
    if (velo) { velo.hidden = false; requestAnimationFrame(function () { velo.classList.add("visibile"); }); }
    doc.body.style.overflow = "hidden";
    var corrente = lato.querySelector(".m-toc a.attivo") || lato.querySelector("[aria-current='page']");
    if (corrente) corrente.scrollIntoView({ block: "center" });
  }
  function chiudiCassetto() {
    if (!lato || !lato.classList.contains("aperto")) return;
    lato.classList.remove("aperto");
    if (apriIndice) apriIndice.setAttribute("aria-expanded", "false");
    if (velo) { velo.classList.remove("visibile"); setTimeout(function () { velo.hidden = true; }, 300); }
    doc.body.style.overflow = "";
  }
  if (apriIndice) {
    apriIndice.addEventListener("click", function () {
      if (lato.classList.contains("aperto")) chiudiCassetto(); else apriCassetto();
    });
  }
  if (velo) velo.addEventListener("click", function () { chiudiCassetto(); if (apriIndice) apriIndice.focus(); });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lato && lato.classList.contains("aperto")) { chiudiCassetto(); if (apriIndice) apriIndice.focus(); }
  });
  if (lato) {
    lato.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".m-toc a")) chiudiCassetto();
    });
  }

  /* ------------------------------------------------------------------ comparse leggere */
  if (!riduci && "IntersectionObserver" in window) {
    var blocchi = tutti(".m-corpo > .m-codice, .m-corpo > .m-riquadro, .m-corpo > .m-tabella, .compari-scorrendo");
    var sotto = blocchi.filter(function (b) { return b.getBoundingClientRect().top > window.innerHeight; });
    sotto.forEach(function (b) { b.classList.add("fuori"); });
    var osservatore = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) {
          v.target.classList.remove("fuori");
          v.target.classList.add("visibile");
          osservatore.unobserve(v.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    sotto.forEach(function (b, i) {
      if (b.classList.contains("compari-scorrendo")) b.style.transitionDelay = ((i % 3) * 70) + "ms";
      osservatore.observe(b);
    });
  }

  /* luce che segue il mouse sulle schede dell'indice */
  tutti(".m-scheda a").forEach(function (a) {
    a.addEventListener("pointermove", function (e) {
      var r = a.getBoundingClientRect();
      a.style.setProperty("--mx", (e.clientX - r.left) + "px");
      a.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* schema di Leo Studio: passando sulla legenda si accende la zona */
  tutti("[data-zona]").forEach(function (a) {
    var zona = doc.getElementById(a.getAttribute("data-zona"));
    if (!zona) return;
    function on() { zona.classList.add("acceso"); }
    function off() { zona.classList.remove("acceso"); }
    a.addEventListener("mouseenter", on);
    a.addEventListener("mouseleave", off);
    a.addEventListener("focus", on);
    a.addEventListener("blur", off);
  });

  /* stampa: apri tutte le domande */
  window.addEventListener("beforeprint", function () {
    tutti("details.m-domanda").forEach(function (d) { if (!d.open) { d.open = true; d.setAttribute("data-aperto-stampa", ""); } });
  });
  window.addEventListener("afterprint", function () {
    tutti("details[data-aperto-stampa]").forEach(function (d) { d.open = false; d.removeAttribute("data-aperto-stampa"); });
  });

  radice.classList.add("m-pronto");
})();
