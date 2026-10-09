# Raffaele · Web Designer

Sito vetrina per la realizzazione di siti web su commissione.
HTML, CSS e JavaScript puri: nessuna dipendenza, nessun build, nessun cookie di terze parti.

## Struttura

```
index.html          Home page
privacy.html        Informativa privacy (GDPR)
404.html            Pagina "non trovata"
assets/css/         Stili
assets/js/          Interazioni (menu, demo animata, modulo contatti)
assets/img/         Favicon e immagini
```

## Personalizzare

- **WhatsApp, email, endpoint del modulo**: oggetto `CONFIG` in cima a `assets/js/script.js`.
- **Prezzi e testi**: direttamente in `index.html`.
- **Esempi della demo nell'hero**: oggetto `DEMO_THEMES` in `assets/js/script.js`.

Per ricevere il modulo senza aprire l'app email, crea un modulo gratuito su un servizio come
Formspree e incolla l'URL in `CONFIG.formEndpoint`.

## Vederlo in locale

Apri `index.html` nel browser, oppure:

```bash
python -m http.server 8080
```

## Pubblicazione

Funziona su qualsiasi hosting statico (GitHub Pages, Netlify, Cloudflare Pages).
Su GitHub Pages: Settings → Pages → Branch `main` → cartella `/ (root)`.

## Altri progetti nel repository

- `quanto-mi-conosci/`: party game multiplayer (Node + Socket.IO). Ha un README dedicato con le istruzioni
  di avvio e di deploy (non è un sito statico: non viene pubblicato da GitHub Pages).
