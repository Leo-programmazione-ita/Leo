/* La pagina si compila mentre la usi (vedi css/costruisce.css).
   All'inizio, al posto di ogni elemento, c'è il codice Leo che lo genera, col
   contenuto vero dentro. Un'onda di compilazione attraversa la sezione: dove
   passa, il codice si scompone e la pagina vera compare; schede e pulsanti
   arrivano un po' scomposti e si incastrano.
   Intelligente: l'onda segue la direzione in cui scorri; se scorri veloce la
   sezione si compila all'istante; dalla seconda pagina è più spedita; con
   «riduci movimento» restano solo dissolvenze.
   Sicurezze: si mostra tutto senza le funzioni necessarie, in stampa, con la
   tastiera su un pezzo non ancora compilato o se qualcosa va storto.
   Gli elementi che hanno già una loro comparsa (sito.js) non vengono toccati. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  function sblocca() { root.classList.remove("lc-prima"); }
  if (!("IntersectionObserver" in window) || !Element.prototype.animate || !window.Promise) { sblocca(); return; }

  var ridotto = false, giaVisto = false;
  try { ridotto = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  try { giaVisto = sessionStorage.getItem("lc-visto") === "1"; sessionStorage.setItem("lc-visto", "1"); } catch (e) {}

  var GIA_ANIMATI = ".compari,.parole,.disegna,.filo,.numero-grande,.potere,.traduzione,.tempi,.osserva," +
    ".h-testa-sezione,.h-tessera,.h-novita-voce,.hed-suite,.hed-card,.mondo,.cf-caso,.nv-voce," +
    ".documento h2,.dl-quadr,.dl-suite,.dl-smart,.galleria .modello,[data-non-costruire]";
  var PEZZI = "h1,h2,h3,h4,p,pre,img,figure,blockquote,table,li,.n-btn,.btn,.n-ed,.n-nodo,.n-frec," +
    ".n-indice>a,.n-tag,.n-occhiello";
  var BLOCCHI = "figure,table,img,.n-btn,.btn,.n-ed,.n-nodo,.n-indice>a,.n-tag";

  var VELOCITA = giaVisto ? 1800 : 1150;      /* px al secondo dell'onda */
  var LETTURA = giaVisto ? 250 : 750;         /* quanto si legge il codice prima della prima compilazione */
  var VELOCE = 2600;                          /* oltre questa velocità di scorrimento si compila all'istante */

  var sezioni = [], pezzi = [], strato = null, primaVolta = true;
  var ultimoY = scrollY, ultimoT = 0, vel = 0, giu = true;

  function tutti(sel, base) { return Array.prototype.slice.call((base || d).querySelectorAll(sel)); }
  function pulito(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function corto(s, n) { s = pulito(s); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  /* il testo come si legge: uno spazio tra i blocchi (es. le due righe del titolo) */
  function testo(el) {
    if (!el) return "";
    var s = "";
    (function giro(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { s += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        if (c.tagName === "BR") { s += " "; continue; }
        var disp = getComputedStyle(c).display;
        if (disp === "none") continue;
        var blocco = /block|flex|grid|list-item|table/.test(disp);
        if (blocco) s += " ";
        giro(c);
        if (blocco) s += " ";
      }
    })(el);
    return pulito(s);
  }

  /* ---------------------------------------------------- il codice di ogni pezzo */
  function st(s) { return '<span class="st">"' + esc(s) + '"</span>'; }
  function fn(s) { return '<span class="fn">' + s + "</span>"; }
  function kw(s) { return '<span class="kw">' + s + "</span>"; }
  function cm(s) { return '<span class="cm">' + esc(s) + "</span>"; }
  function link(el) {
    var h = el.getAttribute && el.getAttribute("href");
    return h && h.charAt(0) !== "#" ? h : (h ? h : "");
  }

  function codiceDi(el) {
    var t = el.tagName, h;
    if (t === "PRE") return null;                                   /* è già codice: si scrive da sé */
    if (el.matches(".n-ed, .n-indice>a")) {
      var titolo = testo(el.querySelector("h3, strong")) || corto(testo(el), 30);
      var desc = testo(el.querySelector("p, span:not(.n-forma)"));
      var forma = testo(el.querySelector(".n-forma"));
      h = fn("scheda") + " " + st(titolo) + " " + kw("fai");
      if (desc) h += "\n    " + fn("testo") + " " + st(corto(desc, 90));
      if (forma) h += "\n    " + fn("forma") + " " + st(forma);
      if (link(el)) h += "\n    " + fn("apre") + " " + st(link(el));
      return { html: h + "\n" + kw("fine"), cls: "lc-blocco" };
    }
    /* pulsanti ed etichette: se lo spazio è poco basta il testo, la forma dice già cos'è */
    var stretto = el.getBoundingClientRect().width < 200;
    if (el.matches(".n-btn, .btn")) {
      h = stretto ? st(testo(el)) : fn("pulsante") + " " + st(testo(el));
      if (link(el) && !stretto) h += " " + cm("→ " + link(el));
      return { html: h, cls: "lc-riga1 lc-blocco lc-pillola" };
    }
    if (el.matches(".n-tag")) return { html: stretto ? st(testo(el)) : fn("uscita") + " " + st(testo(el)), cls: "lc-riga1 lc-blocco lc-pillola" };
    if (el.matches(".n-occhiello")) return { html: stretto ? st(testo(el)) : fn("etichetta") + " " + st(testo(el)), cls: "lc-riga1 lc-blocco lc-pillola" };
    if (el.matches(".n-nodo")) {
      var c = el.querySelector("code");
      return { html: fn("collega") + " " + st(testo(el.querySelector("strong"))) + (c ? "\n    " + cm(testo(c)) : ""), cls: "lc-blocco" };
    }
    if (el.matches(".n-frec")) return { html: cm("↓ poi"), cls: "lc-riga1" };
    if (t === "H1") return { html: fn("titolo") + " " + st(testo(el)), cls: "lc-grande" };
    if (t === "H2") return { html: fn("titolo") + " " + st(testo(el)), cls: "lc-medio" };
    if (t === "H3" || t === "H4") return { html: fn("sottotitolo") + " " + st(testo(el)), cls: "" };
    if (t === "IMG") return { html: fn("immagine") + " " + st(el.getAttribute("alt") || (el.getAttribute("src") || "").split("/").pop()), cls: "lc-blocco" };
    if (t === "FIGURE") return { html: fn("figura") + " " + st(corto(testo(el.querySelector("figcaption")) || "", 60)), cls: "lc-blocco" };
    if (t === "TABLE") return { html: fn("tabella") + " " + st(corto(testo(el.querySelector("th, td")), 40)), cls: "lc-blocco" };
    if (t === "LI") return { html: fn("voce") + " " + st(testo(el)), cls: "" };
    return { html: fn("testo") + " " + st(testo(el)), cls: "" };
  }

  /* ---------------------------------------------------- preparazione */
  function pezziDi(sez) {
    var scelti = [];
    tutti(PEZZI, sez).forEach(function (el) {
      if (el.closest(GIA_ANIMATI)) return;
      if (el.closest("header, footer, nav, .n-vetro-barra, [hidden], details:not([open])")) return;
      if (!el.getClientRects().length) return;
      for (var i = 0; i < scelti.length; i++) if (scelti[i].contains(el)) return;
      scelti.push(el);
    });
    return scelti;
  }

  function preparaRighe(pre) {
    var righe = pre.innerHTML.replace(/\n$/, "").split("\n");
    if (righe.length < 2 || righe.length > 60) return;
    for (var i = 0; i < righe.length; i++) {
      if ((righe[i].match(/<span\b/g) || []).length !== (righe[i].match(/<\/span>/g) || []).length) return;
    }
    pre.innerHTML = righe.map(function (r) { return '<span class="lc-riga">' + (r || " ") + "</span>"; }).join("\n");
    pre.classList.add("lc-righe");
  }

  function scriviPre(pre) {
    var righe = tutti(".lc-riga", pre), i = 0;
    (function prossima() {
      if (i > 0) righe[i - 1].classList.remove("lc-cursore");
      if (i >= righe.length) return;
      righe[i].classList.add("lc-scritta", "lc-cursore");
      i++;
      setTimeout(prossima, giaVisto ? 40 : 65);
    })();
  }

  function posiziona(p) {
    if (!p.g || p.arrivato) return;
    var r = p.el.getBoundingClientRect();
    var s = p.g.style;
    s.left = (r.left + scrollX) + "px"; s.top = (r.top + scrollY) + "px";
    s.width = r.width + "px"; s.height = Math.max(r.height, 18) + "px";
    if (p.g.classList.contains("lc-riga1")) s.lineHeight = Math.max(r.height, 18) + "px";
  }
  function posizionaTutti() { pezzi.forEach(posiziona); }

  /* ---------------------------------------------------- comparsa di un pezzo */
  var SEGNI = "01{}[]<>=/*+#$%&@;:";
  function scomponi(g) {
    var r = g.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;           /* fuori schermo: non serve */
    var nodi = [], w = d.createTreeWalker(g, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) nodi.push([n, n.nodeValue]);
    var passi = 0;
    (function passo() {
      passi++;
      var quota = passi / 5;
      nodi.forEach(function (x) {
        var o = x[1], s = "";
        for (var i = 0; i < o.length; i++) s += (o[i] !== " " && o[i] !== "\n" && Math.random() < quota) ? SEGNI[(Math.random() * SEGNI.length) | 0] : o[i];
        x[0].nodeValue = s;
      });
      if (passi < 5) setTimeout(passo, 40);
    })();
  }

  function rivela(p, opz) {
    if (p.arrivato) return;
    p.arrivato = true;
    var el = p.el;
    opz = opz || { morbido: true };
    if (p.g) {
      var g = p.g;
      if (!opz.morbido) scomponi(g);
      setTimeout(function () { g.classList.add("lc-via"); }, opz.morbido ? 0 : 120);
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 700);
    }
    el.style.opacity = "";
    if (opz.morbido) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ridotto ? 500 : 280, easing: "ease-out" });
    } else {
      var clip = opz.giu ? ["inset(0 0 100% 0)", "inset(0 0 0% 0)"] : ["inset(100% 0 0 0)", "inset(0% 0 0 0)"];
      el.animate([{ clipPath: clip[0] }, { clipPath: clip[1] }], { duration: opz.durata, easing: "linear" });
      if (p.blocco) {
        var dx = (Math.random() - .5) * 12, dy = opz.giu ? 16 : -16, rz = (Math.random() - .5) * 2.4;
        var an = el.animate([
          { transform: "translate(" + dx + "px," + dy + "px) rotate(" + rz + "deg) scale(.96)" },
          { transform: "none" }
        ], { duration: Math.max(560, opz.durata + 300), easing: "cubic-bezier(.2, 1.45, .4, 1)" });
        an.onfinish = function () {
          el.animate([
            { boxShadow: "0 0 0 1.5px rgba(224, 24, 45, .85)" },
            { boxShadow: "0 0 0 12px rgba(224, 24, 45, 0)" }
          ], { duration: 460, easing: "ease-out" });
        };
      }
    }
    if (el.tagName === "PRE" && el.classList.contains("lc-righe")) {
      setTimeout(function () { scriviPre(el); }, opz.morbido ? 200 : (opz.durata || 200) + 80);
    }
  }

  function mostraTutto() {
    pezzi.forEach(function (p) { p.arrivato = true; p.el.style.opacity = ""; });
    tutti("pre.lc-righe .lc-riga").forEach(function (r) { r.classList.add("lc-scritta"); r.classList.remove("lc-cursore"); });
    if (strato && strato.parentNode) strato.parentNode.removeChild(strato);
    tutti(".lc-onda").forEach(function (o) { o.parentNode.removeChild(o); });
    sezioni.forEach(function (s) { s.fatta = true; });
    sblocca();
  }

  /* ---------------------------------------------------- la compilazione di una sezione */
  function nomeSezione(sez) {
    var t = sez.querySelector("h1, h2");
    return t ? corto(testo(t), 28) : "pagina";
  }

  function compila(sez) {
    if (sez.fatta) return;
    sez.fatta = true;
    var pz = sez.pezzi.filter(function (p) { return !p.arrivato; });
    if (!pz.length) return;
    var recente = performance.now() - ultimoT < 220;
    var veloce = recente && Math.abs(vel) > VELOCE;

    if (ridotto || veloce) {
      pz.forEach(function (p, i) { setTimeout(function () { rivela(p, { morbido: true }); }, ridotto ? i * 60 : 0); });
      return;
    }

    var su = Infinity, sotto = -Infinity, sx = Infinity, dx = -Infinity;
    pz.forEach(function (p) {
      var r = p.el.getBoundingClientRect();
      p.t = r.top + scrollY; p.b = r.bottom + scrollY;
      su = Math.min(su, p.t); sotto = Math.max(sotto, p.b);
      sx = Math.min(sx, r.left); dx = Math.max(dx, r.right);
    });
    var H = Math.max(1, sotto - su);
    var durata = Math.max(550, Math.min(1800, H / VELOCITA * 1000));
    var versoGiu = giu;

    var onda = d.createElement("div");
    onda.className = "lc-onda" + (versoGiu ? "" : " lc-giu");
    onda.setAttribute("aria-hidden", "true");
    onda.setAttribute("data-nome", "compilo › " + nomeSezione(sez));
    var ox = Math.max(0, sx - 24 + scrollX), ow = Math.min(innerWidth, dx + 24) - (sx - 24);
    onda.style.left = ox + "px"; onda.style.width = Math.max(120, ow) + "px"; onda.style.top = su + "px";
    d.body.appendChild(onda);
    onda.animate([
      { transform: "translateY(" + (versoGiu ? 0 : H) + "px)", opacity: 0 },
      { opacity: 1, offset: .06 },
      { opacity: 1, offset: .94 },
      { transform: "translateY(" + (versoGiu ? H : 0) + "px)", opacity: 0 }
    ], { duration: durata, easing: "linear" });
    setTimeout(function () { if (onda.parentNode) onda.parentNode.removeChild(onda); }, durata + 60);

    pz.forEach(function (p) {
      var a = (p.t - su) / H, b = (p.b - su) / H;
      if (!versoGiu) { var na = 1 - b; b = 1 - a; a = na; }
      var t0 = a * durata, t1 = Math.max(t0 + 160, b * durata);
      setTimeout(function () { rivela(p, { durata: t1 - t0, giu: versoGiu }); }, t0);
    });
  }

  /* ---------------------------------------------------- avvio */
  function avvia() {
    var main = d.querySelector("main");
    if (!main) { sblocca(); return; }
    var blocchi = tutti(":scope > section, :scope > article", main);
    if (!blocchi.length) blocchi = [main];

    strato = d.createElement("div");
    strato.className = "lc-strato";
    strato.setAttribute("aria-hidden", "true");

    blocchi.forEach(function (sez) {
      var els = pezziDi(sez);
      if (!els.length) return;
      sez.pezzi = els.map(function (el) {
        var p = { el: el, blocco: el.matches(BLOCCHI), arrivato: false, g: null };
        if (el.tagName === "PRE") preparaRighe(el);
        var c = codiceDi(el);
        if (c) {
          p.g = d.createElement("div");
          p.g.className = "lc-sorgente " + c.cls;
          p.g.innerHTML = c.html;
          strato.appendChild(p.g);
        }
        el.style.opacity = "0";
        pezzi.push(p);
        return p;
      });
      sezioni.push(sez);
    });
    if (!sezioni.length) { sblocca(); return; }

    d.body.appendChild(strato);
    root.classList.add("lc-attivo");
    posizionaTutti();
    sblocca();

    /* il codice resta al suo posto anche se la pagina cambia misura o caricano i caratteri */
    var t = null;
    function ricalcola() { clearTimeout(t); t = setTimeout(posizionaTutti, 80); }
    addEventListener("resize", ricalcola);
    addEventListener("load", ricalcola);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(ricalcola);

    addEventListener("scroll", function () {
      var ora = performance.now(), y = scrollY, dt = Math.max(16, ora - (ultimoT || ora - 16));
      var v = (y - ultimoY) / dt * 1000;
      vel = vel * .55 + v * .45;
      if (y !== ultimoY) giu = y > ultimoY;
      ultimoY = y; ultimoT = ora;
    }, { passive: true });

    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (!v.isIntersecting) return;
        io.unobserve(v.target);
        if (primaVolta) { primaVolta = false; setTimeout(function () { compila(v.target); }, LETTURA); }
        else compila(v.target);
      });
    }, { rootMargin: "0px 0px -15% 0px", threshold: 0.04 });
    sezioni.forEach(function (s) { io.observe(s); });

    d.addEventListener("focusin", function (ev) {
      for (var i = 0; i < pezzi.length; i++) {
        if (!pezzi[i].arrivato && pezzi[i].el.contains(ev.target)) rivela(pezzi[i], { morbido: true });
      }
    });
    addEventListener("beforeprint", mostraTutto);
  }

  try {
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { try { avvia(); } catch (e) { mostraTutto(); } });
    else avvia();
  } catch (e) { mostraTutto(); }
})();
