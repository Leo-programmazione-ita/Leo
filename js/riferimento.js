/* Sito di Leo - pagine del riferimento: menu laterale sul telefono, "In questa pagina" che segue
   la lettura, "Copia" degli esempi, filtro delle pagine indice. Nessun modulo ES, niente fetch. */
(function () {
  "use strict";
  var doc = document;
  function tutti(sel, dentro) { return Array.prototype.slice.call((dentro || doc).querySelectorAll(sel)); }
  function normalizza(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  /* ---------------------------------------------------------------- menu laterale (telefono) */
  var bottone = doc.querySelector(".r-apri-menu"), lato = doc.getElementById("r-lato");
  if (bottone && lato) {
    var chiudi = function () { lato.classList.remove("aperto"); bottone.setAttribute("aria-expanded", "false"); doc.documentElement.classList.remove("r-menu-aperto"); };
    bottone.addEventListener("click", function () {
      var aperto = lato.classList.toggle("aperto");
      bottone.setAttribute("aria-expanded", aperto ? "true" : "false");
      doc.documentElement.classList.toggle("r-menu-aperto", aperto);
      if (aperto) { var a = lato.querySelector('[aria-current="page"]') || lato.querySelector("a"); if (a) a.focus(); }
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && lato.classList.contains("aperto")) { chiudi(); bottone.focus(); } });
    tutti("a", lato).forEach(function (a) { a.addEventListener("click", chiudi); });
  }
  // la voce attuale del menu si vede subito anche in un menu lungo
  var attuale = lato && lato.querySelector('.r-menu [aria-current="page"]');
  if (attuale && lato.scrollHeight > lato.clientHeight) {
    var interno = lato.querySelector(".r-lato-interno") || lato;
    try { interno.scrollTop = Math.max(0, attuale.offsetTop - interno.clientHeight / 3); } catch (e) { /* niente */ }
  }

  /* ---------------------------------------------------------------- In questa pagina */
  var voci = tutti(".r-toc a[data-toc]");
  if (voci.length && "IntersectionObserver" in window) {
    var mappa = {};
    voci.forEach(function (a) { mappa[a.getAttribute("data-toc")] = a; });
    var visibili = {};
    var io = new IntersectionObserver(function (e) {
      e.forEach(function (v) { visibili[v.target.id] = v.isIntersecting; });
      var primo = null;
      tutti(".r-corpo h2[id]").some(function (h) { if (visibili[h.id]) { primo = h.id; return true; } return false; });
      if (primo) voci.forEach(function (a) { a.classList.toggle("attivo", a.getAttribute("data-toc") === primo); });
    }, { rootMargin: "-70px 0px -55% 0px" });
    tutti(".r-corpo h2[id]").forEach(function (h) { io.observe(h); });
  }

  /* ---------------------------------------------------------------- copia gli esempi */
  function copiaVecchioStile(testo) {
    var t = doc.createElement("textarea");
    t.value = testo; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    doc.body.appendChild(t); t.select();
    try { doc.execCommand("copy"); } catch (e) { /* niente */ }
    doc.body.removeChild(t);
  }
  tutti(".m-copia").forEach(function (b) {
    var etichetta = b.querySelector("span");
    b.addEventListener("click", function () {
      var codice = b.closest(".m-codice").querySelector(".m-pre code");
      var testo = tutti(".r", codice).map(function (r) { return r.textContent; }).join("\n").replace(/ /g, " ");
      var fatto = function () {
        b.classList.add("copiato"); if (etichetta) etichetta.textContent = "Copiato";
        setTimeout(function () { b.classList.remove("copiato"); if (etichetta) etichetta.textContent = "Copia"; }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(testo).then(fatto, function () { copiaVecchioStile(testo); fatto(); });
      else { copiaVecchioStile(testo); fatto(); }
    });
  });

  /* ---------------------------------------------------------------- filtro delle pagine indice */
  var filtro = doc.querySelector("[data-filtro]");
  if (filtro) {
    var righe = tutti(".r-voci > li");
    var gruppi = tutti(".r-gruppo");
    var vuoto = doc.createElement("p");
    vuoto.className = "r-nessuno"; vuoto.hidden = true; vuoto.setAttribute("role", "status");
    var corpo = doc.querySelector(".r-corpo");
    if (corpo) corpo.appendChild(vuoto);
    filtro.addEventListener("input", function () {
      var q = normalizza(filtro.value.trim());
      var quanti = 0;
      righe.forEach(function (li) { var si = !q || normalizza(li.textContent).indexOf(q) >= 0; li.hidden = !si; if (si) quanti++; });
      gruppi.forEach(function (g) { g.hidden = !tutti(".r-voci > li", g).some(function (li) { return !li.hidden; }); });
      vuoto.hidden = quanti > 0;
      vuoto.textContent = quanti ? "" : "Niente in questa pagina per «" + filtro.value + "»: prova la ricerca in tutto il sito (tasto /).";
    });
  }
})();
