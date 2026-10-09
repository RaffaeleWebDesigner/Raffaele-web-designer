/** Regole del gioco condivise tra client e server. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const NAME_MAX_LENGTH = 16;
export const CODE_LENGTH = 4;
export const QUESTION_COUNTS = [5, 8, 10] as const;

/** Secondi a disposizione per domanda, se il timer è attivo */
export const ANSWER_SECONDS_PER_QUESTION = 25;
export const GUESS_SECONDS = 20;

/** Nelle domande con slider basta avvicinarsi di ±1 per indovinare */
export const SLIDER_TOLERANCE = 1;

/** La stanza viene eliminata dopo 2 ore senza attività */
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

/** In lobby un giocatore disconnesso viene tolto dopo 2 minuti */
export const LOBBY_OFFLINE_GRACE_MS = 2 * 60 * 1000;

export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LENGTH);
}
