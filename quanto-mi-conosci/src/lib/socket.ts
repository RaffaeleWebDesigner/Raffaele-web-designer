import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types';

/**
 * Unica connessione realtime dell'app. Stessa origine della pagina:
 * in sviluppo ci pensa il proxy di Vite, in produzione il server Node.
 * Socket.IO si riconnette da solo; a ogni (ri)connessione useGame
 * fa room:rejoin con l'identità salvata.
 */
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: GameSocket = io({ transports: ['websocket', 'polling'] });
