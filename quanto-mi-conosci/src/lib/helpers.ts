import type { PublicPlayer, Question, RoomView } from '../../shared/types';

/** Accesso comodo ai giocatori della vista */
export function playersOf(view: RoomView) {
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const me = byId.get(view.meId)!;
  return { byId, me, isHost: view.hostId === view.meId, host: byId.get(view.hostId) };
}

/** Testo leggibile di una risposta (opzione o valore dello slider) */
export function answerLabel(q: Question, value: number): string {
  if (q.type === 'choice') return q.options[value] ?? '?';
  return `${value} / ${q.max}`;
}

export function firstName(p: PublicPlayer | undefined): string {
  return p?.name ?? 'qualcuno';
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
