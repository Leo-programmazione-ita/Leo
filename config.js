/*
  CONFIGURAZIONE DEL SITO DI LEO
  ==============================
  E' l'unico file da modificare per collegare il sito al download e ai contatti.
  Regole: lascia le virgolette, cambia solo il testo tra le virgolette,
  non togliere le virgole a fine riga. Dopo la modifica ricarica la pagina.
*/
window.LEO_CONFIG = {

  /* --- Download ---------------------------------------------------------------
     Indirizzo del programma di installazione (per esempio il link di GitHub
     Releases, Google Drive, Dropbox o del tuo sito).
     ""  -> i pulsanti "Scarica Leo" mostrano "Link in arrivo" e non portano altrove. */
  urlDownload: "",

  /* Versione e dimensione mostrate sotto il pulsante ("" = non mostrarle). */
  versione: "",
  dimensione: "",

  /* App Leo per Android: indirizzo dell'APK (o della pagina del Play Store).
     ""  -> il pulsante "Scarica l'app" mostra "Link in arrivo".                 */
  urlDownloadAndroid: "https://leoitalia.com/download/Leo-0.1.0.apk",
  versioneAndroid: "0.1.0",

  /* --- Indirizzo del sito pubblicato ------------------------------------------
     Serve quando il sito si apre dal disco o dentro l'app: senza i video sul
     dispositivo, con la rete si guardano da qui; e per i link "Copia il link".
     Si cambia insieme a canonical, Open Graph, sitemap e robots con:
       python3 strumenti/sito_template/dominio.py https://www.esempio.it        */
  indirizzoSito: "https://leoitalia.com/",

  /* --- Contatti ---------------------------------------------------------------
     Email del titolare: compare nel piede, nei termini, nella privacy e nel
     pulsante "Contattami per la licenza". "" = "email in arrivo".               */
  emailContatto: "leoprogrammazioneita@proton.me",

  /* --- Licenza (licenza.html e scarica.html) ----------------------------------
     prezzo: per esempio "29 €" ("" = "Prezzo in arrivo").
     notaPrezzo: una riga sotto il prezzo, per esempio "licenza a vita, IVA inclusa".
     linkPagamento: pagina di pagamento (Stripe, PayPal, Gumroad...);
                    "" = pulsante "Contattami per la licenza" via email.           */
  /* telefonoLicenza: la chiave di licenza (product key) si richiede SOLO per telefono.
     Scrivi il numero come vuoi che appaia, per esempio "+39 333 123 4567"
     ("" = "Numero in arrivo").                                                    */
  telefonoLicenza: "+39 350 059 0978",

  prezzo: "",
  notaPrezzo: "",
  linkPagamento: "",

  /* Giorni di prova: deve corrispondere a quelli di Leo Studio. */
  giorniProva: 90
};
