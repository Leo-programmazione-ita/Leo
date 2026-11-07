#!/usr/bin/env python3
"""Copia la stessa intestazione e lo stesso piede in tutte le pagine del sito.

Uso (dalla cartella del sito):  python3 strumenti/allinea_testata_piede.py

- Sostituisce cio' che sta fra <!--#testata--> e <!--/testata--> e fra <!--#piede--> e
  <!--/piede-->. Una pagina con <header class="testata"> o <footer class="piede"> senza
  segnaposto li riceve attorno al blocco.
- I percorsi sono relativi: in una pagina dentro manuale/ diventano "../index.html" e cosi' via;
  404.html usa percorsi assoluti ("/index.html") perche' GitHub Pages la mostra a qualunque
  profondita'.
- La voce della pagina corrente ha aria-current="page".
- Allinea anche la versione di css/stile.css (?v=...) in tutte le pagine.
- Le pagine a se' (iphone.html, informatica/, leone-demo.html, guida.html) non si toccano.

Le voci dei menu stanno in NAV e PIEDE qui sotto: si cambiano solo qui.
"""
from __future__ import annotations

import pathlib
import re
import sys

RADICE = pathlib.Path(__file__).resolve().parent.parent
VERSIONE_CSS = "20261107"
ESCLUSE = {"iphone.html", "leone-demo.html", "guida.html"}
CARTELLE_ESCLUSE = {"informatica", "node_modules", ".git", "strumenti"}

FRECCIA = ('<svg class="nav-frec" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>')

# (etichetta, percorso) oppure (etichetta, [voci]) per un menu a tendina
NAV = [
    ("Home", "index.html"),
    ("Impara", [
        ("Manuale completo", "manuale/index.html"),
        ("Guide delle edizioni", "manuali/index.html"),
        ("Riferimento", "riferimento/index.html"),
        ("Domande frequenti", "manuale/domande.html"),
        ("Prova nel browser", "prova.html"),
        ("Pensare in codice", "informatica/index.html"),
        ("Il libro", "libro/index.html"),
        ("Esempi", "template.html"),
        ("Leo a scuola", "scuola.html"),
    ]),
    ("Scopri", [
        ("Leo Suite", "suite.html"),
        ("Leo Web", "web.html"),
        ("Leo Dati", "dati.html"),
        ("Leo Giochi", "giochi.html"),
        ("Leo Sistema", "sistema.html"),
        ("Leo Sicurezza", "sicurezza.html"),
        ("Leo Robotica", "robotica.html"),
        ("Cosa fa ogni edizione", "edizioni.html"),
        ("Leo e Python a confronto", "confronto.html"),
    ]),
    ("Risorse", [
        ("Video", "video.html"),
        ("Novità", "novita.html"),
        ("Fatto con Leo", "fatto-con-leo.html"),
        ("Statistiche", "statistiche.html"),
    ]),
    ("Telefono", "telefono.html"),
]

PIEDE = [
    ("Leo", [
        ("Home", "index.html"),
        ("Leo Suite", "suite.html"),
        ("Scarica", "scarica.html"),
        ("Leo sul telefono", "telefono.html"),
        ("Novità", "novita.html"),
        ("Fatto con Leo", "fatto-con-leo.html"),
        ("Videoteca", "video.html"),
        ("Statistiche", "statistiche.html"),
    ]),
    ("Impara", [
        ("Manuale completo", "manuale/index.html"),
        ("Guide delle edizioni", "manuali/index.html"),
        ("Riferimento", "riferimento/index.html"),
        ("Domande frequenti", "manuale/domande.html"),
        ("Prova nel browser", "prova.html"),
        ("Pensare in codice", "informatica/index.html"),
        ("Il libro", "libro/index.html"),
        ("Esempi pronti", "template.html"),
        ("Leo a scuola", "scuola.html"),
    ]),
    ("Edizioni", [
        ("Web", "web.html"),
        ("Dati", "dati.html"),
        ("Giochi", "giochi.html"),
        ("Sistema", "sistema.html"),
        ("Sicurezza", "sicurezza.html"),
        ("Robotica", "robotica.html"),
        ("Cosa fa ogni edizione", "edizioni.html"),
        ("Leo e Python", "confronto.html"),
    ]),
    ("Legale", [
        ("Licenza", "licenza.html"),
        ("Termini d'uso", "termini.html"),
        ("Privacy", "privacy.html"),
        ("Contatti", None),
    ]),
]


def collegamento(etichetta: str, percorso: str, pagina: str, prefisso: str, attr: str = "") -> str:
    corrente = ' aria-current="page"' if percorso == pagina else ""
    return f'<a{attr} href="{prefisso}{percorso}"{corrente}>{etichetta}</a>'


def testata(pagina: str, p: str) -> str:
    righe = []
    for etichetta, voce in NAV:
        if isinstance(voce, str):
            righe.append(f"        <li>{collegamento(etichetta, voce, pagina, p)}</li>")
            continue
        righe.append('        <li class="nav-gruppo">')
        righe.append(f'          <button type="button" class="nav-apri" aria-expanded="false">{etichetta}')
        righe.append(f"            {FRECCIA}")
        righe.append("          </button>")
        righe.append('          <ul class="nav-tendina">')
        for e, v in voce:
            righe.append(f"            <li>{collegamento(e, v, pagina, p)}</li>")
        righe.append("          </ul>")
        righe.append("        </li>")
    corrente = ' aria-current="page"' if pagina == "scarica.html" else ""
    righe.append(f'        <li class="voce-scarica"><a class="pulsante piccolo" href="{p}scarica.html"{corrente}>Scarica</a></li>')
    nav = "\n".join(righe)
    return f'''
<header class="testata">
  <div class="contenitore">
    <a class="marchio" href="{p}index.html" aria-label="Leo, pagina principale">
      <img src="{p}img/stemma_192.png" alt="" width="30" height="30"><span>Leo</span>
    </a>
    <nav id="navigazione" class="navigazione" aria-label="Principale">
      <ul>
{nav}
      </ul>
    </nav>
    <button class="apri-cerca" type="button" data-apri-cerca aria-label="Cerca nel sito" title="Cerca (tasto /)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
      <span class="apri-cerca-testo">Cerca</span><kbd aria-hidden="true">/</kbd>
    </button>
    <button class="cambia-tema" type="button" data-cambia-tema aria-label="Passa al tema chiaro" title="Tema chiaro">
      <svg class="icona-sole" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>
      <svg class="icona-luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
    </button>
    <button class="apri-menu" type="button" aria-expanded="false" aria-controls="navigazione" aria-label="Apri il menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 8h16M4 16h16"/></svg>
    </button>
  </div>
</header>
<p class="avviso-rete" data-avviso-rete hidden role="status">Sei senza internet: il sito funziona lo stesso, tranne i video che non sono sul dispositivo e i download.</p>
'''


def piede(pagina: str, p: str) -> str:
    colonne = []
    for titolo, voci in PIEDE:
        li = []
        for e, v in voci:
            if v is None:
                li.append('          <li><a href="#" data-email>Contatti</a></li>')
            else:
                li.append(f"          <li>{collegamento(e, v, pagina, p)}</li>")
        aria = "Informazioni legali" if titolo == "Legale" else titolo
        colonne.append(f'''      <nav class="piede-colonna" aria-label="{aria}">
        <h2>{titolo}</h2>
        <ul>
{chr(10).join(li)}
        </ul>
      </nav>''')
    return f'''
<footer class="piede">
  <div class="contenitore">
    <div class="piede-griglia">
      <div class="piede-marchio">
        <a class="marchio" href="{p}index.html" aria-label="Leo, pagina principale">
          <img src="{p}img/stemma_192.png" alt="" width="30" height="30"><span>Leo</span>
        </a>
        <p>Il linguaggio di programmazione che parla italiano: un solo linguaggio per siti, dati, giochi, agenti, sicurezza e robotica. Sul PC con Leo Studio, sul telefono con l'app Leo.</p>
        <p class="piede-autore">Ideato e sviluppato in Italia da <strong>Rosario Zappalà</strong>.</p>
      </div>
{chr(10).join(colonne)}
    </div>
    <div class="piede-fondo">
      <p>© <span data-anno>2026</span> Rosario Zappalà, tutti i diritti riservati. I programmi scritti in Leo appartengono ai loro autori.</p>
      <div class="scelta-tema" role="radiogroup" aria-label="Aspetto del sito">
        <button type="button" role="radio" aria-checked="true" data-tema-scelta="scuro">Nero e rosso</button>
        <button type="button" role="radio" aria-checked="false" data-tema-scelta="chiaro" tabindex="-1">Chiaro</button>
        <button type="button" role="radio" aria-checked="false" data-tema-scelta="sistema" tabindex="-1">Come il sistema</button>
      </div>
      <p>Niente cookie, niente tracciamento. Alcune pagine usano servizi esterni: <a href="{p}privacy.html#servizi-esterni">quali e perché</a>.</p>
    </div>
  </div>
</footer>
'''


def sostituisci(testo: str, nome: str, tag: str, classe: str, nuovo: str) -> tuple[str, bool]:
    inizio, fine = f"<!--#{nome}-->", f"<!--/{nome}-->"
    if inizio in testo and fine in testo:
        a = testo.index(inizio) + len(inizio)
        b = testo.index(fine, a)
        return testo[:a] + nuovo + testo[b:], True
    m = re.search(rf'<{tag} class="{classe}">.*?</{tag}>\n?', testo, re.S)
    if not m:
        return testo, False
    return testo[:m.start()] + inizio + nuovo + fine + "\n" + testo[m.end():], True


def main() -> int:
    cambiate = 0
    for percorso in sorted(RADICE.rglob("*.html")):
        rel = percorso.relative_to(RADICE).as_posix()
        if rel.split("/")[0] in CARTELLE_ESCLUSE or rel in ESCLUSE:
            continue
        testo = percorso.read_text(encoding="utf-8")
        prefisso = "/" if rel == "404.html" else "../" * rel.count("/")
        nuovo, _ = sostituisci(testo, "testata", "header", "testata", testata(rel, prefisso))
        nuovo, _ = sostituisci(nuovo, "piede", "footer", "piede", piede(rel, prefisso))
        nuovo = re.sub(r'(href="(?:\.\./|/)*css/stile\.css)(?:\?v=[^"]*)?"', rf'\1?v={VERSIONE_CSS}"', nuovo)
        if nuovo != testo:
            percorso.write_text(nuovo, encoding="utf-8")
            cambiate += 1
    print(f"Pagine aggiornate: {cambiate}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
