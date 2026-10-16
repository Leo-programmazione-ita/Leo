/* Sito di Leo - comportamento comune a tutte le pagine.
   Tema chiaro/scuro, sito dentro l'app Android (anche offline), avviso "senza internet",
   menu del telefono, valori da config.js, comparse allo scorrimento, contatori,
   racconto a scorrimento della home, interfaccia animata, "Copia" del codice,
   filtri della pagina Template. Nessun tracciamento, nessun cookie, nessun modulo ES:
   funziona anche aprendo i file con un doppio clic. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var C = window.LEO_CONFIG || {};
  var riduci = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var haIO = "IntersectionObserver" in window;

  function tutti(sel, radice) { return Array.prototype.slice.call((radice || document).querySelectorAll(sel)); }
  function testo(v) { return (v == null ? "" : String(v)).trim(); }


  /* ------------------------------------------------------------------ tema nero-rosso / chiaro
     Di serie il tema e' quello NERO E ROSSO di Leo ("scuro"). La scelta e' ricordata nel browser
     (localStorage "leo-tema": "scuro" | "chiaro" | "sistema"); "sistema" (facoltativo) segue il
     tema del dispositivo. Dentro l'app Leo la scelta viaggia in window.name ("leo-app:chiaro"),
     che resta da una pagina all'altra. Il cambio e' immediato, senza ricaricare. */
  var inApp = doc.classList.contains("in-app");
  var mqChiaro = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  function normalizza(s) { return s === "chiaro" || s === "sistema" ? s : "scuro"; }
  function leggiScelta() {
    if (inApp) return normalizza(String(window.name || "").split(":")[1]);
    try { return normalizza(localStorage.getItem("leo-tema")); } catch (e) { return "scuro"; }
  }
  function risolvi(scelta) { return scelta === "sistema" ? (mqChiaro && mqChiaro.matches ? "chiaro" : "scuro") : scelta; }
  function temaEffettivo() { return doc.getAttribute("data-tema") === "chiaro" ? "chiaro" : "scuro"; }
  function applicaTema(scelta) {
    scelta = normalizza(scelta);
    doc.setAttribute("data-tema", risolvi(scelta));
    doc.setAttribute("data-tema-scelto", scelta);
    if (inApp) { try { window.name = "leo-app:" + scelta; } catch (e) { /* niente */ } }
    else { try { localStorage.setItem("leo-tema", scelta); } catch (e) { /* niente */ } }
    aggiornaControlliTema();
    try { document.dispatchEvent(new CustomEvent("leo:tema", { detail: { tema: temaEffettivo() } })); } catch (e) { /* niente */ }
  }
  function aggiornaControlliTema() {
    var scelta = leggiScelta(), eff = temaEffettivo();
    tutti("[data-tema-scelta]").forEach(function (b) {
      var si = b.getAttribute("data-tema-scelta") === scelta;
      b.setAttribute("aria-checked", si ? "true" : "false");
      b.tabIndex = si ? 0 : -1;
    });
    tutti("[data-cambia-tema]").forEach(function (b) {
      b.setAttribute("aria-label", eff === "scuro" ? "Passa al tema chiaro" : "Passa al tema nero e rosso");
      b.title = eff === "scuro" ? "Tema chiaro" : "Tema nero e rosso";
    });
    tutti('meta[name="theme-color"]').forEach(function (m) { m.content = eff === "scuro" ? "#050506" : "#FFFFFF"; m.removeAttribute("media"); });
  }
  tutti("[data-cambia-tema]").forEach(function (b) {
    b.addEventListener("click", function () { applicaTema(temaEffettivo() === "scuro" ? "chiaro" : "scuro"); });
  });
  tutti("[data-tema-scelta]").forEach(function (b) {
    b.addEventListener("click", function () { applicaTema(b.getAttribute("data-tema-scelta")); });
    b.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var fratelli = tutti("[data-tema-scelta]", b.parentNode), i = fratelli.indexOf(b);
      var dopo = fratelli[(i + (e.key === "ArrowRight" ? 1 : fratelli.length - 1)) % fratelli.length];
      e.preventDefault(); dopo.focus(); dopo.click();
    });
  });
  if (mqChiaro) {
    var alCambio = function () { if (leggiScelta() === "sistema") applicaTema("sistema"); };
    if (mqChiaro.addEventListener) mqChiaro.addEventListener("change", alCambio); else if (mqChiaro.addListener) mqChiaro.addListener(alCambio);
  }
  doc.setAttribute("data-tema-scelto", leggiScelta());
  aggiornaControlliTema();

  /* ------------------------------------------------------------------ manifest (solo sul web)
     Da file:// (doppio clic, app) il browser rifiuterebbe il manifest con un errore: lo si aggiunge solo online. */
  if (/^https?:$/.test(location.protocol) && !document.querySelector('link[rel="manifest"]')) {
    var icona = document.querySelector('link[rel="icon"]');
    if (icona) {
      var man = document.createElement("link");
      man.rel = "manifest";
      man.href = icona.getAttribute("href").replace(/img\/stemma\.svg$/, "manifest.webmanifest");
      if (/manifest\.webmanifest$/.test(man.href)) document.head.appendChild(man);
    }
  }

  /* ------------------------------------------------------------------ dentro l'app Leo (Android)
     L'app apre il sito in un riquadro (iframe name="leo-app..."). Il tasto Indietro del telefono lo
     gestisce l'app: la pagina le dice dove si trova e, quando l'app lo chiede, torna alla pagina precedente.
     I link verso altri siti o altre app (download, email, telefono) si aprono fuori dall'app. */
  if (inApp) {
    var genitore = window.parent && window.parent !== window ? window.parent : null;
    var avvisa = function () { if (genitore) { try { genitore.postMessage({ leoSito: "pagina", url: location.href, titolo: document.title }, "*"); } catch (e) { /* niente */ } } };
    avvisa();
    window.addEventListener("hashchange", avvisa);
    window.addEventListener("message", function (e) {
      if (!genitore || e.source !== genitore || !e.data || e.data.leoSito !== "vai") return;
      var dest = String(e.data.url || "");
      // solo pagine di questo stesso sito (stesso schema, stessa cartella "sito/")
      if (dest.indexOf(location.protocol) !== 0 || dest.indexOf("/sito/") < 0) return;
      try { location.replace(dest); } catch (x) { location.href = dest; }
    });
    tutti("a[target]").forEach(function (a) { if (!/^(https?:|mailto:|tel:)/.test(a.getAttribute("href") || "")) a.removeAttribute("target"); });
  }

  /* ------------------------------------------------------------------ senza internet
     Il sito e' fatto di file locali e funziona anche offline (dall'app o aprendo index.html);
     solo i video non presenti sul dispositivo e i download hanno bisogno della rete. */
  function aggiornaRete() {
    var offline = navigator.onLine === false;
    doc.classList.toggle("offline", offline);
    tutti("[data-avviso-rete]").forEach(function (el) { el.hidden = !offline; });
    document.dispatchEvent(new CustomEvent("leo:rete", { detail: { offline: offline } }));
  }
  window.addEventListener("online", aggiornaRete);
  window.addEventListener("offline", aggiornaRete);
  aggiornaRete();

  /* ------------------------------------------------------------------ config */
  var email = testo(C.emailContatto);
  tutti("[data-email]").forEach(function (el) {
    if (!email) {
      if (el.tagName === "A" && el.closest(".piede")) { el.textContent = "Contatti (email in arrivo)"; el.removeAttribute("href"); }
      else { el.textContent = "l'indirizzo email che sarà pubblicato qui"; if (el.tagName === "A") el.removeAttribute("href"); }
      return;
    }
    if (!el.closest(".piede")) el.textContent = email;
    if (el.tagName === "A") el.href = "mailto:" + email;
  });
  tutti("[data-mailto]").forEach(function (el) {
    if (!email) { el.setAttribute("aria-disabled", "true"); el.removeAttribute("href"); return; }
    var oggetto = el.getAttribute("data-mailto") || "";
    el.href = "mailto:" + email + (oggetto ? "?subject=" + encodeURIComponent(oggetto) : "");
  });
  var telefono = testo(C.telefonoLicenza);
  tutti("[data-telefono]").forEach(function (el) {
    var et = el.querySelector(".etichetta") || el;
    if (!telefono) {
      et.textContent = "Numero in arrivo";
      el.removeAttribute("href"); el.setAttribute("aria-disabled", "true"); el.classList.add("in-arrivo");
      return;
    }
    et.textContent = "Chiama " + telefono;
    el.href = "tel:" + telefono.replace(/[^+0-9]/g, "");
    el.classList.remove("in-arrivo"); el.removeAttribute("aria-disabled");
  });
  tutti("[data-giorni]").forEach(function (el) { el.textContent = String(C.giorniProva || 90); });

  var url = testo(C.urlDownload), urlAndroid = testo(C.urlDownloadAndroid);
  tutti("[data-scarica]").forEach(function (el) {
    var etichetta = el.querySelector(".etichetta") || el;
    var android = el.getAttribute("data-scarica") === "android";
    var indirizzo = android ? urlAndroid : url;
    if (indirizzo) {
      el.href = indirizzo;
      el.classList.remove("in-arrivo");
      el.removeAttribute("aria-disabled");
      etichetta.textContent = android ? "Scarica l'app Android" : "Scarica Leo";
    } else {
      el.removeAttribute("href");
      el.setAttribute("role", "link");
      el.setAttribute("aria-disabled", "true");
      el.classList.add("in-arrivo");
      etichetta.textContent = "Link in arrivo";
      var svg = el.querySelector("svg");
      if (svg) svg.style.display = "none";
      if (!el.querySelector(".punto-arrivo")) {
        var p = document.createElement("span"); p.className = "punto-arrivo"; p.setAttribute("aria-hidden", "true");
        el.insertBefore(p, el.firstChild);
      }
    }
  });
  tutti("[data-se-link]").forEach(function (el) { el.hidden = !(el.getAttribute("data-se-link") === "android" ? urlAndroid : url); });
  tutti("[data-se-no-link]").forEach(function (el) { el.hidden = !!(el.getAttribute("data-se-no-link") === "android" ? urlAndroid : url); });
  if (testo(C.versioneAndroid)) tutti("[data-dettagli-android]").forEach(function (el) { el.textContent = "Versione " + testo(C.versioneAndroid) + " · " + el.textContent; });
  var dettagli = [];
  if (testo(C.versione)) dettagli.push("Versione " + testo(C.versione));
  if (testo(C.dimensione)) dettagli.push(testo(C.dimensione));
  tutti("[data-dettagli-download]").forEach(function (el) {
    if (dettagli.length) el.textContent = dettagli.join(" · ") + " · " + el.textContent;
  });

  var cifra = document.getElementById("prezzo-cifra");
  if (cifra) {
    var prezzo = testo(C.prezzo);
    cifra.textContent = prezzo || "Prezzo in arrivo";
    var nota = document.getElementById("prezzo-nota");
    if (nota) nota.textContent = testo(C.notaPrezzo) || (prezzo ? "" : "Il prezzo della licenza sarà pubblicato qui.");
    var paga = document.getElementById("prezzo-azione");
    if (paga && testo(C.linkPagamento)) {
      paga.href = testo(C.linkPagamento);
      paga.removeAttribute("data-mailto"); paga.removeAttribute("aria-disabled");
      paga.rel = "noopener";
      var et = paga.querySelector(".etichetta"); if (et) et.textContent = "Acquista la licenza";
    }
  }
  tutti("[data-anno]").forEach(function (el) { el.textContent = String(Math.max(2026, new Date().getFullYear())); });

  /* ------------------------------------------------------------------ strisce a scorrimento (telefono.html)
     Frecce che scorrono la striscia di una schermata alla volta; si spengono agli estremi. */
  tutti("[data-scorri]").forEach(function (b) {
    var s = document.getElementById(b.getAttribute("aria-controls"));
    if (!s) return;
    var aggiorna = function () {
      var max = s.scrollWidth - s.clientWidth - 4;
      tutti("[data-scorri]").forEach(function (x) {
        if (x.getAttribute("aria-controls") !== s.id) return;
        x.disabled = x.getAttribute("data-scorri") === "-1" ? s.scrollLeft <= 4 : s.scrollLeft >= max;
      });
    };
    b.addEventListener("click", function () {
      var passo = (s.firstElementChild ? s.firstElementChild.getBoundingClientRect().width + 26 : 300);
      s.scrollBy({ left: passo * parseInt(b.getAttribute("data-scorri"), 10), behavior: riduci ? "auto" : "smooth" });
    });
    s.addEventListener("scroll", aggiorna, { passive: true });
    window.addEventListener("resize", aggiorna);
    aggiorna();
  });

  /* ------------------------------------------------------------------ menu */
  var bottone = document.querySelector(".apri-menu");
  var nav = document.getElementById("navigazione");
  if (bottone && nav) {
    var chiudi = function () { nav.classList.remove("aperta"); bottone.setAttribute("aria-expanded", "false"); bottone.setAttribute("aria-label", "Apri il menu"); };
    bottone.addEventListener("click", function () {
      var aperto = nav.classList.toggle("aperta");
      bottone.setAttribute("aria-expanded", aperto ? "true" : "false");
      bottone.setAttribute("aria-label", aperto ? "Chiudi il menu" : "Apri il menu");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("aperta")) { chiudi(); bottone.focus(); } });
    tutti("a", nav).forEach(function (a) { a.addEventListener("click", chiudi); });
  }

  /* ------------------------------------------------ parole che salgono */
  tutti(".parole").forEach(function (el) {
    var i = 0;
    (function avvolgi(nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var pezzi = n.textContent.split(/(\s+)/);
          var fr = document.createDocumentFragment();
          pezzi.forEach(function (pz) {
            if (!pz) return;
            if (/^\s+$/.test(pz)) { fr.appendChild(document.createTextNode(pz)); return; }
            var s = document.createElement("span"); s.className = "p"; s.style.setProperty("--i", i++); s.textContent = pz;
            fr.appendChild(s);
          });
          n.parentNode.replaceChild(fr, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") { avvolgi(n); }
      });
    })(el);
  });

  /* ------------------------------------------------ fili d'oro: lunghezza */
  tutti(".filo path, .disegna path, .disegna line, .disegna .traccia").forEach(function (p) {
    try { var l = Math.ceil(p.getTotalLength ? p.getTotalLength() : 1000); p.style.setProperty("--lung", l); } catch (e) { /* niente */ }
  });

  /* ------------------------------------------------ contatori */
  function conta(el) {
    var fine = parseFloat(el.getAttribute("data-conta")) || 0;
    var dopo = el.getAttribute("data-dopo") || "";
    var formato = function (n) { return Math.round(n).toLocaleString("it-IT") + dopo; };
    if (riduci) { el.textContent = formato(fine); return; }
    var t0 = null, durata = 1800;
    function passo(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / durata);
      var e = 1 - Math.pow(1 - k, 4);
      el.textContent = formato(fine * e);
      if (k < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  /* ------------------------------------------------ comparse */
  var daOsservare = tutti(".compari, .parole, .disegna, .filo, .numero-grande, .potere, .traduzione, .tempi, .osserva");
  function mostra(el) {
    el.classList.add("visibile");
    tutti("[data-conta]", el).concat(el.hasAttribute("data-conta") ? [el] : []).forEach(function (c) {
      if (!c.dataset.contato) { c.dataset.contato = "1"; conta(c); }
    });
    el.dispatchEvent(new CustomEvent("leo:visibile"));
  }
  if (haIO && !riduci) {
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { mostra(v.target); io.unobserve(v.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    daOsservare.forEach(function (el) { io.observe(el); });
  } else {
    daOsservare.forEach(mostra);
  }

  /* ------------------------------------------------ barra di lettura */
  var barra = document.querySelector(".avanzamento");
  if (barra) {
    var aggiorna = function () {
      var h = doc.scrollHeight - innerHeight;
      barra.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")";
    };
    addEventListener("scroll", aggiorna, { passive: true }); aggiorna();
  }

  /* ------------------------------------------------ bagliore delle schede */
  if (!riduci && matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", function (e) {
      var s = e.target.closest && e.target.closest(".scheda");
      if (!s) return;
      var r = s.getBoundingClientRect();
      s.style.setProperty("--mx", (e.clientX - r.left) + "px");
      s.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ------------------------------------------------ copia il codice */
  tutti("[data-copia]").forEach(function (b) {
    b.addEventListener("click", function () {
      var dest = document.getElementById(b.getAttribute("data-copia"));
      if (!dest) return;
      var t = dest.innerText.replace(/ /g, " ");
      var fatto = function () {
        var et = b.querySelector(".etichetta") || b;
        var prima = et.textContent;
        b.classList.add("copiato"); et.textContent = "Copiato!";
        setTimeout(function () { b.classList.remove("copiato"); et.textContent = prima; }, 1800);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(t).then(fatto, function () { vecchioModo(t); fatto(); });
      } else { vecchioModo(t); fatto(); }
    });
  });
  function vecchioModo(t) {
    var a = document.createElement("textarea");
    a.value = t; a.setAttribute("readonly", ""); a.style.position = "fixed"; a.style.opacity = "0";
    document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); } catch (e) { /* niente */ }
    document.body.removeChild(a);
  }


  /* ------------------------------------------------ schede (tablist accessibili)
     [data-schede]: pannelli con hidden. [data-vetrina]: le schermate del telefono si alternano
     (classe "attiva") e, finche' nessuno tocca, avanzano da sole ogni 5 secondi. */
  function schede(radice, vetrina) {
    var voci = tutti('[role="tab"]', radice);
    if (!voci.length) return;
    var fermo = riduci, timer = null;
    function scegli(i, fuoco) {
      voci.forEach(function (v, k) {
        var sel = k === i, pannello = document.getElementById(v.getAttribute("aria-controls"));
        v.setAttribute("aria-selected", sel ? "true" : "false");
        v.tabIndex = sel ? 0 : -1;
        if (pannello) {
          if (vetrina) { pannello.classList.toggle("attiva", sel); pannello.setAttribute("aria-hidden", sel ? "false" : "true"); }
          else pannello.hidden = !sel;
        }
      });
      if (fuoco) voci[i].focus();
    }
    function corrente() { for (var k = 0; k < voci.length; k++) if (voci[k].getAttribute("aria-selected") === "true") return k; return 0; }
    function ferma() { fermo = true; clearInterval(timer); }
    voci.forEach(function (v, i) {
      v.addEventListener("click", function () { ferma(); scegli(i); });
      v.addEventListener("keydown", function (e) {
        var n = voci.length, j = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i + n - 1) % n;
        else if (e.key === "Home") j = 0; else if (e.key === "End") j = n - 1;
        if (j === null) return;
        e.preventDefault(); ferma(); scegli(j, true);
      });
    });
    scegli(corrente());
    if (vetrina && !riduci && haIO) {
      radice.addEventListener("pointerenter", function () { clearInterval(timer); });
      radice.addEventListener("pointerleave", function () { if (!fermo) avvia(); });
      radice.addEventListener("focusin", ferma);
      var avvia = function () {
        clearInterval(timer);
        timer = setInterval(function () { if (!document.hidden) scegli((corrente() + 1) % voci.length); }, 5000);
      };
      new IntersectionObserver(function (v) { if (v[0].isIntersecting && !fermo) avvia(); else clearInterval(timer); }, { threshold: 0.4 }).observe(radice);
    }
  }
  tutti("[data-schede]").forEach(function (r) { schede(r, false); });
  tutti("[data-vetrina]").forEach(function (r) { schede(r, true); });

  /* ------------------------------------------------ home: l'editor "Leo scrive con te"
     Le righe compaiono una dopo l'altra quando l'editor entra nello schermo (una volta sola). */
  tutti(".h-editor[data-scrive]").forEach(function (ed) {
    tutti(".h-righe li", ed).forEach(function (li, i) { li.style.setProperty("--n", i); });
    var parti = function () { ed.classList.add("scrive"); };
    if (riduci || !haIO) { parti(); return; }
    var io = new IntersectionObserver(function (v) { if (v[0].isIntersecting) { parti(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(ed);
  });

  /* ================================================== HOME ================== */
  var hero = document.querySelector(".hero");
  if (hero) {
    /* luce che segue il puntatore */
    var luce = hero.querySelector(".luce-puntatore");
    if (luce && !riduci && matchMedia("(hover: hover)").matches) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        luce.style.setProperty("--lx", (e.clientX - r.left) + "px");
        luce.style.setProperty("--ly", (e.clientY - r.top) + "px");
      }, { passive: true });
    }
    /* scintille d'oro che salgono */
    var tela = hero.querySelector("canvas.scintille");
    if (tela && tela.getContext && !riduci) scintille(tela, hero);
    /* parallasse leggero */
    var strati = tutti("[data-parallasse]");
    if (strati.length && !riduci) {
      var inAttesa = false;
      addEventListener("scroll", function () {
        if (inAttesa) return; inAttesa = true;
        requestAnimationFrame(function () {
          var y = scrollY;
          strati.forEach(function (s) {
            var k = parseFloat(s.getAttribute("data-parallasse")) || 0.1;
            s.style.transform = "translate3d(0," + (y * k).toFixed(1) + "px,0)";
          });
          inAttesa = false;
        });
      }, { passive: true });
    }
    /* il ruggito del leone accende la scena */
    document.addEventListener("leone:ruggito", function () {
      hero.classList.remove("ruggisce"); void hero.offsetWidth; hero.classList.add("ruggisce");
    });
  }

  function scintille(tela, scena) {
    var ctx = tela.getContext("2d"), punti = [], attiva = true, w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function misura() {
      w = tela.clientWidth; h = tela.clientHeight;
      tela.width = w * dpr; tela.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function nuovo(inizio) {
      return { x: w * (0.35 + Math.random() * 0.65), y: inizio ? Math.random() * h : h + 10, r: Math.random() * 1.6 + 0.4,
        v: Math.random() * 0.35 + 0.12, o: Math.random() * 0.6 + 0.2, f: Math.random() * Math.PI * 2 };
    }
    misura();
    var quanti = Math.round(Math.min(70, w / 18));
    for (var i = 0; i < quanti; i++) punti.push(nuovo(true));
    addEventListener("resize", misura);
    if (haIO) new IntersectionObserver(function (v) { attiva = v[0].isIntersecting; if (attiva) requestAnimationFrame(disegna); }).observe(scena);
    function disegna() {
      if (!attiva || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < punti.length; i++) {
        var p = punti[i];
        p.y -= p.v; p.f += 0.02; p.x += Math.sin(p.f) * 0.25;
        if (p.y < -10) punti[i] = p = nuovo(false);
        var a = p.o * Math.min(1, p.y / (h * 0.25));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = "rgba(242,207,122," + a.toFixed(3) + ")";
        ctx.shadowColor = "rgba(212,166,74,.9)"; ctx.shadowBlur = 6;
        ctx.fill();
      }
      requestAnimationFrame(disegna);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden && attiva) requestAnimationFrame(disegna); });
    requestAnimationFrame(disegna);
  }

  /* ------------------------------------------------ racconto a scorrimento */
  var scenaProblema = document.querySelector(".codice-straniero");
  var passiRacconto = tutti(".passo-racconto");
  if (scenaProblema && passiRacconto.length) {
    var attiva = function (el) {
      passiRacconto.forEach(function (p) { p.classList.toggle("attivo", p === el); });
      scenaProblema.setAttribute("data-fase", el.getAttribute("data-fase"));
    };
    if (haIO && !riduci) {
      var ioR = new IntersectionObserver(function (voci) {
        voci.forEach(function (v) { if (v.isIntersecting) attiva(v.target); });
      }, { rootMargin: "-45% 0px -45% 0px" });
      passiRacconto.forEach(function (p) { ioR.observe(p); });
    } else {
      scenaProblema.setAttribute("data-fase", "3");
    }
  }

  /* ------------------------------------------------ l'idea: codice -> frase */
  var trad = document.querySelector(".traduzione");
  if (trad) {
    var righe = tutti("[data-scrivi]", trad);
    var gettoni = tutti(".tk", trad);
    var frasi = tutti(".fp", trad);
    var gruppi = [];
    frasi.forEach(function (f) { var g = f.getAttribute("data-g"); if (gruppi.indexOf(g) < 0) gruppi.push(g); });
    var accendi = function (g) {
      gettoni.forEach(function (t) { t.classList.toggle("acceso", t.getAttribute("data-g") === g); });
      frasi.forEach(function (t) { t.classList.toggle("acceso", t.getAttribute("data-g") === g); });
    };
    var giro = function () {
      var k = 0;
      accendi(gruppi[0]);
      setInterval(function () { k = (k + 1) % (gruppi.length + 1); accendi(k < gruppi.length ? gruppi[k] : null); }, 1700);
    };
    var avviata = false;
    var parti = function () {
      if (avviata) return; avviata = true;
      if (riduci) { giro(); return; }
      /* testo che si scrive da solo, riga per riga */
      var html = righe.map(function (r) { return r.innerHTML; });
      righe.forEach(function (r) { r.style.visibility = "hidden"; });
      var i = 0;
      (function riga() {
        if (i >= righe.length) { trad.querySelector(".cursore-scrittura") && trad.querySelector(".cursore-scrittura").classList.remove("cursore-scrittura"); giro(); return; }
        var r = righe[i];
        var sorgente = document.createElement("span"); sorgente.innerHTML = html[i];
        var testoPieno = sorgente.textContent, n = 0;
        r.style.visibility = "visible"; r.textContent = ""; r.classList.add("cursore-scrittura");
        (function lettera() {
          n++;
          r.textContent = testoPieno.slice(0, n);
          if (n < testoPieno.length) setTimeout(lettera, 28 + Math.random() * 40);
          else { r.innerHTML = html[i]; r.classList.remove("cursore-scrittura"); gettoni = tutti(".tk", trad); i++; setTimeout(riga, 260); }
        })();
      })();
    };
    trad.addEventListener("leo:visibile", parti);
    if (trad.classList.contains("visibile")) parti();
  }

  /* ------------------------------------------------ tre passi: interfaccia */
  var studio = document.querySelector(".studio[data-passo]");
  var bottoniPassi = tutti(".elenco-passi button");
  if (studio && bottoniPassi.length) {
    var contenitorePassi = studio.closest(".tre-passi");
    var corrente = 0, timer = null, DURATA = 4500, inVista = false;
    var editor = studio.querySelector(".editor-mini pre");
    var codiceEditor = editor ? editor.innerHTML : "";
    var vai = function (n, manuale) {
      corrente = n;
      studio.setAttribute("data-passo", String(n));
      bottoniPassi.forEach(function (b, i) {
        if (i + 1 === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      if (n === 1) mira();
      if (n === 2 && editor && !riduci) scriviEditor();
      clearTimeout(timer);
      if (manuale) { contenitorePassi.classList.add("fermo"); return; }
      if (!riduci && inVista) timer = setTimeout(function () { vai(n % 3 + 1); }, DURATA);
    };
    /* il pulsante trascinato atterra esattamente sul pulsante della finestra disegnata */
    var mira = function () {
      var f = studio.querySelector(".fantasma"), pu = studio.querySelector(".puntatore"), dest = studio.querySelector(".pulsante-modulo");
      if (!f || !dest) return;
      var a = f.getBoundingClientRect(), d = dest.getBoundingClientRect();
      var s = studio.getBoundingClientRect().width / (studio.offsetWidth || 1) || 1;
      var tx = ((d.left + d.width / 2) - (a.left + a.width / 2)) / s, ty = ((d.top + d.height / 2) - (a.top + a.height / 2)) / s;
      [f, pu].forEach(function (el) { if (el) { el.style.setProperty("--tx", tx.toFixed(0) + "px"); el.style.setProperty("--ty", ty.toFixed(0) + "px"); } });
    };
    var scriviEditor = function () {
      var s = document.createElement("span"); s.innerHTML = codiceEditor;
      var t = s.textContent, k = 0;
      editor.textContent = "";
      (function passo() {
        k += 2;
        editor.textContent = t.slice(0, k);
        if (k < t.length && studio.getAttribute("data-passo") === "2") setTimeout(passo, 38);
        else editor.innerHTML = codiceEditor;
      })();
    };
    contenitorePassi.style.setProperty("--durata-passo", DURATA + "ms");
    bottoniPassi.forEach(function (b, i) { b.addEventListener("click", function () { vai(i + 1, true); }); });
    if (haIO && !riduci) {
      new IntersectionObserver(function (v) {
        inVista = v[0].isIntersecting;
        if (inVista && !contenitorePassi.classList.contains("fermo")) vai(corrente || 1);
        else clearTimeout(timer);
      }, { threshold: 0.35 }).observe(studio);
    } else {
      contenitorePassi.classList.add("fermo");
      vai(3, true);
    }
  }

  /* ================================================== TEMPLATE ============== */
  var galleria = document.querySelector(".galleria");
  if (galleria) {
    var modelli = tutti(".modello", galleria);
    var cerca = document.getElementById("cerca-modelli");
    var filtriCat = tutti("[data-filtro-categoria]");
    var filtriLiv = tutti("[data-filtro-livello]");
    var conteggio = document.getElementById("conteggio-modelli");
    var vuoto = document.getElementById("nessun-modello");
    var stato = { cat: "tutte", liv: "tutti", q: "" };
    var norm = function (s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
    modelli.forEach(function (m) { m._testo = norm(m.getAttribute("data-cerca") + " " + m.textContent); });
    var applica = function (anima) {
      var q = norm(stato.q).split(/\s+/).filter(Boolean), n = 0;
      modelli.forEach(function (m) {
        var ok = (stato.cat === "tutte" || m.getAttribute("data-categoria") === stato.cat) &&
                 (stato.liv === "tutti" || m.getAttribute("data-livello") === stato.liv) &&
                 q.every(function (p) { return m._testo.indexOf(p) >= 0; });
        m.classList.toggle("nascosto", !ok);
        if (ok) {
          if (anima && !riduci) { m.classList.remove("entra"); void m.offsetWidth; m.style.setProperty("--ritardo", Math.min(n, 8) * 45 + "ms"); m.classList.add("entra"); }
          n++;
        }
      });
      if (conteggio) conteggio.textContent = n === 1 ? "1 template" : n + " template";
      if (vuoto) vuoto.hidden = n > 0;
    };
    var premi = function (gruppo, chiave, attr) {
      gruppo.forEach(function (b) {
        b.addEventListener("click", function () {
          gruppo.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          stato[chiave] = b.getAttribute(attr); applica(true);
        });
      });
    };
    premi(filtriCat, "cat", "data-filtro-categoria");
    premi(filtriLiv, "liv", "data-filtro-livello");
    if (cerca) cerca.addEventListener("input", function () { stato.q = cerca.value; applica(false); });
    /* #categoria nell'indirizzo: template.html#giochi */
    var h = decodeURIComponent((location.hash || "").slice(1));
    filtriCat.forEach(function (b) { if (h && b.getAttribute("data-filtro-categoria") === h) b.click(); });
    applica(false);
  }
})();
