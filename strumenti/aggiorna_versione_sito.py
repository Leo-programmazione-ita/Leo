"""Porta il sito a una nuova versione di Leo leggendo i dati VERI della release su GitHub.

Uso (dalla radice del sito):
    python3 strumenti/aggiorna_versione_sito.py --da 0.1.4 --a 0.1.5 [--json release.json]

Cosa fa:
- legge la release v<a> (API pubblica di GitHub, oppure un file JSON già scaricato con --json):
  per ogni file nome, dimensione e impronta SHA-256 (campo ``digest``);
- si ferma se la release è in bozza o se manca anche uno dei 14 file attesi;
- sostituisce la versione nei link e nei testi di tutte le pagine (non in novita.html, che è storia);
- aggiorna i pesi in MB dentro ogni collegamento a un file della release, nel riquadro consigliato
  e in config.js; aggiorna la tabella delle impronte in scarica.html.
Stampa un riepilogo e non tocca nulla se qualcosa non torna.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

RADICE = Path(__file__).resolve().parents[1]
REPO = "Leo-programmazione-ita/Leo"
EDIZIONI = ["", "Web", "Dati", "Giochi", "Sistema", "Sicurezza", "Robotica"]


def nomi_attesi(versione: str) -> list[str]:
    exe = [f"Setup_Leo_{e + '_' if e else ''}{versione}.exe" for e in EDIZIONI]
    apk = [f"Leo-{e + '-' if e else ''}{versione}.apk" for e in EDIZIONI]
    return exe + apk


def mb(byte: int) -> int:
    """Come sul sito finora: mebibyte arrotondati (301 935 168 byte -> 288 MB)."""
    return round(byte / 1048576)


def leggi_release(versione: str, file_json: str | None) -> dict:
    if file_json:
        return json.loads(Path(file_json).read_text(encoding="utf-8"))
    url = f"https://api.github.com/repos/{REPO}/releases/tags/v{versione}"
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "leo-sito"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def file_della_release(rel: dict, versione: str) -> dict[str, dict]:
    if rel.get("draft"):
        raise SystemExit("La release è ancora in bozza: il sito non va aggiornato.")
    asset = {a["name"]: a for a in rel.get("assets", []) if a.get("state", "uploaded") == "uploaded"}
    mancanti = [n for n in nomi_attesi(versione) if n not in asset]
    if mancanti:
        raise SystemExit("Mancano file nella release: " + ", ".join(mancanti))
    out = {}
    for n in nomi_attesi(versione):
        a = asset[n]
        dig = str(a.get("digest") or "")
        if not dig.startswith("sha256:"):
            raise SystemExit(f"{n}: GitHub non riporta l'impronta SHA-256.")
        out[n] = {"dimensione": int(a["size"]), "sha256": dig.split(":", 1)[1]}
    return out


def aggiorna(da: str, a: str, dati: dict[str, dict]) -> list[str]:
    cambiati = []
    pagine = sorted(RADICE.glob("**/*.html")) + [RADICE / "config.js"]
    re_ancora = re.compile(r'<a\b[^>]*href="[^"]*releases/download/v' + re.escape(a) + r'/([^"]+)"[^>]*>.*?</a>', re.S)
    for p in pagine:
        if p.name == "novita.html" or ".git" in p.parts or "strumenti" in p.parts:
            continue
        t = p.read_text(encoding="utf-8")
        n = t.replace(f"v{da}/", f"v{a}/").replace(f"_{da}.exe", f"_{a}.exe").replace(f"-{da}.apk", f"-{a}.apk")
        n = n.replace(f"Versione {da}", f"Versione {a}").replace(f"<span>{da}</span>", f"<span>{a}</span>")
        n = n.replace(f"Setup_Leo_{da}.exe", f"Setup_Leo_{a}.exe").replace(f"/tag/v{da}", f"/tag/v{a}")
        n = n.replace(f"Versione {da},", f"Versione {a},")
        n = n.replace(f'"softwareVersion":"{da}"', f'"softwareVersion":"{a}"')
        n = re.sub(r'("fileSize":")\d+( MB")', lambda m: m.group(1) + str(mb(dati[f"Setup_Leo_{a}.exe"]["dimensione"])) + m.group(2), n)

        # pesi dentro ogni collegamento a un file della release
        def peso(m: re.Match) -> str:
            info = dati.get(m.group(1))
            if not info:
                return m.group(0)
            return re.sub(r"\b\d+ MB\b", f"{mb(info['dimensione'])} MB", m.group(0))
        n = re_ancora.sub(peso, n)

        if p.name == "scarica.html":
            suite_exe = dati[f"Setup_Leo_{a}.exe"]["dimensione"]
            suite_apk = dati[f"Leo-{a}.apk"]["dimensione"]
            n = re.sub(r'(data-dl-meta>)\d+ MB', rf'\g<1>{mb(suite_exe)} MB', n)
            n = re.sub(r'(Scarica per Android</a> \()\d+ MB', rf'\g<1>{mb(suite_apk)} MB', n)
            n = re.sub(r'(textContent = ")\d+( MB · app \.apk")', rf'\g<1>{mb(suite_apk)}\2', n)
            n = re.sub(r"(scarica per Windows</a> \()\d+( MB\))", rf"\g<1>{mb(suite_exe)}\2", n)
            for nome, info in dati.items():
                n = re.sub(r'(<span class="dl-hash-file">' + re.escape(nome) + r'</span><code>)[0-9a-f]{64}(</code>)',
                           rf"\g<1>{info['sha256']}\2", n)
        if p.name == "config.js":
            n = re.sub(r'(dimensione:\s*")\d+ MB', rf'\g<1>{mb(dati[f"Setup_Leo_{a}.exe"]["dimensione"])} MB', n)
            n = re.sub(r'(versione(?:Android)?:\s*")' + re.escape(da) + '"', rf'\g<1>{a}"', n)
        if n != t:
            p.write_text(n, encoding="utf-8")
            cambiati.append(str(p.relative_to(RADICE)))
    return cambiati


def controlla(da: str, a: str, dati: dict[str, dict]) -> list[str]:
    problemi = []
    for p in sorted(RADICE.glob("**/*.html")):
        if p.name == "novita.html" or ".git" in p.parts:
            continue
        t = p.read_text(encoding="utf-8")
        if f"v{da}/" in t or f"_{da}.exe" in t or f"-{da}.apk" in t or f'"softwareVersion":"{da}"' in t:
            problemi.append(f"{p.relative_to(RADICE)}: restano riferimenti a {da}")
    s = (RADICE / "scarica.html").read_text(encoding="utf-8")
    for nome, info in dati.items():
        if info["sha256"] not in s:
            problemi.append(f"scarica.html: manca l'impronta di {nome}")
    return problemi


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--da", required=True)
    ap.add_argument("--a", required=True)
    ap.add_argument("--json", help="release già scaricata (risposta dell'API di GitHub)")
    o = ap.parse_args(argv)
    dati = file_della_release(leggi_release(o.a, o.json), o.a)
    cambiati = aggiorna(o.da, o.a, dati)
    for c in cambiati:
        print("aggiornato:", c)
    problemi = controlla(o.da, o.a, dati)
    for p in problemi:
        print("PROBLEMA:", p)
    print(f"{len(cambiati)} file aggiornati, {len(problemi)} problemi")
    return 1 if problemi else 0


if __name__ == "__main__":
    sys.exit(main())
