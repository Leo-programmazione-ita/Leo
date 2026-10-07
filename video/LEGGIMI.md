# Videoteca del sito di Leo

La pagina `sito/video.html` (e le anteprime nella home) mostra i video elencati in
**`sito/video/elenco.json`**. Per aggiungere un video basta mettere i suoi file in questa
cartella e aggiungere una voce all'elenco: la pagina crea da sola percorsi, filtri, ricerca,
"continua a guardare", "già visto", capitoli, correlati e "il prossimo".

I video tutorial di Leo l'elenco lo scrive da solo `strumenti/video/monta.py` (vedi
`video/LEGGIMI.md`): ci sono **tutti** i video, anche quelli non ancora montati, che compaiono
«in arrivo» con la locandina e il testo del copione.

Dopo ogni modifica dell'elenco:

```
python3 strumenti/sito_template/videoteca.py
```

riscrive `elenco.js` (la stessa cosa in forma di script, che serve quando il sito si apre
dal disco o dentro l'app, dove `elenco.json` non si può leggere) e segnala i file mancanti.
`android/prepara_sorgenti.py` e l'installatore di Windows lo rifanno comunque da soli.

## Formato di `elenco.json`

```json
{
  "serie": [
    {"id": "primi-passi", "titolo": "Primi passi", "descrizione": "Il primo programma, gli errori che aiutano."}
  ],
  "video": [
    {
      "id": "01_primo-programma",
      "serie": "primi-passi",
      "titolo": "Il primo programma",
      "descrizione": "Scrivi, premi Esegui, leggi l'uscita.",
      "livello": "principiante",
      "durata": 184,
      "mp4": "01_primo-programma/video.mp4",
      "vtt": "01_primo-programma/video.vtt",
      "poster": "01_primo-programma/poster.jpg",
      "capitoli": [{"t": 0, "titolo": "Apri Leo"}, {"t": 42, "titolo": "Premi Esegui"}],
      "obiettivi": ["scrivere stampa", "eseguire un programma"],
      "prerequisiti": []
    },
    {
      "id": "02_decisioni",
      "serie": "primi-passi",
      "titolo": "Decisioni e cicli",
      "durata": 225.3,
      "stimata": true,
      "mp4": null,
      "poster": "02_decisioni/poster.jpg",
      "copione": [{"titolo": "Se, altrimenti", "testo": "Un programma può scegliere..."}]
    }
  ]
}
```

| Campo | Obbligatorio | Significato |
| --- | --- | --- |
| `serie[].id` | sì | Nome breve del percorso, senza spazi (`primi-passi`, `telefono-hardware`, `trucchi`...) |
| `serie[].titolo`, `descrizione` | no | Come compare nella pagina (senza titolo: l'id con la maiuscola) |
| `video[].id` | sì | Unico. Con il numero davanti (`NN_slug`) il numero compare sulla scheda |
| `serie` | no | L'id della serie; se non è tra le `serie` il percorso si crea da solo (in fondo) |
| `titolo` | sì | Titolo del video |
| `descrizione` | no | Una o due frasi |
| `livello` | no | `principiante`, `intermedio`, `avanzato` (diventano i filtri per livello) |
| `durata` | no | Secondi (anche con i decimali) oppure `"3:04"` |
| `stimata` | no | `true` se la durata è stimata (video non ancora montato): la pagina scrive «circa» |
| `copione` | no | Il testo del video non ancora montato: `[{"titolo": "...", "testo": "..."}]`, una voce per slide |
| `mp4` | no | Il video. **Senza `mp4` (o con `null`) il video compare come «In arrivo»**: al posto del lettore la locandina, poi le cose che si imparano e il `copione` |
| `vtt` | no | Sottotitoli in italiano (WebVTT), attivi all'avvio |
| `poster` | no | Immagine di copertina (JPEG o WebP, 1280×720, meglio sotto i 150 KB) |
| `anteprima` | no | Immagine piccola per le schede (se manca si usa `poster`) |
| `capitoli` | no | `[{"t": secondi o "m:ss", "titolo": "..."}]`: pulsanti che saltano al punto giusto |
| `obiettivi` | no | Elenco di cose che si imparano ("Cose che impari") |
| `prerequisiti` | no | Id di video da guardare prima ("Prima guarda") |

I percorsi (`mp4`, `vtt`, `poster`, `anteprima`) sono **relativi a questa cartella**
(`sito/video/`); vanno bene anche indirizzi `https://...` completi. I campi sconosciuti sono
ignorati e quelli mancanti non rompono niente: la pagina mostra quello che c'è.
L'ordine dei percorsi è quello di `serie`; dentro un percorso conta l'ordine di `video`.

## Offline e dentro le app

Il sito si apre anche senza internet (dall'app Leo, da *Guida e sito* di Leo Studio o con un
doppio clic su `index.html`). Nelle copie per l'app e per l'installatore **i file dei video non
ci sono** (sarebbero troppo pesanti): locandine, sottotitoli, capitoli e il testo dei video
«in arrivo» sì. Quando l'utente
preme ▶ e un video non è sul dispositivo, il lettore lo prende dal sito pubblicato
(`indirizzoSito` in `sito/config.js`); senza rete lo dice con garbo.

"Continua a guardare" e "già visto" restano solo nel browser di chi guarda (localStorage):
niente account, niente dati inviati.
