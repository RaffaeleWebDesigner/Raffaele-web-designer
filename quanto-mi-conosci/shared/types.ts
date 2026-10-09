/**
 * Tipi condivisi tra client e server.
 * Il server è l'unica fonte di verità: ogni client riceve una "vista" personale
 * della stanza (RoomView) che non contiene mai le risposte segrete degli altri.
 */

// ─── Domande ────────────────────────────────────────────────────────────────

export interface CategoryInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Predisposizione per pacchetti a pagamento (non ancora attivi). */
  premium?: boolean;
}

interface QuestionBase {
  id: string;
  category: string;
  /** Domanda in seconda persona ("Quanto sei…?"). */
  text: string;
}

export interface ChoiceQuestion extends QuestionBase {
  type: 'choice';
  options: string[]; // sempre 4
}

export interface SliderQuestion extends QuestionBase {
  type: 'slider';
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export type Question = ChoiceQuestion | SliderQuestion;

export interface QuestionBank {
  categories: CategoryInfo[];
  questions: Question[];
}

// ─── Stanza ─────────────────────────────────────────────────────────────────

export type Phase = 'lobby' | 'answering' | 'guessing' | 'results';

export interface Settings {
  /** id categoria oppure "mix" */
  category: string;
  questionCount: 5 | 8 | 10;
  /** Timer per rispondere/indovinare */
  timer: boolean;
  /** +1 al primo che indovina */
  speedBonus: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  emoji: string;
  connected: boolean;
  score: number;
  /** Quante domande su sé stesso ha già risposto (fase risposte) */
  answeredCount: number;
}

export interface GuessResult {
  playerId: string;
  guess: number;
  correct: boolean;
  /** Primo a indovinare (bonus velocità) */
  first: boolean;
  points: number;
}

export interface GuessingView {
  targetId: string;
  /** Posizione del giocatore attuale nella sequenza (0-based) */
  targetIndex: number;
  targetsTotal: number;
  /** Indice della domanda nella lista `questions` */
  questionIndex: number;
  /** Posizione della domanda tra quelle di questo giocatore */
  step: number;
  stepsTotal: number;
  /** Chi ha già dato la propria risposta */
  guessedIds: string[];
  /** Chi deve rispondere (giocatori connessi tranne il protagonista) */
  guesserIds: string[];
  myGuess: number | null;
  revealed: boolean;
  /** Presente solo dopo la rivelazione */
  correctAnswer: number | null;
  results: GuessResult[];
  deadline: number | null;
}

export interface Award {
  emoji: string;
  title: string;
  description: string;
  playerId: string;
}

export interface Standing {
  playerId: string;
  score: number;
  correctGuesses: number;
  totalGuesses: number;
  /** Percentuale di risposte su di lui indovinate dagli altri */
  knownPercent: number;
}

export interface ResultsView {
  standings: Standing[];
  awards: Award[];
}

export interface RoomView {
  code: string;
  /** Ora del server, per allineare i countdown all'orologio del telefono */
  serverTime: number;
  phase: Phase;
  meId: string;
  hostId: string;
  players: PublicPlayer[];
  settings: Settings;
  categories: CategoryInfo[];
  /** Domande della partita (vuoto in lobby) */
  questions: Question[];
  /** Le mie risposte (null = non ancora data) */
  myAnswers: (number | null)[];
  answeringDeadline: number | null;
  guessing: GuessingView | null;
  results: ResultsView | null;
}

// ─── Eventi realtime ────────────────────────────────────────────────────────

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

export interface ClientToServerEvents {
  'room:create': (p: { name: string }, ack: Ack<Session>) => void;
  'room:join': (p: { code: string; name: string }, ack: Ack<Session>) => void;
  'room:rejoin': (p: Session, ack: Ack) => void;
  'room:leave': () => void;
  'host:settings': (p: Partial<Settings>) => void;
  'host:start': (ack: Ack) => void;
  /** Salta l'attesa: chiude la fase risposte o rivela subito la risposta */
  'host:skip': () => void;
  'host:next': () => void;
  'host:restart': () => void;
  'answer:submit': (p: { index: number; value: number }) => void;
  'guess:submit': (p: { value: number }) => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  /** Il giocatore non fa più parte della stanza (stanza scaduta o uscito) */
  'room:gone': (reason: string) => void;
}
