import type { Session } from '../../shared/types';

/**
 * Identità del giocatore salvata nel browser: permette di rientrare
 * nella partita dopo un refresh o se il telefono va in standby.
 * Tutto in try/catch: in navigazione privata localStorage può fallire.
 */
const SESSION_KEY = 'qmc:session';
const NAME_KEY = 'qmc:name';

export function loadSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return s && s.code && s.playerId && s.token ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignora */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignora */
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignora */
  }
}
