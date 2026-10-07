/* Playground "Prova Leo nel browser".
 *
 * COME FUNZIONA
 * -------------
 * 1. Carica Pyodide (Python compilato in WebAssembly) dal CDN jsdelivr.
 * 2. Scarica l'archivio prova/leo_pyodide.zip (prodotto da
 *    strumenti/sito_template/costruisci_prova.py: il pacchetto leo/ senza le
 *    parti grafiche Qt e senza Leo Studio, più i dati minimi) e lo estrae nel
 *    filesystem virtuale di Pyodide, poi lo aggiunge a sys.path.
 * 3. Esegue i programmi con leo.esecuzione.esegui_sorgente, catturando l'uscita
 *    (callback `uscita`) e l'ingresso (callback `ingresso` -> finestra prompt).
 *    Gli errori di Leo arrivano come ErroreDante e si mostrano con il loro
 *    messaggio italiano (leo.esecuzione.messaggio_errore).
 *
 * Il playground è a riga singola (main thread): va bene per i piccoli
 * programmi degli esempi. Un ciclo infinito bloccherebbe la scheda del browser,
 * come in ogni pagina: lo si chiude ricaricando. Finestre, animazioni e disegni
 * della tartaruga NON si vedono qui (serve Leo Studio): il testo e i calcoli sì.
 */
(function () {
  "use strict";

  // Versione di Pyodide FISSA e stabile. Per aggiornarla basta cambiare qui
  // (Python 3.12). Vedi https://github.com/pyodide/pyodide/releases
  var PYODIDE_VERSIONE = "v0.26.4";
  var PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/" + PYODIDE_VERSIONE + "/full/";
  var ARCHIVIO_LEO = "prova/leo_pyodide.zip";

  // Bootstrap Python: estrae l'archivio, sistema sys.path e i dati, definisce il
  // runner. `_leo_prompt` è una funzione JS (prompt del browser) per l'input.
  var BOOTSTRAP = [
    "import os, sys, json",
    "cwd = os.getcwd()",
    "if cwd not in sys.path:",
    "    sys.path.insert(0, cwd)",
    // i dati (sinonimi, vocabolario) sono stati estratti accanto al pacchetto
    "os.environ['LEO_DATI'] = os.path.join(cwd, 'dati')",
    "from leo.esecuzione import esegui_sorgente, messaggio_errore",
    "from leo.errori import ErroreDante",
    "",
    "def _ingresso(richiesta=''):",
    "    try:",
    "        risposta = _leo_prompt(str(richiesta))",
    "    except Exception:",
    "        risposta = None",
    "    return '' if risposta is None else str(risposta)",
    "",
    "def esegui_leo(sorgente):",
    "    pezzi = []",
    "    try:",
    "        esegui_sorgente(sorgente, uscita=pezzi.append, ingresso=_ingresso)",
    "        return json.dumps({'ok': True, 'uscita': ''.join(pezzi), 'errore': None})",
    "    except ErroreDante as errore:",
    "        return json.dumps({'ok': False, 'uscita': ''.join(pezzi),",
    "                           'errore': messaggio_errore(errore, sorgente)})",
    "    except RecursionError:",
    "        return json.dumps({'ok': False, 'uscita': ''.join(pezzi),",
    "                           'errore': 'Il programma ha fatto troppe chiamate annidate (ricorsione senza fine).'})",
    "    except Exception as errore:",
    "        return json.dumps({'ok': False, 'uscita': ''.join(pezzi),",
    "                           'errore': 'Errore inatteso durante l\\'esecuzione: ' + type(errore).__name__ + ': ' + str(errore)})",
    "",
    "'pronto'",
  ].join("\n");

  // Programmi di esempio: tutti VERIFICATI eseguendo esegui_sorgente (vedi
  // resoconto). Chiave = testo nella tendina.
  var ESEMPI = {
    saluto:
      '# Il tuo primo programma: ricorda, calcola e decide.\n' +
      'variabile nome = "Giulia"\n' +
      'variabile anni = 14\n' +
      '\n' +
      'stampa("Ciao, {nome}!")\n' +
      'stampa("Tra dieci anni avrai {anni + 10} anni.")\n' +
      '\n' +
      'se anni >= 18 allora\n' +
      '    stampa("Sei maggiorenne.")\n' +
      'altrimenti\n' +
      '    stampa("Ti mancano {18 - anni} anni.")\n' +
      'fine\n',
    ciclo:
      '# La tabellina che vuoi: cambia il numero e riesegui.\n' +
      'variabile numero = 7\n' +
      '\n' +
      'per ogni per_quanto in 1..10 fai\n' +
      '    stampa("{numero} x {per_quanto} = {numero * per_quanto}")\n' +
      'fine\n',
    numeri:
      '# Numeri e sotto-sequenze (slicing): estremi inclusi, da 0,\n' +
      '# un estremo negativo conta dalla fine.\n' +
      'variabile parola = "programmare"\n' +
      'variabile numeri = [10, 20, 30, 40, 50]\n' +
      '\n' +
      'stampa(parola[0..2])        # pro\n' +
      'stampa(parola[4..-1])       # rammare\n' +
      'stampa(numeri[1..3])        # [20, 30, 40]\n' +
      '\n' +
      'variabile somma = 0\n' +
      'per ogni n in numeri fai\n' +
      '    somma += n\n' +
      'fine\n' +
      'stampa("Somma: {somma}, media: {somma / lunghezza(numeri)}")\n',
    classe:
      '# Una classe con ereditarietà: Cane è un Animale.\n' +
      'classe Animale\n' +
      '    ha nome\n' +
      '    azione versa()\n' +
      '        stampa("{questo.nome} fa un verso.")\n' +
      '    fine\n' +
      'fine\n' +
      '\n' +
      'classe Cane estende Animale\n' +
      '    azione versa()\n' +
      '        stampa("{questo.nome} fa: Bau!")\n' +
      '    fine\n' +
      'fine\n' +
      '\n' +
      'variabile fido = nuovo Cane("Fido")\n' +
      'variabile micio = nuovo Animale("Micio")\n' +
      'fido.versa()\n' +
      'micio.versa()\n',
  };

  // Rileva (in modo prudente) l'uso di finestre/animazioni, che nel browser non
  // si vedono: lo si segnala senza impedire l'esecuzione (il testo gira lo stesso).
  var RE_FINESTRE = /(^|\n)\s*quando\b|\b(mostra_disegno|mostra_finestra|apri_finestra|finestra|tela|anima|animazione|ogni_istante)\s*\(/;

  var pyodide = null;
  var caricamento = null; // Promise condivisa

  function elementi() {
    return {
      editor: document.getElementById("prova-editor"),
      uscita: document.getElementById("prova-uscita"),
      esegui: document.getElementById("prova-esegui"),
      stato: document.getElementById("prova-stato"),
      esempi: document.getElementById("prova-esempi"),
    };
  }

  function impostaStato(el, testo, tipo) {
    if (!el) return;
    el.setAttribute("data-stato", tipo || "carico");
    // mantiene lo spinner (primo figlio) e aggiorna solo il testo
    var span = el.querySelector(".prova-stato-testo");
    if (span) span.textContent = testo;
  }

  function caricaScript(url) {
    return new Promise(function (risolvi, rifiuta) {
      var s = document.createElement("script");
      s.src = url;
      s.onload = function () { risolvi(); };
      s.onerror = function () { rifiuta(new Error("Non riesco a scaricare " + url)); };
      document.head.appendChild(s);
    });
  }

  // Carica Pyodide + l'archivio di Leo una sola volta. Restituisce una Promise.
  function preparaLeo(el) {
    if (caricamento) return caricamento;
    caricamento = (async function () {
      impostaStato(el.stato, "Carico Python (Pyodide)…", "carico");
      await caricaScript(PYODIDE_BASE + "pyodide.js");
      if (typeof loadPyodide !== "function") {
        throw new Error("Pyodide non si è caricato correttamente.");
      }
      pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });

      impostaStato(el.stato, "Carico Leo…", "carico");
      var risposta = await fetch(ARCHIVIO_LEO);
      if (!risposta.ok) {
        throw new Error("Non riesco a scaricare Leo (" + ARCHIVIO_LEO + "): HTTP " + risposta.status);
      }
      var dati = await risposta.arrayBuffer();
      pyodide.unpackArchive(dati, "zip"); // estrae leo/ e dati/ nella cartella di lavoro

      // input del programma -> finestra prompt del browser
      pyodide.globals.set("_leo_prompt", function (richiesta) {
        var r = window.prompt(richiesta || "Il programma Leo chiede un dato:");
        return r === null ? "" : r;
      });

      await pyodide.runPythonAsync(BOOTSTRAP);
      return pyodide;
    })();
    return caricamento;
  }

  function mostraUscita(el, risultato, sorgente) {
    var frammenti = [];
    if (risultato.uscita) {
      frammenti.push(document.createTextNode(risultato.uscita));
    }
    if (!risultato.ok && risultato.errore) {
      var box = document.createElement("span");
      box.className = "prova-errore";
      // riga vuota di stacco se c'era già uscita
      box.textContent = (risultato.uscita ? "\n" : "") + risultato.errore;
      frammenti.push(box);
    }
    if (RE_FINESTRE.test(sorgente)) {
      var nota = document.createElement("span");
      nota.className = "prova-nota";
      nota.textContent =
        "\n\n(Questo programma usa finestre, animazioni o la tartaruga: " +
        "nel browser si vede solo il testo. Per vederle in azione usa Leo Studio sul PC.)";
      frammenti.push(nota);
    }
    el.uscita.textContent = "";
    if (!frammenti.length) {
      var vuoto = document.createElement("span");
      vuoto.className = "prova-nota";
      vuoto.textContent = "(Il programma non ha scritto nulla.)";
      frammenti.push(vuoto);
    }
    frammenti.forEach(function (f) { el.uscita.appendChild(f); });
  }

  async function esegui(el) {
    var sorgente = el.editor.value;
    el.esegui.disabled = true;
    try {
      await preparaLeo(el);
      impostaStato(el.stato, "Eseguo…", "carico");
      var fn = pyodide.globals.get("esegui_leo");
      var grezzo = fn(sorgente);
      if (fn.destroy) fn.destroy();
      var risultato = JSON.parse(grezzo);
      mostraUscita(el, risultato, sorgente);
      impostaStato(el.stato, risultato.ok ? "Fatto." : "Il programma ha un errore.",
                   risultato.ok ? "pronto" : "errore");
    } catch (errore) {
      el.uscita.textContent = "";
      var box = document.createElement("span");
      box.className = "prova-errore";
      box.textContent = "Non riesco a eseguire: " + (errore && errore.message ? errore.message : errore) +
        "\n\nControlla la connessione a internet e riprova (il playground scarica Python dal web).";
      el.uscita.appendChild(box);
      impostaStato(el.stato, "Caricamento non riuscito.", "errore");
    } finally {
      el.esegui.disabled = false;
    }
  }

  function avvia() {
    var el = elementi();
    if (!el.editor || !el.esegui) return;

    // esempio iniziale
    if (!el.editor.value.trim()) el.editor.value = ESEMPI.saluto;

    el.esegui.addEventListener("click", function () { esegui(el); });

    // Ctrl/Cmd + Invio esegue
    el.editor.addEventListener("keydown", function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        esegui(el);
      }
    });

    if (el.esempi) {
      el.esempi.addEventListener("change", function () {
        var chiave = el.esempi.value;
        if (ESEMPI[chiave]) {
          el.editor.value = ESEMPI[chiave];
          el.editor.focus();
        }
      });
    }

    // Avvia subito il caricamento di Pyodide/Leo: così quando l'utente preme
    // "Esegui" di solito è già pronto. Non blocca la scrittura nell'editor.
    preparaLeo(el).then(function () {
      impostaStato(el.stato, "Leo è pronto: premi «Esegui».", "pronto");
      el.esegui.disabled = false;
    }).catch(function (errore) {
      impostaStato(el.stato, "Leo non si è caricato: " +
        (errore && errore.message ? errore.message : errore), "errore");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }
})();
