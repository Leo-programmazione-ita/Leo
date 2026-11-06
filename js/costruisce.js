/* Il sito si costruisce mentre lo usi (vedi css/costruisce.css).
   Ogni sezione di <main> parte come bozza e viene «stampata» quando entra
   nello schermo; il riquadro del codice si scrive riga per riga.
   Sicurezze: niente effetto con meno movimento richiesto, senza
   IntersectionObserver, in stampa o se qualcosa va storto (si mostra tutto).
   Gli elementi che hanno già una loro comparsa (sito.js) non vengono toccati. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  function sblocca() { root.classList.remove("lc-prima"); }
  if (!("IntersectionObserver" in window)) { sblocca(); return; }
  try { if (matchMedia("(prefers-reduced-motion: reduce)").matches) { sblocca(); return; } } catch (e) { sblocca(); return; }

  var GIA_ANIMATI = ".compari,.parole,.disegna,.filo,.numero-grande,.potere,.traduzione,.tempi,.osserva," +
    ".h-testa-sezione,.h-tessera,.h-novita-voce,.hed-suite,.hed-card,.mondo,.cf-caso,.nv-voce," +
    ".documento h2,.dl-quadr,.dl-suite,.dl-smart,.galleria .modello,[data-non-costruire]";
  var PEZZI = "h1,h2,h3,h4,p,pre,img,figure,blockquote,table,li,.n-btn,.btn,.n-ed,.n-nodo,.n-frec," +
    ".n-indice>a,.n-tag,.n-occhiello";
  var BLOCCHI = "figure,table,.n-btn,.btn,.n-ed,.n-nodo,.n-indice>a,.n-tag";
  var PASSO = 70, PASSO_RIGA = 75, ATTESA_BOZZA = 280;

  var sezioni = [], segnale = null, griglia = null, inCorso = 0;

  function tutti(sel, base) { return Array.prototype.slice.call((base || d).querySelectorAll(sel)); }
  function visibile(el) { return el.getClientRects().length > 0; }

  function mostraTutto() {
    sblocca();
    root.classList.remove("lc-attivo");
    tutti(".lc-schizzo,.lc-fatto").forEach(function (el) { el.classList.remove("lc-schizzo", "lc-fatto"); });
    tutti("pre.lc-righe").forEach(function (p) { p.classList.remove("lc-righe"); });
    sezioni.forEach(function (s) { s.fatta = true; });
    if (segnale) segnale.classList.remove("lc-su");
    if (griglia) griglia.classList.remove("lc-su");
  }

  /* il <pre> diviso in righe, solo se ogni riga ha i suoi <span> chiusi */
  function preparaRighe(pre) {
    var righe = pre.innerHTML.replace(/\n$/, "").split("\n");
    if (righe.length < 2 || righe.length > 60) return 0;
    for (var i = 0; i < righe.length; i++) {
      var a = (righe[i].match(/<span\b/g) || []).length, c = (righe[i].match(/<\/span>/g) || []).length;
      if (a !== c) return 0;
    }
    pre.innerHTML = righe.map(function (r) { return '<span class="lc-riga">' + (r || " ") + "</span>"; }).join("\n");
    pre.classList.add("lc-righe");
    return righe.length;
  }

  function pezziDi(sez) {
    var scelti = [];
    tutti(PEZZI, sez).forEach(function (el) {
      if (el.closest(GIA_ANIMATI)) return;
      if (el.closest("header, footer, nav, .n-vetro-barra, [hidden], details:not([open])")) return;
      if (!visibile(el)) return;
      for (var i = 0; i < scelti.length; i++) if (scelti[i].contains(el)) return;
      scelti.push(el);
    });
    return scelti;
  }

  function nomeDi(sez) {
    var t = sez.querySelector("h1, h2");
    var s = t ? (t.innerText || t.textContent).replace(/\s+/g, " ").trim() : "la pagina";
    return s.length > 38 ? s.slice(0, 36).trim() + "…" : s;
  }

  function creaSegnale() {
    segnale = d.createElement("div");
    segnale.className = "lc-segnale";
    segnale.setAttribute("aria-hidden", "true");
    segnale.innerHTML = '<span class="lc-spia"></span><span>Costruisco <b></b></span><span class="lc-conta"></span>';
    griglia = d.createElement("div");
    griglia.className = "lc-griglia";
    griglia.setAttribute("aria-hidden", "true");
    d.body.appendChild(griglia);
    d.body.appendChild(segnale);
  }

  function aggiornaGriglia(sez) {
    var r = sez.getBoundingClientRect(), h = innerHeight, w = innerWidth;
    var su = Math.max(0, r.top), giu = Math.max(0, h - r.bottom);
    griglia.style.clipPath = "inset(" + su + "px 0 " + giu + "px 0)";
    griglia.classList.toggle("lc-su", r.bottom > 0 && r.top < h && w > 0);
  }

  function pulisci(el) {
    el.addEventListener("animationend", function fine(ev) {
      if (ev.target !== el) return;
      el.removeEventListener("animationend", fine);
      el.classList.remove("lc-fatto");
    });
  }

  function costruisci(sez) {
    if (sez.fatta) return;
    sez.fatta = true;
    var pezzi = sez.pezzi, n = pezzi.length;
    if (!n) return;
    inCorso++;
    segnale.classList.remove("lc-finito");
    segnale.querySelector("b").textContent = "«" + nomeDi(sez) + "»";
    segnale.querySelector(".lc-conta").textContent = "0/" + n;
    segnale.classList.add("lc-su");
    aggiornaGriglia(sez);
    var ridisegna = function () { aggiornaGriglia(sez); };
    addEventListener("scroll", ridisegna, { passive: true });

    var passo = n > 14 ? Math.max(25, Math.round(900 / n)) : PASSO;
    var t = ATTESA_BOZZA, fatti = 0;
    pezzi.forEach(function (el) {
      var quando = t;
      var righe = el.tagName === "PRE" ? (el.lcRighe || 0) : 0;
      setTimeout(function () {
        el.classList.remove("lc-schizzo");
        if (righe) {
          scrivi(el);
        } else {
          el.classList.add("lc-fatto");
          pulisci(el);
        }
        fatti++;
        segnale.querySelector(".lc-conta").textContent = fatti + "/" + n;
      }, quando);
      t += passo + righe * PASSO_RIGA;
    });

    setTimeout(function () {
      removeEventListener("scroll", ridisegna);
      inCorso--;
      segnale.classList.add("lc-finito");
      segnale.querySelector("b").textContent = "pronto";
      segnale.querySelector(".lc-conta").textContent = n + "/" + n;
      setTimeout(function () {
        if (!inCorso) { segnale.classList.remove("lc-su"); griglia.classList.remove("lc-su"); }
      }, 900);
    }, t + 450);
  }

  function scrivi(pre) {
    var righe = tutti(".lc-riga", pre), i = 0;
    (function prossima() {
      if (i > 0) righe[i - 1].classList.remove("lc-cursore");
      if (i >= righe.length) return;
      righe[i].classList.add("lc-scritta", "lc-cursore");
      i++;
      setTimeout(prossima, PASSO_RIGA);
    })();
  }

  function avvia() {
    var main = d.querySelector("main");
    if (!main) { sblocca(); return; }
    var blocchi = tutti(":scope > section, :scope > article", main);
    if (!blocchi.length) blocchi = [main];

    blocchi.forEach(function (sez) {
      var pezzi = pezziDi(sez);
      if (!pezzi.length) return;
      pezzi.forEach(function (el) {
        el.classList.add("lc-schizzo", el.matches(BLOCCHI) ? "lc-blocco" : (el.tagName === "IMG" ? "lc-img" : "lc-testo"));
        if (el.tagName === "PRE") el.lcRighe = preparaRighe(el);
      });
      sez.pezzi = pezzi;
      sezioni.push(sez);
    });
    if (!sezioni.length) { sblocca(); return; }

    creaSegnale();
    root.classList.add("lc-attivo");
    sblocca();

    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) { io.unobserve(v.target); costruisci(v.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });
    sezioni.forEach(function (s) { io.observe(s); });

    /* con la tastiera non si resta mai davanti a una bozza */
    d.addEventListener("focusin", function (ev) {
      var s = ev.target.closest && ev.target.closest(".lc-schizzo");
      if (!s) return;
      for (var i = 0; i < sezioni.length; i++) {
        if (sezioni[i].contains(s)) { io.unobserve(sezioni[i]); costruisci(sezioni[i]); }
      }
    });
    addEventListener("beforeprint", mostraTutto);
  }

  function parti() {
    try { avvia(); } catch (e) { mostraTutto(); }
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", parti);
  else parti();
})();
