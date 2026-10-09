import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Session } from '../shared/types';
import { CODE_LENGTH, ROOM_TTL_MS, normalizeCode, normalizeName } from '../shared/rules';
import { Room } from './room';
import { getStats, track } from './analytics';

const PORT = Number(process.env.PORT) || 3000;
const DIST = fileURLToPath(new URL('../dist', import.meta.url));

const app = express();
const httpServer = createServer(app);
// Alla riconnessione è il client a rientrare con room:rejoin (vedi src/lib/socket.ts)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

// ─── Stanze ───────────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
// Lettere senza I e O per evitare confusione con 1 e 0
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function createRoom(): Room {
  let code: string;
  do {
    code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  const room = new Room(code, (socketId, view) => io.to(socketId).emit('room:state', view));
  rooms.set(code, room);
  track({ type: 'room_created' });
  return room;
}

function deleteRoom(room: Room, reason: string): void {
  if (room.phase === 'answering' || room.phase === 'guessing') track({ type: 'game_abandoned', phase: room.phase });
  for (const p of room.players.values()) if (p.socketId) io.to(p.socketId).emit('room:gone', reason);
  room.dispose();
  rooms.delete(room.code);
}

// Pulizia periodica: stanze inattive da 2 ore, host offline, giocatori fantasma
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (now - room.lastActivity > ROOM_TTL_MS) deleteRoom(room, 'La stanza è scaduta per inattività.');
    else {
      room.sweep(now);
      if (room.isEmpty()) deleteRoom(room, 'La stanza è vuota.');
    }
  }
}, 5_000).unref();

// ─── Connessioni realtime ─────────────────────────────────────────────────────

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, { session?: Session }>;

io.on('connection', (socket: GameSocket) => {
  /** Stanza e giocatore di questo socket, se è dentro una stanza */
  const current = () => {
    const s = socket.data.session;
    const room = s ? rooms.get(s.code) : undefined;
    return room && s && room.players.has(s.playerId) ? { room, playerId: s.playerId } : null;
  };

  const enter = (room: Room, playerId: string, token: string) => {
    leaveCurrent(false);
    socket.data.session = { code: room.code, playerId, token };
    room.attachSocket(playerId, socket.id);
  };

  const leaveCurrent = (removeFromRoom: boolean) => {
    const c = current();
    if (!c) return;
    if (removeFromRoom) c.room.removePlayer(c.playerId);
    else c.room.detachSocket(c.playerId, socket.id);
    if (c.room.isEmpty()) deleteRoom(c.room, 'La stanza è vuota.');
    socket.data.session = undefined;
  };

  socket.on('room:create', (p, ack) => {
    if (typeof ack !== 'function') return;
    const name = normalizeName(String(p?.name ?? ''));
    if (!name) return ack({ ok: false, error: 'Scrivi il tuo nome.' });
    const room = createRoom();
    const player = room.addPlayer(name);
    if (typeof player === 'string') return ack({ ok: false, error: player });
    enter(room, player.id, player.token);
    ack({ ok: true, code: room.code, playerId: player.id, token: player.token });
  });

  socket.on('room:join', (p, ack) => {
    if (typeof ack !== 'function') return;
    const name = normalizeName(String(p?.name ?? ''));
    const code = normalizeCode(String(p?.code ?? ''));
    if (!name) return ack({ ok: false, error: 'Scrivi il tuo nome.' });
    const room = rooms.get(code);
    if (!room) return ack({ ok: false, error: `Nessuna stanza con codice "${code}". Controlla e riprova.` });
    const player = room.addPlayer(name);
    if (typeof player === 'string') return ack({ ok: false, error: player });
    enter(room, player.id, player.token);
    ack({ ok: true, code: room.code, playerId: player.id, token: player.token });
  });

  // Rientro dopo refresh o disconnessione: si riprende esattamente da dove si era
  socket.on('room:rejoin', (p, ack) => {
    if (typeof ack !== 'function') return;
    const room = rooms.get(normalizeCode(String(p?.code ?? '')));
    if (!room || !room.checkToken(String(p?.playerId), String(p?.token))) {
      return ack({ ok: false, error: 'Questa partita non esiste più.' });
    }
    enter(room, p.playerId, p.token);
    ack({ ok: true });
  });

  socket.on('room:leave', () => leaveCurrent(true));

  socket.on('host:settings', (patch) => {
    const c = current();
    if (c && patch && typeof patch === 'object') c.room.updateSettings(c.playerId, patch);
  });

  socket.on('host:start', (ack) => {
    const c = current();
    const error = c ? c.room.start(c.playerId) : 'Non sei in una stanza.';
    if (typeof ack === 'function') ack(error ? { ok: false, error } : { ok: true });
  });

  socket.on('host:skip', () => {
    const c = current();
    c?.room.skip(c.playerId);
  });

  socket.on('host:next', () => {
    const c = current();
    c?.room.next(c.playerId);
  });

  socket.on('host:restart', () => {
    const c = current();
    c?.room.restart(c.playerId);
  });

  socket.on('answer:submit', (p) => {
    const c = current();
    if (c && p) c.room.submitAnswer(c.playerId, Number(p.index), Number(p.value));
  });

  socket.on('guess:submit', (p) => {
    const c = current();
    if (c && p) c.room.submitGuess(c.playerId, Number(p.value));
  });

  socket.on('disconnect', () => leaveCurrent(false));
});

// ─── HTTP ─────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
// Statistiche anonime (predisposizione): nessun dato personale
app.get('/api/stats', (_req, res) => res.json(getStats()));

// In produzione il server serve anche il client compilato (npm run build)
if (existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(`${DIST}/index.html`));
} else {
  app.get('/', (_req, res) =>
    res.send('Server attivo. In sviluppo apri il client su http://localhost:5173 (oppure esegui npm run build).'),
  );
}

httpServer.listen(PORT, () => {
  console.log(`[server] Quanto Mi Conosci? in ascolto su http://localhost:${PORT}`);
});
