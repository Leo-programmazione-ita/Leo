/* Videoteca di Leo: elenco dei video (video/elenco.json), percorsi, filtri, ricerca,
   "continua a guardare" e "gia' visto" (ricordati nel browser), lettore di un video con
   sottotitoli e capitoli, correlati e successivo. Anche le anteprime della home.

   Dati: video/elenco.json (formato in video/LEGGIMI.md). Dal web si legge elenco.json;
   aprendo i file dal disco o dentro l'app (file://) il browser non lo lascia leggere e si usa
   video/elenco.js (la stessa cosa in forma di script: lo scrive strumenti/sito_template/videoteca.py,
   e lo rifanno da soli android/prepara_sorgenti.py e l'installatore di Windows).
   Nessuna libreria, nessun modulo: funziona anche con un doppio clic su video.html. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var C = window.LEO_CONFIG || {};
  var CHIAVE = "leo-video";
  var riduci = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function tutti(sel, r) { return Array.prototype.slice.call((r || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function testo(v) { return v == null ? "" : String(v).trim(); }

  /* ------------------------------------------------------------ indirizzo del sito online */
  function sitoOnline() {
    var u = testo(C.indirizzoSito);
    if (!u || /TUO-DOMINIO/i.test(u) || !/^https?:\/\//i.test(u)) return "";
    return u.replace(/\/?$/, "/");
  }

  /* ------------------------------------------------------------ dati */
  function secondi(d) {
    if (typeof d === "number" && isFinite(d)) return Math.max(0, Math.round(d));
    var s = testo(d);
    if (!s) return 0;
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
    var p = s.split(":").map(function (x) { return parseInt(x, 10) || 0; });
    var t = 0;
    p.forEach(function (x) { t = t * 60 + x; });
    return t;
  }
  function durataTesto(s, anchezero) {
    if (!s && !anchezero) return "";
    s = Math.round(s || 0);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x;
  }
  function durataParole(s) {
    if (!s) return "";
    var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    if (h) return h + (h === 1 ? " ora" : " ore") + (m ? " e " + m + " min" : "");
    return Math.max(1, m) + " min";
  }
  function percorso(p) {
    p = testo(p);
    if (!p) return "";
    if (/^(https?:|data:|blob:)/i.test(p)) return p;
    return "video/" + p.replace(/^\.?\//, "");
  }
  var ORDINE_LIVELLI = ["base", "principiante", "facile", "intermedio", "medio", "avanzato", "esperto"];
  function normalizza(dati) {
    dati = dati && typeof dati === "object" ? dati : {};
    var serie = (Array.isArray(dati.serie) ? dati.serie : []).filter(function (s) { return s && s.id; }).map(function (s, i) {
      return { id: String(s.id), titolo: testo(s.titolo) || String(s.id), descrizione: testo(s.descrizione), ordine: i };
    });
    var perSerie = {};
    serie.forEach(function (s) { perSerie[s.id] = s; });
    var visti = {};
    var video = (Array.isArray(dati.video) ? dati.video : []).filter(function (v) {
      if (!v || !v.id || visti[v.id]) return false;
      visti[v.id] = 1; return true;
    }).map(function (v, i) {
      var sid = testo(v.serie) || "altri";
      if (!perSerie[sid]) { perSerie[sid] = { id: sid, titolo: sid.charAt(0).toUpperCase() + sid.slice(1).replace(/[-_]/g, " "), descrizione: "", ordine: 1000 + i }; serie.push(perSerie[sid]); }
      var capitoli = (Array.isArray(v.capitoli) ? v.capitoli : []).map(function (c) {
        return c && { t: secondi(c.t != null ? c.t : c.tempo), titolo: testo(c.titolo) };
      }).filter(function (c) { return c && c.titolo; }).sort(function (a, b) { return a.t - b.t; });
      var num = /^(\d+)[_-]/.exec(String(v.id));
      return {
        id: String(v.id), serie: sid, titolo: testo(v.titolo) || String(v.id), descrizione: testo(v.descrizione),
        livello: testo(v.livello).toLowerCase(), durata: secondi(v.durata), mp4: percorso(v.mp4), vtt: percorso(v.vtt),
        poster: percorso(v.poster), anteprima: percorso(v.anteprima) || percorso(v.poster), capitoli: capitoli,
        numero: num ? parseInt(num[1], 10) : (/^\d+$/.test(testo(v.numero)) ? parseInt(v.numero, 10) : null), ordine: i, mp4Rel: testo(v.mp4),
        vttTesto: typeof v.vtt_testo === "string" ? v.vtt_testo : "",
        stimata: !!v.stimata,
        copione: (Array.isArray(v.copione) ? v.copione : []).map(function (p) {
          return p && (typeof p === "string" ? { titolo: "", testo: testo(p) } : { titolo: testo(p.titolo), testo: testo(p.testo) });
        }).filter(function (p) { return p && p.testo; }),
        obiettivi: (Array.isArray(v.obiettivi) ? v.obiettivi : []).map(testo).filter(Boolean),
        prerequisiti: (Array.isArray(v.prerequisiti) ? v.prerequisiti : []).map(testo).filter(Boolean)
      };
    });
    serie.sort(function (a, b) { return a.ordine - b.ordine; });
    serie.forEach(function (s) { s.video = video.filter(function (v) { return v.serie === s.id; }); });
    return { serie: serie.filter(function (s) { return s.video.length; }), tutteSerie: serie, video: video, perSerie: perSerie };
  }
  function caricaScript(src, fatto) {
    var s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = function () { fatto(window.LEO_VIDEO || null); };
    s.onerror = function () { fatto(null); };
    document.head.appendChild(s);
  }
  function carica(fatto) {
    var web = /^https?:$/.test(location.protocol);
    var daFetch = function (poi) {
      if (!window.fetch) { poi(null); return; }
      fetch("video/elenco.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { poi(d); }, function () { poi(null); });
    };
    if (web) daFetch(function (d) { if (d) fatto(normalizza(d)); else caricaScript("video/elenco.js", function (x) { fatto(x ? normalizza(x) : null); }); });
    else caricaScript("video/elenco.js", function (x) {
      if (x) { fatto(normalizza(x)); return; }
      daFetch(function (d) { fatto(d ? normalizza(d) : null); });
    });
  }

  /* ------------------------------------------------------------ progressi (solo in questo browser) */
  var memoria = {
    leggi: function () {
      try { var t = JSON.parse(localStorage.getItem(CHIAVE) || "{}"); return t && typeof t === "object" ? t : {}; } catch (e) { return {}; }
    },
    scrivi: function (tab) { try { localStorage.setItem(CHIAVE, JSON.stringify(tab)); } catch (e) { /* memoria piena o bloccata: pazienza */ } },
    di: function (id) { return memoria.leggi()[id] || null; },
    aggiorna: function (id, cambi) {
      var tab = memoria.leggi(), v = tab[id] || {};
      for (var k in cambi) if (Object.prototype.hasOwnProperty.call(cambi, k)) v[k] = cambi[k];
      v.quando = Date.now();
      tab[id] = v; memoria.scrivi(tab);
      return v;
    }
  };
  function stato(v) {
    var m = memoria.di(v.id);
    if (!m) return { visto: false, frazione: 0, t: 0 };
    var d = m.d || v.durata || 0;
    return { visto: !!m.visto, frazione: d ? Math.min(1, (m.t || 0) / d) : 0, t: m.t || 0, quando: m.quando || 0 };
  }
  function disponibile(v) { return !!v.mp4; }
  function inCorso(dati) {
    var tab = memoria.leggi();
    return dati.video.filter(function (v) {
      var m = tab[v.id]; return m && !m.visto && (m.t || 0) > 5 && disponibile(v);
    }).sort(function (a, b) { return (tab[b.id].quando || 0) - (tab[a.id].quando || 0); });
  }

  /* ------------------------------------------------------------ scheda di un video */
  var ICONA_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  var ICONA_OK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function livelloTesto(l) { return l ? l.charAt(0).toUpperCase() + l.slice(1) : ""; }
  function scheda(v, dati, opz) {
    opz = opz || {};
    var s = stato(v), serie = dati.perSerie[v.serie] || { titolo: "" }, pronto = disponibile(v);
    var img = v.anteprima ? '<img src="' + esc(v.anteprima) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : "";
    var etichette = [];
    if (!pronto) etichette.push('<span class="v-etichetta arrivo">In arrivo</span>');
    else if (s.visto) etichette.push('<span class="v-etichetta visto">' + ICONA_OK + 'Visto</span>');
    var descr = [serie.titolo, livelloTesto(v.livello)].filter(Boolean).join(" · ");
    var circa = v.stimata ? "circa " : "";
    return '<article class="v-scheda' + (pronto ? "" : " non-pronto") + (s.visto ? " gia-visto" : "") + '" data-id="' + esc(v.id) + '">' +
      '<a class="v-copertina" href="video.html#v=' + encodeURIComponent(v.id) + '" aria-label="' + esc(v.titolo + (pronto ? "" : " (in arrivo)") + (s.visto ? " (già visto)" : "") + (v.durata ? ", " + circa + durataParole(v.durata) : "")) + '">' +
        '<span class="v-segnaposto" aria-hidden="true" data-serie="' + esc(v.serie) + '"><b>' + (v.numero != null ? (v.numero < 10 ? "0" : "") + v.numero : "▶") + '</b><i>' + esc(serie.titolo) + '</i></span>' + img +
        (pronto ? '<span class="v-play" aria-hidden="true">' + ICONA_PLAY + '</span>' : "") +
        (v.durata ? '<span class="v-durata" aria-hidden="true"' + (v.stimata ? ' title="Durata stimata">≈ ' : ">") + durataTesto(v.durata) + '</span>' : "") +
        etichette.join("") +
        (s.frazione > 0.02 && !s.visto ? '<span class="v-avanzamento" aria-hidden="true"><i style="width:' + Math.round(s.frazione * 100) + '%"></i></span>' : "") +
      '</a>' +
      '<div class="v-corpo"><p class="v-meta">' + esc(descr) + '</p>' +
        '<h3 class="v-titolo"><a href="video.html#v=' + encodeURIComponent(v.id) + '" tabindex="-1">' + esc(v.titolo) + '</a></h3>' +
        (opz.corto || !v.descrizione ? "" : '<p class="v-descr">' + esc(v.descrizione) + '</p>') +
      '</div></article>';
  }

  /* ============================================================ HOME: anteprime */
  function anteprimeHome(el) {
    carica(function (dati) {
      if (!dati || !dati.video.length) return;          // resta il testo di ripiego (link alla videoteca)
      var quanti = parseInt(el.getAttribute("data-quanti"), 10) || 6;
      var scelti = inCorso(dati).slice(0, 2), usati = {};
      scelti.forEach(function (v) { usati[v.id] = 1; });
      // poi il primo video di ogni percorso (prima quelli gia' pronti)
      var primi = dati.serie.map(function (s) { return s.video.filter(disponibile)[0] || s.video[0]; });
      primi.sort(function (a, b) { return (disponibile(b) ? 1 : 0) - (disponibile(a) ? 1 : 0); });
      primi.forEach(function (v) { if (scelti.length < quanti && v && !usati[v.id]) { scelti.push(v); usati[v.id] = 1; } });
      var pronti = dati.video.filter(disponibile).length, tot = dati.video.length;
      var durata = dati.video.reduce(function (a, v) { return a + v.durata; }, 0);
      el.innerHTML =
        '<div class="v-griglia">' + scelti.map(function (v) { return scheda(v, dati, { corto: true }); }).join("") + '</div>' +
        '<p class="v-riassunto">' + tot + (tot === 1 ? " video" : " video") + " in " + dati.serie.length + (dati.serie.length === 1 ? " percorso" : " percorsi") +
          (durata ? " · " + durataParole(durata) + " in tutto" : "") + (pronti < tot ? " · " + (tot - pronti) + " in arrivo" : "") + "</p>" +
        '<ul class="v-percorsi-home" aria-label="Percorsi della videoteca">' + dati.serie.map(function (s) {
          return '<li><a href="video.html#serie=' + encodeURIComponent(s.id) + '">' + esc(s.titolo) + '<span>' + s.video.length + '</span></a></li>';
        }).join("") + '</ul>';
    });
  }
  tutti("[data-anteprime-video]").forEach(anteprimeHome);

  /* ============================================================ VIDEOTECA (video.html) */
  var radice = document.getElementById("videoteca");
  if (!radice) return;

  var D = null, filtro = { serie: "", livello: "", cerca: "" }, vistaAttuale = "";
  var elCatalogo = document.getElementById("vt-catalogo"), elVideo = document.getElementById("vt-video");
  var elRisultati = document.getElementById("vt-risultati"), elConta = document.getElementById("vt-conta");
  var elCerca = document.getElementById("vt-cerca"), elSerie = document.getElementById("vt-filtri-serie");
  var elLivelli = document.getElementById("vt-filtri-livello"), elContinua = document.getElementById("vt-continua");
  var elStat = document.getElementById("vt-statistiche"), elStato = document.getElementById("vt-stato");
  var titoloBase = document.title;

  function annuncia(t) { if (elStato) { elStato.textContent = ""; setTimeout(function () { elStato.textContent = t; }, 30); } }

  function leggiHash() {
    var h = decodeURIComponent((location.hash || "").replace(/^#/, "")), o = {};
    h.split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) o[kv[0]] = kv.slice(1).join("="); });
    return o;
  }
  function scriviHash(o, sostituisci) {
    var parti = [];
    for (var k in o) if (o[k]) parti.push(k + "=" + encodeURIComponent(o[k]));
    var h = parti.length ? "#" + parti.join("&") : location.pathname.split("/").pop() + location.search;
    if (sostituisci && history.replaceState) { try { history.replaceState(null, "", parti.length ? h : location.href.split("#")[0]); instrada(); return; } catch (e) { /* file:// */ } }
    if (parti.length) location.hash = h; else if (history.pushState) { try { history.pushState(null, "", location.href.split("#")[0]); instrada(); } catch (e) { location.hash = ""; } } else location.hash = "";
  }

  /* ---------------- filtri */
  function disegnaFiltri() {
    var bottone = function (tipo, val, etichetta, quanti) {
      var on = filtro[tipo] === val;
      return '<button class="filtro" type="button" data-f-' + tipo + '="' + esc(val) + '" aria-pressed="' + on + '">' + esc(etichetta) +
        (quanti != null ? '<span class="quanti">' + quanti + '</span>' : "") + '</button>';
    };
    elSerie.innerHTML = bottone("serie", "", "Tutti i percorsi", D.video.length) + D.serie.map(function (s) { return bottone("serie", s.id, s.titolo, s.video.length); }).join("");
    var livelli = [];
    D.video.forEach(function (v) { if (v.livello && livelli.indexOf(v.livello) < 0) livelli.push(v.livello); });
    livelli.sort(function (a, b) {
      var ia = ORDINE_LIVELLI.indexOf(a), ib = ORDINE_LIVELLI.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
    elLivelli.hidden = livelli.length < 2;
    elLivelli.innerHTML = bottone("livello", "", "Tutti i livelli") + livelli.map(function (l) { return bottone("livello", l, livelloTesto(l)); }).join("");
  }
  radice.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-f-serie],[data-f-livello]");
    if (!b) return;
    if (b.hasAttribute("data-f-serie")) filtro.serie = b.getAttribute("data-f-serie");
    else filtro.livello = b.getAttribute("data-f-livello");
    scriviHash({ serie: filtro.serie, livello: filtro.livello, cerca: filtro.cerca }, true);
  });
  var tCerca = null;
  if (elCerca) elCerca.addEventListener("input", function () {
    clearTimeout(tCerca);
    tCerca = setTimeout(function () { filtro.cerca = elCerca.value.trim(); scriviHash({ serie: filtro.serie, livello: filtro.livello, cerca: filtro.cerca }, true); }, 180);
  });

  function normTesto(s) { return String(s || "").toLowerCase().normalize ? String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : String(s || "").toLowerCase(); }
  function corrisponde(v) {
    if (filtro.serie && v.serie !== filtro.serie) return false;
    if (filtro.livello && v.livello !== filtro.livello) return false;
    if (filtro.cerca) {
      var serie = D.perSerie[v.serie] || {};
      var fonte = normTesto([v.titolo, v.descrizione, serie.titolo, v.livello, v.capitoli.map(function (c) { return c.titolo; }).join(" "), v.copione.map(function (p) { return p.titolo; }).join(" "), v.obiettivi.join(" ")].join(" "));
      var parole = normTesto(filtro.cerca).split(/\s+/).filter(Boolean);
      for (var i = 0; i < parole.length; i++) if (fonte.indexOf(parole[i]) < 0) return false;
    }
    return true;
  }

  /* ---------------- catalogo */
  function disegnaContinua() {
    var l = inCorso(D).slice(0, 4);
    elContinua.hidden = !l.length;
    if (!l.length) return;
    elContinua.innerHTML = '<h2 class="vt-sezione-t">Continua a guardare</h2><div class="v-griglia">' + l.map(function (v) { return scheda(v, D, { corto: true }); }).join("") + "</div>";
  }
  function disegnaCatalogo() {
    tutti(".filtro", radice).forEach(function (b) {
      var t = b.hasAttribute("data-f-serie") ? "serie" : "livello";
      b.setAttribute("aria-pressed", String(filtro[t] === b.getAttribute("data-f-" + t)));
    });
    if (elCerca && elCerca.value.trim() !== filtro.cerca) elCerca.value = filtro.cerca;
    var attivo = filtro.serie || filtro.livello || filtro.cerca;
    elContinua.hidden = true;
    if (!attivo) {
      disegnaContinua();
      elConta.textContent = D.video.length + " video";
      elRisultati.innerHTML = D.serie.map(function (s, i) {
        var visti = s.video.filter(function (v) { return stato(v).visto; }).length;
        var pronti = s.video.filter(disponibile).length;
        var durata = s.video.reduce(function (a, v) { return a + v.durata; }, 0);
        return '<section class="vt-percorso" aria-labelledby="vt-p-' + i + '">' +
          '<header class="vt-percorso-testa"><div><p class="vt-percorso-n">Percorso ' + (i + 1) + '</p>' +
            '<h2 id="vt-p-' + i + '"><a href="video.html#serie=' + encodeURIComponent(s.id) + '">' + esc(s.titolo) + '</a></h2>' +
            (s.descrizione ? '<p class="vt-percorso-d">' + esc(s.descrizione) + '</p>' : "") + '</div>' +
            '<div class="vt-percorso-info"><span>' + s.video.length + ' video' + (durata ? " · " + (s.video.some(function (v) { return v.stimata; }) ? "circa " : "") + durataParole(durata) : "") + (pronti < s.video.length ? " · " + (s.video.length - pronti) + " in arrivo" : "") + '</span>' +
              (visti ? '<span class="vt-barra" role="img" aria-label="' + visti + ' di ' + s.video.length + ' già visti"><i style="width:' + Math.round(visti / s.video.length * 100) + '%"></i></span>' : "") + '</div>' +
          '</header>' +
          '<div class="v-griglia v-fila">' + s.video.map(function (v) { return scheda(v, D, { corto: true }); }).join("") + '</div></section>';
      }).join("");
      return;
    }
    var l = D.video.filter(corrisponde);
    elConta.textContent = l.length === 1 ? "1 video" : l.length + " video";
    var s = filtro.serie && D.perSerie[filtro.serie];
    elRisultati.innerHTML = (s && s.descrizione && !filtro.cerca ? '<p class="vt-percorso-d vt-descr-filtro">' + esc(s.descrizione) + '</p>' : "") +
      (l.length ? '<div class="v-griglia">' + l.map(function (v) { return scheda(v, D); }).join("") + "</div>"
        : '<div class="vt-vuoto"><p><strong>Nessun video trovato.</strong></p><p>Prova con un\'altra parola o <button type="button" class="link-bottone" data-azzera>togli i filtri</button>.</p></div>');
    annuncia(l.length === 1 ? "1 video trovato" : l.length + " video trovati");
  }
  radice.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-azzera]")) { filtro = { serie: "", livello: "", cerca: "" }; if (elCerca) elCerca.value = ""; scriviHash({}, true); }
  });

  /* ---------------- un video */
  var lettore = null, tSalva = 0;
  function sorgenti(v) {
    var l = [];
    if (v.mp4) {
      l.push(v.mp4);
      var online = sitoOnline();
      // file locale mancante (dentro l'app i video non ci sono, per tenerla leggera): lo stesso video dal sito
      if (online && !/^https?:/i.test(v.mp4) && !/^https?:$/.test(location.protocol)) l.push(online + v.mp4);
    }
    return l;
  }
  function apriVideo(id) {
    var v = null;
    for (var i = 0; i < D.video.length; i++) if (D.video[i].id === id) { v = D.video[i]; break; }
    if (!v) { elVideo.innerHTML = '<div class="vt-vuoto"><p><strong>Questo video non c\'è.</strong></p><p><a href="video.html">Torna alla videoteca</a></p></div>'; mostra("video"); return; }
    var serie = D.perSerie[v.serie] || { titolo: "", video: [] };
    var pos = serie.video.indexOf(v), succ = serie.video[pos + 1] || null;
    if (!succ) { var is = D.serie.indexOf(serie); if (is >= 0 && D.serie[is + 1]) succ = D.serie[is + 1].video[0]; }
    var st = stato(v), pronto = disponibile(v);
    var fonti = sorgenti(v);
    var meta = [serie.titolo ? '<a href="video.html#serie=' + encodeURIComponent(v.serie) + '">' + esc(serie.titolo) + "</a>" : "", v.numero != null ? "Video " + v.numero : "", livelloTesto(v.livello), v.durata ? (v.stimata ? "circa " : "") + durataParole(v.durata) : ""].filter(Boolean);
    var capitoli = v.capitoli.length ? '<section class="vt-capitoli" aria-labelledby="vt-cap-t"><h2 id="vt-cap-t">Capitoli</h2><ol>' + v.capitoli.map(function (c, k) {
      return '<li><button type="button" data-salta="' + c.t + '"' + (pronto ? "" : " disabled") + '><span class="vt-cap-t">' + durataTesto(c.t, true) + '</span><span>' + esc(c.titolo) + '</span></button></li>';
    }).join("") + "</ol></section>" : "";
    // il testo del video non ancora montato, slide per slide: la pagina serve lo stesso
    var copione = !pronto && v.copione.length ? '<section class="vt-copione" aria-labelledby="vt-copione-t"><h2 id="vt-copione-t">Il testo del video</h2>' +
      '<p class="vt-copione-nota">Il video non è ancora pronto, ma puoi già leggere quello che dice, una parte alla volta.</p><ol>' +
      v.copione.map(function (p) {
        return "<li>" + (p.titolo ? "<h3>" + esc(p.titolo) + "</h3>" : "") + "<p>" + esc(p.testo) + "</p></li>";
      }).join("") + "</ol></section>" : "";
    var correlati = serie.video.filter(function (x) { return x !== v; }).slice(0, 12);
    // dello stesso livello, prima quelli gia' pronti
    var altri = D.video.filter(function (x) { return x.serie !== v.serie && x.livello === v.livello; })
      .sort(function (a, b) { return (disponibile(b) ? 1 : 0) - (disponibile(a) ? 1 : 0) || a.ordine - b.ordine; }).slice(0, 4);
    elVideo.innerHTML =
      '<p class="vt-indietro"><a href="video.html" data-torna>← Tutti i video</a></p>' +
      '<div class="vt-video-griglia">' +
        '<div class="vt-principale">' +
          '<div class="vt-lettore' + (pronto ? "" : " non-pronto") + '">' +
            (pronto
              ? '<video id="vt-player" controls playsinline preload="none"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : "") + ' aria-label="' + esc(v.titolo) + '">' +
                  fonti.map(function (f) { return '<source src="' + esc(f) + '" type="video/mp4">'; }).join("") +
                  (v.vtt && !sottotitoliDaTesto(v) ? '<track kind="subtitles" srclang="it" label="Italiano" src="' + esc(v.vtt) + '" default>' : "") +
                  'Il tuo browser non riesce a riprodurre questo video. <a href="' + esc(fonti[0]) + '">Scaricalo</a>.' +
                '</video>' +
                '<div class="vt-avviso-lettore" id="vt-avviso-lettore" hidden role="status"></div>'
              : '<div class="vt-in-arrivo' + (v.poster ? " con-poster" : "") + '">' + (v.poster ? '<img src="' + esc(v.poster) + '" alt="" onerror="this.parentNode.classList.remove(\'con-poster\'); this.remove()">' : "") +
                  '<div><span class="v-etichetta arrivo">Video in arrivo</span><p>Il video è in preparazione e comparirà qui appena pronto.' +
                  (v.copione.length ? ' Intanto, qui sotto trovi <a href="#vt-copione-t" data-al-testo>il testo del video</a>.' : "") + '</p></div></div>') +
          '</div>' +
          '<div class="vt-info">' +
            '<p class="vt-meta">' + meta.join('<span aria-hidden="true"> · </span>') + '</p>' +
            '<h1 class="vt-titolo" tabindex="-1" id="vt-titolo">' + esc(v.titolo) + '</h1>' +
            (v.descrizione ? '<p class="vt-descrizione">' + esc(v.descrizione) + '</p>' : "") +
            (v.obiettivi.length ? '<div class="vt-obiettivi"><h2>Cose che impari</h2><ul>' + v.obiettivi.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul></div>" : "") +
            prima(v) +
            '<div class="vt-azioni">' +
              (pronto ? '<button type="button" class="pulsante piccolo' + (st.visto ? " secondario" : "") + '" id="vt-visto" aria-pressed="' + st.visto + '">' + (st.visto ? ICONA_OK + "Già visto" : "Segna come visto") + '</button>' : "") +
              '<button type="button" class="pulsante piccolo secondario" id="vt-link">Copia il link</button>' +
              (succ ? '<a class="pulsante piccolo secondario" data-successivo data-titolo="' + esc(succ.titolo) + '" href="video.html#v=' + encodeURIComponent(succ.id) + '">Successivo <span aria-hidden="true">→</span></a>' : "") +
            '</div>' +
            capitoli + copione +
          '</div>' +
        '</div>' +
        '<aside class="vt-lato" aria-label="Altri video del percorso">' +
          (succ ? '<div class="vt-successivo"><p class="vt-lato-t">Il prossimo</p>' + scheda(succ, D, { corto: true }) + '</div>' : "") +
          (correlati.length ? '<p class="vt-lato-t">' + esc(serie.titolo || "Nel percorso") + ' · ' + serie.video.length + ' video</p><ol class="vt-scaletta">' + serie.video.map(function (x) {
            var sx = stato(x);
            return '<li' + (x === v ? ' aria-current="true"' : "") + '><a href="video.html#v=' + encodeURIComponent(x.id) + '"><span class="vt-sc-n">' + (x === v ? "▶" : sx.visto ? "✓" : (x.numero != null ? x.numero : "•")) + '</span><span class="vt-sc-t">' + esc(x.titolo) + (disponibile(x) ? "" : ' <em>in arrivo</em>') + '</span><span class="vt-sc-d">' + durataTesto(x.durata) + '</span></a></li>';
          }).join("") + '</ol>' : "") +
        '</aside>' +
      '</div>' +
      (altri.length ? '<section class="vt-altri" aria-labelledby="vt-altri-t"><h2 id="vt-altri-t" class="vt-sezione-t">Dello stesso livello</h2><div class="v-griglia">' + altri.map(function (x) { return scheda(x, D, { corto: true }); }).join("") + "</div></section>" : "");
    document.title = v.titolo + " — Video di Leo";
    datiStrutturati(v);
    mostra("video");
    var t = document.getElementById("vt-titolo");
    if (t && vistaAttuale === "video-da-clic") { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
    window.scrollTo(0, 0);
    if (pronto) collegaLettore(v, st);
    var alTesto = elVideo.querySelector("[data-al-testo]");
    if (alTesto) alTesto.addEventListener("click", function (e) {
      var h = document.getElementById("vt-copione-t");
      if (!h) return;
      e.preventDefault();
      h.setAttribute("tabindex", "-1");
      try { h.focus({ preventScroll: true }); } catch (x) { h.focus(); }
      h.scrollIntoView({ behavior: riduci ? "auto" : "smooth", block: "start" });
    });
    var bl = document.getElementById("vt-link");
    if (bl) bl.addEventListener("click", function () {
      var base = sitoOnline() || (/^https?:$/.test(location.protocol) ? location.href.split("#")[0].replace(/[^/]*$/, "") : "");
      var link = (base ? base + "video.html" : location.href.split("#")[0]) + "#v=" + encodeURIComponent(v.id);
      var fatto = function () { bl.textContent = "Link copiato!"; setTimeout(function () { bl.textContent = "Copia il link"; }, 1800); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(fatto, function () { copiaVecchia(link); fatto(); });
      else { copiaVecchia(link); fatto(); }
    });
  }
  function prima(v) {
    var l = v.prerequisiti.map(function (id) { return D.video.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    if (!l.length) return "";
    return '<p class="vt-prima"><strong>Prima guarda:</strong> ' + l.map(function (x) {
      return '<a href="video.html#v=' + encodeURIComponent(x.id) + '">' + esc(x.titolo) + (stato(x).visto ? " ✓" : "") + "</a>";
    }).join(", ") + "</p>";
  }
  function copiaVecchia(t) {
    var a = document.createElement("textarea"); a.value = t; a.setAttribute("readonly", ""); a.style.position = "fixed"; a.style.opacity = "0";
    document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (e) { /* niente */ } document.body.removeChild(a);
  }
  /* Dal disco (file://) il browser non carica i .vtt: i sottotitoli si creano dal testo che
     elenco.js porta con se' (vtt_testo, scritto da strumenti/sito_template/videoteca.py). */
  function sottotitoliDaTesto(v) { return !!v.vttTesto && !/^https?:$/.test(location.protocol) && typeof window.VTTCue === "function"; }
  function tempoVtt(s) {
    var p = s.trim().split(":"), t = 0;
    for (var i = 0; i < p.length; i++) t = t * 60 + parseFloat(p[i].replace(",", "."));
    return t;
  }
  function aggiungiSottotitoli(el, testoVtt) {
    try {
      var traccia = el.addTextTrack("subtitles", "Italiano", "it");
      String(testoVtt).replace(/\r/g, "").split(/\n\n+/).forEach(function (blocco) {
        var righe = blocco.split("\n"), i = 0;
        while (i < righe.length && righe[i].indexOf("-->") < 0) i++;
        if (i >= righe.length) return;
        var m = /([\d:.,]+)\s*-->\s*([\d:.,]+)/.exec(righe[i]);
        var parole = righe.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").trim();
        if (m && parole) traccia.addCue(new window.VTTCue(tempoVtt(m[1]), tempoVtt(m[2]), parole));
      });
      traccia.mode = "showing";
    } catch (e) { /* senza sottotitoli: pazienza */ }
  }
  function collegaLettore(v, st) {
    lettore = document.getElementById("vt-player");
    if (!lettore) return;
    if (sottotitoliDaTesto(v)) aggiungiSottotitoli(lettore, v.vttTesto);
    var avviso = document.getElementById("vt-avviso-lettore");
    var riprendi = st && !st.visto && st.t > 5 ? st.t : 0;
    if (riprendi) {
      avviso.hidden = false;
      avviso.innerHTML = 'Riprendi da ' + durataTesto(Math.round(riprendi)) + ' <button type="button" class="link-bottone" id="vt-da-capo">oppure ricomincia da capo</button>';
      document.getElementById("vt-da-capo").addEventListener("click", function () { riprendi = 0; avviso.hidden = true; try { lettore.currentTime = 0; } catch (e) { /* niente */ } lettore.play && lettore.play(); });
    }
    lettore.addEventListener("loadedmetadata", function () { if (riprendi && riprendi < lettore.duration - 3) { try { lettore.currentTime = riprendi; } catch (e) { /* niente */ } } });
    lettore.addEventListener("play", function () { if (riprendi) avviso.hidden = true; });
    lettore.addEventListener("timeupdate", function () {
      var ora = Date.now();
      if (ora - tSalva < 4000) return;
      tSalva = ora;
      var d = lettore.duration || v.durata || 0;
      var cambi = { t: Math.round(lettore.currentTime), d: Math.round(d) };
      if (d && lettore.currentTime / d > 0.92) cambi.visto = true;
      memoria.aggiorna(v.id, cambi);
      if (cambi.visto) segnaVisto(true);
      evidenziaCapitolo();
    });
    lettore.addEventListener("ended", function () {
      memoria.aggiorna(v.id, { visto: true, t: 0 }); segnaVisto(true);
      var s = document.querySelector("[data-successivo]");
      if (s && avviso) {
        avviso.hidden = false;
        avviso.innerHTML = '<strong>Finito!</strong> Il prossimo: <a href="' + esc(s.getAttribute("href")) + '">' + esc(s.getAttribute("data-titolo") || "il video successivo") + ' <span aria-hidden="true">→</span></a>';
      }
    });
    lettore.addEventListener("pause", function () { if (lettore.currentTime > 1) memoria.aggiorna(v.id, { t: Math.round(lettore.currentTime), d: Math.round(lettore.duration || v.durata || 0) }); });
    // tutte le sorgenti fallite: senza internet, o file assente
    var fonti = tutti("source", lettore), ultima = fonti[fonti.length - 1];
    var guasto = function () {
      avviso.hidden = false;
      var online = sitoOnline();
      if (navigator.onLine === false) avviso.innerHTML = "<strong>Serve internet per questo video.</strong> Il sito funziona anche offline, ma i video non sono sul dispositivo: riprova quando sei connesso.";
      else if (online && !/^https?:$/.test(location.protocol)) avviso.innerHTML = 'Questo video non è sul dispositivo. <a href="' + esc(online + "video.html#v=" + encodeURIComponent(v.id)) + '" target="_blank" rel="noopener">Guardalo sul sito di Leo</a>.';
      else avviso.innerHTML = "<strong>Il video non si riesce a caricare.</strong> Riprova tra poco.";
    };
    if (ultima) ultima.addEventListener("error", guasto);
    lettore.addEventListener("error", guasto);
    tutti("[data-salta]", elVideo).forEach(function (b) {
      b.addEventListener("click", function () {
        var t = parseFloat(b.getAttribute("data-salta")) || 0;
        try { lettore.currentTime = t; } catch (e) { /* niente */ }
        var p = lettore.play && lettore.play(); if (p && p.catch) p.catch(function () { /* niente */ });
        lettore.focus();
      });
    });
    var bv = document.getElementById("vt-visto");
    if (bv) bv.addEventListener("click", function () {
      var ora = bv.getAttribute("aria-pressed") !== "true";
      memoria.aggiorna(v.id, { visto: ora });
      segnaVisto(ora);
    });
  }
  function segnaVisto(si) {
    var bv = document.getElementById("vt-visto");
    if (!bv || (bv.getAttribute("aria-pressed") === "true") === si) return;
    bv.setAttribute("aria-pressed", String(si));
    bv.classList.toggle("secondario", si);
    bv.innerHTML = si ? ICONA_OK + "Già visto" : "Segna come visto";
  }
  function evidenziaCapitolo() {
    if (!lettore) return;
    var t = lettore.currentTime, b = tutti("[data-salta]", elVideo), att = -1;
    b.forEach(function (x, i) { if (parseFloat(x.getAttribute("data-salta")) <= t + 0.5) att = i; });
    b.forEach(function (x, i) { if (i === att) x.setAttribute("aria-current", "true"); else x.removeAttribute("aria-current"); });
  }
  function datiStrutturati(v) {
    var vecchio = document.getElementById("vt-ld");
    if (vecchio) vecchio.parentNode.removeChild(vecchio);
    var base = sitoOnline();
    if (!base || !v.mp4) return;
    var o = { "@context": "https://schema.org", "@type": "VideoObject", name: v.titolo, description: v.descrizione || v.titolo, inLanguage: "it",
      thumbnailUrl: v.poster ? base + v.poster : base + "img/og.png", contentUrl: /^https?:/.test(v.mp4) ? v.mp4 : base + v.mp4,
      embedUrl: base + "video.html#v=" + encodeURIComponent(v.id) };
    if (v.durata) o.duration = "PT" + Math.floor(v.durata / 60) + "M" + (v.durata % 60) + "S";
    var s = document.createElement("script"); s.type = "application/ld+json"; s.id = "vt-ld"; s.textContent = JSON.stringify(o);
    document.head.appendChild(s);
  }

  /* ---------------- instradamento */
  function mostra(quale) {
    elCatalogo.hidden = quale !== "catalogo";
    elVideo.hidden = quale !== "video";
    radice.setAttribute("data-vista", quale);
  }
  function instrada() {
    if (lettore) { try { lettore.pause(); } catch (e) { /* niente */ } lettore = null; }
    var h = leggiHash();
    if (h.v) { apriVideo(h.v); return; }
    document.title = titoloBase;
    var vecchio = document.getElementById("vt-ld"); if (vecchio) vecchio.parentNode.removeChild(vecchio);
    filtro = { serie: h.serie && D.perSerie[h.serie] ? h.serie : "", livello: h.livello || "", cerca: h.cerca || "" };
    var eraVideo = radice.getAttribute("data-vista") === "video";
    mostra("catalogo");
    disegnaCatalogo();
    if (eraVideo) window.scrollTo(0, 0);
  }
  radice.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="video.html#v="]');
    if (a) vistaAttuale = "video-da-clic";
    var t = e.target.closest && e.target.closest("[data-torna]");
    if (t && history.length > 1 && document.referrer === "" && false) { e.preventDefault(); history.back(); }
  });
  /* tasti del lettore (fuori dai campi di testo): K/Spazio, frecce, C, F, N */
  document.addEventListener("keydown", function (e) {
    if (!lettore || radice.getAttribute("data-vista") !== "video" || e.ctrlKey || e.metaKey || e.altKey) return;
    var dove = e.target && e.target.tagName;
    if (dove === "INPUT" || dove === "TEXTAREA" || dove === "SELECT" || (e.target && e.target.isContentEditable)) return;
    var sulLettore = e.target === lettore, k = e.key;
    if ((k === " " && !sulLettore && dove !== "BUTTON" && dove !== "A") || k === "k" || k === "K") {
      e.preventDefault();
      if (lettore.paused) { var p = lettore.play(); if (p && p.catch) p.catch(function () { /* niente */ }); } else lettore.pause();
    } else if ((k === "ArrowLeft" || k === "ArrowRight") && !sulLettore && dove !== "BUTTON") {
      e.preventDefault();
      try { lettore.currentTime = Math.max(0, lettore.currentTime + (k === "ArrowLeft" ? -5 : 5)); } catch (x) { /* niente */ }
    } else if (k === "c" || k === "C") {
      var tr = lettore.textTracks && lettore.textTracks[0];
      if (tr) { tr.mode = tr.mode === "showing" ? "hidden" : "showing"; annuncia(tr.mode === "showing" ? "Sottotitoli attivi" : "Sottotitoli spenti"); }
    } else if (k === "f" || k === "F") {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (lettore.requestFullscreen) lettore.requestFullscreen();
        else if (lettore.webkitEnterFullscreen) lettore.webkitEnterFullscreen();
      } catch (x) { /* niente */ }
    } else if (k === "n" || k === "N") {
      var s = document.querySelector("[data-successivo]");
      if (s) { vistaAttuale = "video-da-clic"; s.click(); }
    }
  });
  window.addEventListener("hashchange", instrada);
  window.addEventListener("popstate", instrada);
  document.addEventListener("leo:rete", function () { if (radice.getAttribute("data-vista") === "catalogo" && D) aggiornaNotaRete(); });
  function aggiornaNotaRete() {
    var n = document.getElementById("vt-nota-rete");
    if (n) n.hidden = navigator.onLine !== false;
  }

  carica(function (dati) {
    radice.classList.remove("in-caricamento");
    if (!dati || !dati.video.length) {
      elRisultati.innerHTML = '<div class="vt-vuoto"><p><strong>La videoteca si sta preparando.</strong></p><p>I primi video arriveranno presto. Nel frattempo c\'è il <a href="manuale/index.html">manuale</a> con tanti esempi.</p></div>';
      elConta.textContent = "";
      mostra("catalogo");
      return;
    }
    D = dati;
    var durata = D.video.reduce(function (a, v) { return a + v.durata; }, 0), pronti = D.video.filter(disponibile).length;
    var stimata = D.video.some(function (v) { return v.stimata; });
    if (elStat) elStat.innerHTML = '<li><b>' + D.video.length + '</b> video</li><li><b>' + D.serie.length + '</b> percorsi</li>' +
      (durata ? '<li>' + (stimata ? "circa " : "") + '<b>' + durataParole(durata) + '</b> in tutto</li>' : "") + (pronti < D.video.length ? '<li><b>' + (D.video.length - pronti) + '</b> in arrivo</li>' : "");
    disegnaFiltri();
    aggiornaNotaRete();
    instrada();
  });
})();
