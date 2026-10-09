# Quanto Mi Conosci? 👀

Party game multiplayer in tempo reale da giocare col telefono durante una serata tra amici.
Ognuno risponde in segreto a domande su sé stesso; poi, a turno, gli altri provano a indovinare.
Niente installazione, niente account: si entra con un link o con un codice di 4 lettere.

## Stack

- **Server**: Node + Express + Socket.IO (TypeScript, eseguito con `tsx`). Le stanze vivono in memoria e
  scadono dopo 2 ore di inattività.
- **Client**: React + Vite (TypeScript). In produzione è il server Node a servire il client, quindi c'è
  **un solo servizio** da pubblicare.

## Struttura

```
data/questions.json     Banca domande (65 domande, 4 categorie): modificala senza toccare il codice
shared/                 Tipi ed eventi realtime + regole condivise da client e server
server/index.ts         Server HTTP + Socket.IO, gestione stanze e pulizia periodica
server/room.ts          Tutta la logica di gioco (fasi, punti, titoli finali)
server/questions.ts     Caricamento/validazione domande ed estrazione casuale
server/analytics.ts     [predisposizione] statistiche anonime (/api/stats)
server/packs.ts         [predisposizione] pacchetti di domande a pagamento
src/screens/            Home, Lobby, Risposte, Indovinelli, Classifica
src/components/         Avatar, domanda (scelta multipla/slider), timer, spazio annunci
src/lib/                Connessione, salvataggio identità, card condivisibile (canvas)
src/config/features.ts  [predisposizione] interruttori per annunci e pacchetti premium
```

## Avviarlo in locale

Serve Node 20 o più recente.

```bash
cd quanto-mi-conosci
npm install
npm run dev
```

Apri **http://localhost:5173**. Per simulare più giocatori apri più finestre in incognito o browser diversi:
ogni finestra normale condivide l'identità salvata con le altre schede.

## Provarlo con gli amici in rete locale

1. Telefoni e computer devono essere sulla stessa rete Wi-Fi.
2. `npm run dev`: nel terminale Vite stampa una riga `Network: http://192.168.x.x:5173`.
3. Apri quell'indirizzo sui telefoni (o crea la stanza dal computer e manda il link nel gruppo).

In alternativa, la versione di produzione in locale:

```bash
npm run build
npm start          # http://localhost:3000 e http://<IP-del-computer>:3000
```

## Pubblicarlo online gratis (Render)

1. Fai il push del repository su GitHub.
2. Su [render.com](https://render.com) → **New → Blueprint** → scegli il repository: il file
   `render.yaml` nella cartella principale configura tutto da solo.
   (Oppure **New → Web Service** a mano con: Root Directory `quanto-mi-conosci`,
   Build `npm install && npm run build`, Start `npm start`, piano Free.)
3. Dopo il deploy il gioco è su `https://quanto-mi-conosci.onrender.com` (o simile).

Nota: col piano gratuito il servizio si addormenta dopo 15 minuti senza visite e il primo accesso
impiega circa 30-50 secondi. Riavviandosi, le stanze in memoria si perdono, ma a quel punto non c'è
nessuno che stia giocando. Funziona anche su Railway, Fly.io o un qualsiasi VPS: basta `npm run build`
e `npm start` (la porta si legge da `PORT`).

## Aggiungere domande

Apri `data/questions.json` e aggiungi un oggetto a `questions`:

```json
{ "id": "L18", "category": "leggere", "type": "choice",
  "text": "La tua bevanda da aperitivo?", "options": ["Spritz", "Birra", "Analcolico", "Quello che offrono"] }
```

oppure con lo slider (0-10, vale come indovinata anche una risposta a ±1):

```json
{ "id": "L19", "category": "leggere", "type": "slider",
  "text": "Quanto sei ritardatario?", "min": 0, "max": 10, "minLabel": "Svizzero", "maxLabel": "Arrivo domani" }
```

Regole: `id` unico, 4 opzioni esatte, domande in seconda persona. All'avvio il server controlla il
file e, se trova un errore, indica la domanda da correggere. Per una nuova categoria aggiungila in `categories`.

## Regole di gioco

- Da 3 a 10 giocatori. L'host sceglie categoria, numero di domande (5/8/10), timer e bonus velocità.
- +1 per ogni risposta indovinata, +1 extra a chi indovina per primo (se il bonus è attivo).
- Dopo ogni rivelazione l'host o il protagonista passa alla domanda successiva.
- Titoli finali: Lo Sherlock del gruppo, Libro aperto, Il più imprevedibile, Più veloce della spunta blu,
  Ma vi conoscete?

## Casi limite gestiti

- **Refresh o telefono in standby**: l'identità è salvata in `localStorage` e si rientra al punto esatto.
- **Disconnessione**: il gioco non aspetta chi è offline. In lobby chi resta offline per 2 minuti viene tolto.
- **Host che esce**: il ruolo passa subito a un altro giocatore, oppure dopo 15 secondi se l'host è solo
  disconnesso.
- **Nomi duplicati** e **codici errati**: messaggio chiaro, senza bloccare nulla.
- **Ritardatari**: l'host può saltare l'attesa ("Non aspettare i ritardatari", "Rivela subito").

## Predisposizioni future (spente)

- **Pacchetti a pagamento**: categorie con `"premium": true` in `questions.json`, verifica in `server/packs.ts`.
- **Annunci**: `src/config/features.ts` → `ads.enabled`. Gli spazi sono solo in lobby e in classifica, mai
  durante le domande.
- **Statistiche anonime**: `server/analytics.ts` conta stanze, partite, giocatori medi e completamento.
  Il riepilogo è su `/api/stats`. Nessun dato personale.
