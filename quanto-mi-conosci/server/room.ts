import { randomUUID } from 'node:crypto';
import type {
  Award,
  GuessResult,
  Phase,
  Question,
  ResultsView,
  RoomView,
  Settings,
  Standing,
} from '../shared/types';
import {
  ANSWER_SECONDS_PER_QUESTION,
  GUESS_SECONDS,
  LOBBY_OFFLINE_GRACE_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  QUESTION_COUNTS,
  SLIDER_TOLERANCE,
} from '../shared/rules';
import { getCategories, isValidCategory, pickQuestions, shuffle } from './questions';
import { track } from './analytics';

const COLORS = ['#FF5C8A', '#FFB020', '#3DDC97', '#4CC9F0', '#B388FF', '#FF7A45', '#F9F871', '#00D1B2', '#FF8FE1', '#9BE15D'];
const EMOJIS = ['🦊', '🐸', '🐼', '🦄', '🐙', '🦁', '🐵', '🐧', '🐯', '🐨'];

/** Dopo quanto tempo l'host disconnesso passa il ruolo a un altro */
const HOST_HANDOVER_MS = 15_000;

interface PlayerStats {
  /** Risposte azzeccate su altri */
  correctGuesses: number;
  totalGuesses: number;
  /** Volte in cui è stato il primo a indovinare */
  firsts: number;
  /** Tentativi degli altri su di lui, e quanti giusti */
  guessesAbout: number;
  correctAbout: number;
}

interface Player {
  id: string;
  /** Segreto per rientrare dopo un refresh (salvato in localStorage) */
  token: string;
  name: string;
  color: string;
  emoji: string;
  socketId: string | null;
  disconnectedAt: number | null;
  score: number;
  answers: (number | null)[];
  stats: PlayerStats;
}

interface GuessRound {
  /** Ordine dei protagonisti */
  targets: string[];
  targetIdx: number;
  /** Indici delle domande a cui il protagonista attuale ha risposto */
  steps: number[];
  stepIdx: number;
  guesses: Map<string, { value: number; at: number }>;
  revealed: boolean;
  results: GuessResult[];
  deadline: number | null;
}

type Emit = (socketId: string, view: RoomView) => void;

const emptyStats = (): PlayerStats => ({
  correctGuesses: 0,
  totalGuesses: 0,
  firsts: 0,
  guessesAbout: 0,
  correctAbout: 0,
});

export class Room {
  readonly code: string;
  hostId = '';
  players = new Map<string, Player>();
  settings: Settings = { category: 'mix', questionCount: 5, timer: false, speedBonus: true };
  phase: Phase = 'lobby';
  questions: Question[] = [];
  lastActivity = Date.now();

  private usedQuestionIds = new Set<string>();
  private answeringDeadline: number | null = null;
  private round: GuessRound | null = null;
  private results: ResultsView | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(code: string, private emit: Emit) {
    this.code = code;
  }

  // ─── Giocatori ─────────────────────────────────────────────────────────────

  /** Aggiunge un giocatore. Restituisce il giocatore o un messaggio d'errore. */
  addPlayer(name: string): Player | string {
    if (this.phase === 'answering' || this.phase === 'guessing') {
      return 'La partita è già iniziata: aspetta la prossima!';
    }
    if (this.players.size >= MAX_PLAYERS) return `La stanza è piena (max ${MAX_PLAYERS} giocatori).`;
    const taken = [...this.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (taken) return `C'è già un "${name}" nella stanza: scegli un altro nome.`;

    const usedColors = new Set([...this.players.values()].map((p) => p.color));
    const usedEmojis = new Set([...this.players.values()].map((p) => p.emoji));
    const player: Player = {
      id: randomUUID(),
      token: randomUUID(),
      name,
      color: COLORS.find((c) => !usedColors.has(c)) ?? COLORS[0],
      emoji: EMOJIS.find((e) => !usedEmojis.has(e)) ?? EMOJIS[0],
      socketId: null,
      disconnectedAt: null,
      score: 0,
      answers: [],
      stats: emptyStats(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.touch();
    return player;
  }

  checkToken(playerId: string, token: string): boolean {
    return this.players.get(playerId)?.token === token;
  }

  attachSocket(playerId: string, socketId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    p.socketId = socketId;
    p.disconnectedAt = null;
    this.touch();
    this.broadcast();
  }

  /** Chiamato quando cade la connessione: il giocatore resta, ma risulta offline. */
  detachSocket(playerId: string, socketId: string): void {
    const p = this.players.get(playerId);
    if (!p || p.socketId !== socketId) return; // nel frattempo si è già riconnesso
    p.socketId = null;
    p.disconnectedAt = Date.now();
    // Se si aspettava solo lui, la partita va avanti senza di lui
    this.checkProgress();
    this.broadcast();
  }

  /** Uscita volontaria: il giocatore viene rimosso. */
  removePlayer(playerId: string): void {
    if (!this.players.delete(playerId)) return;
    if (this.round) {
      this.round.guesses.delete(playerId);
      // Se esce il protagonista, si salta al prossimo
      if (this.round.targets[this.round.targetIdx] === playerId) {
        this.round.targets.splice(this.round.targetIdx, 1);
        this.startTarget();
      } else {
        const i = this.round.targets.indexOf(playerId);
        if (i > this.round.targetIdx) this.round.targets.splice(i, 1);
      }
    }
    if (this.hostId === playerId) this.assignNewHost();
    this.touch();
    this.checkProgress();
    this.broadcast();
  }

  isConnected(p: Player): boolean {
    return p.socketId !== null;
  }

  private connectedPlayers(): Player[] {
    return [...this.players.values()].filter((p) => this.isConnected(p));
  }

  private assignNewHost(): void {
    const next = this.connectedPlayers()[0] ?? [...this.players.values()][0];
    this.hostId = next?.id ?? '';
  }

  /**
   * Manutenzione periodica: passa l'host se è offline da troppo,
   * toglie dalla lobby chi è offline da più di 2 minuti.
   */
  sweep(now: number): void {
    let changed = false;
    const host = this.players.get(this.hostId);
    if (host && host.disconnectedAt && now - host.disconnectedAt > HOST_HANDOVER_MS) {
      const candidate = this.connectedPlayers()[0];
      if (candidate) {
        this.hostId = candidate.id;
        changed = true;
      }
    }
    if (this.phase === 'lobby' || this.phase === 'results') {
      for (const p of [...this.players.values()]) {
        if (p.disconnectedAt && now - p.disconnectedAt > LOBBY_OFFLINE_GRACE_MS) {
          this.players.delete(p.id);
          if (this.hostId === p.id) this.assignNewHost();
          changed = true;
        }
      }
    }
    if (changed) this.broadcast();
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  hasConnectedPlayers(): boolean {
    return this.connectedPlayers().length > 0;
  }

  // ─── Lobby ─────────────────────────────────────────────────────────────────

  updateSettings(byId: string, patch: Partial<Settings>): void {
    if (byId !== this.hostId || this.phase !== 'lobby') return;
    const s = this.settings;
    if (typeof patch.category === 'string' && isValidCategory(patch.category)) s.category = patch.category;
    if (QUESTION_COUNTS.includes(patch.questionCount as never)) s.questionCount = patch.questionCount!;
    if (typeof patch.timer === 'boolean') s.timer = patch.timer;
    if (typeof patch.speedBonus === 'boolean') s.speedBonus = patch.speedBonus;
    this.touch();
    this.broadcast();
  }

  start(byId: string): string | null {
    if (byId !== this.hostId) return "Solo l'host può avviare la partita.";
    if (this.phase !== 'lobby') return 'La partita è già iniziata.';
    const online = this.connectedPlayers();
    if (online.length < MIN_PLAYERS) return `Servono almeno ${MIN_PLAYERS} giocatori connessi.`;

    // Chi è offline al via non partecipa
    for (const p of [...this.players.values()]) if (!this.isConnected(p)) this.players.delete(p.id);

    this.questions = pickQuestions(this.settings.category, this.settings.questionCount, this.usedQuestionIds);
    if (this.questions.length === 0) return 'Nessuna domanda disponibile per questa categoria.';
    this.questions.forEach((q) => this.usedQuestionIds.add(q.id));
    for (const p of this.players.values()) {
      p.score = 0;
      p.stats = emptyStats();
      p.answers = this.questions.map(() => null);
    }
    this.results = null;
    this.round = null;
    this.phase = 'answering';
    this.answeringDeadline = this.settings.timer
      ? Date.now() + this.questions.length * ANSWER_SECONDS_PER_QUESTION * 1000
      : null;
    if (this.answeringDeadline) this.setTimer(this.answeringDeadline, () => this.startGuessing());

    track({
      type: 'game_started',
      players: this.players.size,
      category: this.settings.category,
      questions: this.questions.length,
    });
    this.touch();
    this.broadcast();
    return null;
  }

  // ─── Fase risposte ─────────────────────────────────────────────────────────

  submitAnswer(playerId: string, index: number, value: number): void {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'answering') return;
    const q = this.questions[index];
    if (!q || !isValidValue(q, value)) return;
    p.answers[index] = value;
    this.touch();
    this.checkProgress();
    this.broadcast();
  }

  private answeredCount(p: Player): number {
    return p.answers.filter((a) => a !== null).length;
  }

  // ─── Fase indovinelli ──────────────────────────────────────────────────────

  private startGuessing(): void {
    if (this.phase !== 'answering') return;
    this.clearTimer();
    this.answeringDeadline = null;
    // Partecipa come protagonista chi ha risposto ad almeno una domanda
    const targets = shuffle([...this.players.values()].filter((p) => this.answeredCount(p) > 0).map((p) => p.id));
    this.phase = 'guessing';
    this.round = {
      targets,
      targetIdx: 0,
      steps: [],
      stepIdx: 0,
      guesses: new Map(),
      revealed: false,
      results: [],
      deadline: null,
    };
    this.startTarget();
  }

  /** Prepara il protagonista attuale (o chiude la partita se sono finiti). */
  private startTarget(): void {
    const r = this.round;
    if (!r) return;
    while (r.targetIdx < r.targets.length) {
      const target = this.players.get(r.targets[r.targetIdx]);
      const steps = target ? target.answers.flatMap((a, i) => (a === null ? [] : [i])) : [];
      if (steps.length > 0) {
        r.steps = steps;
        r.stepIdx = 0;
        this.startStep();
        return;
      }
      r.targets.splice(r.targetIdx, 1); // protagonista sparito o senza risposte
    }
    this.finish();
  }

  private startStep(): void {
    const r = this.round!;
    r.guesses = new Map();
    r.revealed = false;
    r.results = [];
    r.deadline = this.settings.timer ? Date.now() + GUESS_SECONDS * 1000 : null;
    if (r.deadline) this.setTimer(r.deadline, () => this.reveal());
    else this.clearTimer();
    this.checkProgress();
  }

  private currentTargetId(): string | null {
    const r = this.round;
    return r ? r.targets[r.targetIdx] ?? null : null;
  }

  private guessers(): Player[] {
    const targetId = this.currentTargetId();
    return this.connectedPlayers().filter((p) => p.id !== targetId);
  }

  submitGuess(playerId: string, value: number): void {
    const r = this.round;
    if (this.phase !== 'guessing' || !r || r.revealed) return;
    if (playerId === this.currentTargetId() || !this.players.has(playerId)) return;
    if (r.guesses.has(playerId)) return; // niente ripensamenti
    const q = this.questions[r.steps[r.stepIdx]];
    if (!isValidValue(q, value)) return;
    r.guesses.set(playerId, { value, at: Date.now() });
    this.touch();
    this.checkProgress();
    this.broadcast();
  }

  /** Mostra la risposta giusta e assegna i punti. */
  private reveal(): void {
    const r = this.round;
    if (this.phase !== 'guessing' || !r || r.revealed) return;
    this.clearTimer();
    const target = this.players.get(this.currentTargetId()!);
    const qIndex = r.steps[r.stepIdx];
    const q = this.questions[qIndex];
    const correctAnswer = target?.answers[qIndex] ?? null;

    let firstAwarded = false;
    const ordered = [...r.guesses.entries()].sort((a, b) => a[1].at - b[1].at);
    r.results = ordered.map(([playerId, { value }]) => {
      const correct = correctAnswer !== null && isCorrect(q, value, correctAnswer);
      const first = correct && this.settings.speedBonus && !firstAwarded && r.guesses.size > 1;
      if (first) firstAwarded = true;
      const points = (correct ? 1 : 0) + (first ? 1 : 0);
      const guesser = this.players.get(playerId);
      if (guesser) {
        guesser.score += points;
        guesser.stats.totalGuesses++;
        if (correct) guesser.stats.correctGuesses++;
        if (first) guesser.stats.firsts++;
      }
      if (target) {
        target.stats.guessesAbout++;
        if (correct) target.stats.correctAbout++;
      }
      return { playerId, guess: value, correct, first, points };
    });
    r.revealed = true;
    r.deadline = null;
    this.touch();
    this.broadcast();
  }

  /** Dopo la rivelazione: prossima domanda / prossimo giocatore / classifica. */
  next(byId: string): void {
    const r = this.round;
    if (this.phase !== 'guessing' || !r || !r.revealed) return;
    if (byId !== this.hostId && byId !== this.currentTargetId()) return;
    r.stepIdx++;
    if (r.stepIdx >= r.steps.length) {
      r.targetIdx++;
      this.startTarget();
    } else {
      this.startStep();
    }
    this.touch();
    this.broadcast();
  }

  /** L'host non vuole aspettare i ritardatari. */
  skip(byId: string): void {
    if (byId !== this.hostId) return;
    if (this.phase === 'answering') this.startGuessing();
    else if (this.phase === 'guessing') this.reveal();
    this.broadcast();
  }

  /** Controlla se tutti hanno finito e, nel caso, fa avanzare il gioco. */
  private checkProgress(): void {
    if (this.phase === 'answering') {
      const online = this.connectedPlayers();
      const allDone = online.length > 0 && online.every((p) => this.answeredCount(p) === this.questions.length);
      if (allDone) this.startGuessing();
    } else if (this.phase === 'guessing' && this.round && !this.round.revealed) {
      const guessers = this.guessers();
      if (guessers.length > 0 && guessers.every((p) => this.round!.guesses.has(p.id))) this.reveal();
    }
  }

  // ─── Fine partita ──────────────────────────────────────────────────────────

  private finish(): void {
    this.clearTimer();
    this.phase = 'results';
    this.round = null;
    this.results = computeResults([...this.players.values()], this.settings.speedBonus);
    track({ type: 'game_completed', players: this.players.size });
  }

  /** "Rigioca": si torna in lobby con gli stessi giocatori. */
  restart(byId: string): void {
    if (byId !== this.hostId || this.phase !== 'results') return;
    this.phase = 'lobby';
    this.questions = [];
    this.results = null;
    for (const p of this.players.values()) {
      p.score = 0;
      p.answers = [];
      p.stats = emptyStats();
    }
    this.touch();
    this.broadcast();
  }

  // ─── Viste e invio ─────────────────────────────────────────────────────────

  broadcast(): void {
    for (const p of this.players.values()) {
      if (p.socketId) this.emit(p.socketId, this.viewFor(p.id));
    }
  }

  /** Costruisce lo stato visibile a un giocatore: mai le risposte segrete altrui. */
  viewFor(playerId: string): RoomView {
    const me = this.players.get(playerId);
    const r = this.round;
    let guessing: RoomView['guessing'] = null;
    if (this.phase === 'guessing' && r) {
      const targetId = this.currentTargetId()!;
      const qIndex = r.steps[r.stepIdx];
      guessing = {
        targetId,
        targetIndex: r.targetIdx,
        targetsTotal: r.targets.length,
        questionIndex: qIndex,
        step: r.stepIdx,
        stepsTotal: r.steps.length,
        guessedIds: [...r.guesses.keys()],
        guesserIds: this.guessers().map((p) => p.id),
        myGuess: r.guesses.get(playerId)?.value ?? null,
        revealed: r.revealed,
        correctAnswer: r.revealed ? this.players.get(targetId)?.answers[qIndex] ?? null : null,
        results: r.revealed ? r.results : [],
        deadline: r.deadline,
      };
    }
    return {
      code: this.code,
      serverTime: Date.now(),
      phase: this.phase,
      meId: playerId,
      hostId: this.hostId,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        emoji: p.emoji,
        connected: this.isConnected(p),
        score: p.score,
        answeredCount: this.answeredCount(p),
      })),
      settings: this.settings,
      categories: getCategories(),
      questions: this.phase === 'lobby' ? [] : this.questions,
      myAnswers: me?.answers ?? [],
      answeringDeadline: this.answeringDeadline,
      guessing,
      results: this.results,
    };
  }

  // ─── Utilità ───────────────────────────────────────────────────────────────

  private touch(): void {
    this.lastActivity = Date.now();
  }

  private setTimer(at: number, fn: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
      this.broadcast();
    }, Math.max(0, at - Date.now()));
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Da chiamare quando la stanza viene eliminata */
  dispose(): void {
    this.clearTimer();
  }
}

// ─── Funzioni pure ────────────────────────────────────────────────────────────

function isValidValue(q: Question, value: number): boolean {
  if (!Number.isInteger(value)) return false;
  return q.type === 'choice' ? value >= 0 && value < q.options.length : value >= q.min && value <= q.max;
}

export function isCorrect(q: Question, guess: number, answer: number): boolean {
  return q.type === 'choice' ? guess === answer : Math.abs(guess - answer) <= SLIDER_TOLERANCE;
}

/** Classifica + titoli buffi di fine partita. */
export function computeResults(players: Player[], speedBonus: boolean): ResultsView {
  const known = (p: Player) =>
    p.stats.guessesAbout ? Math.round((p.stats.correctAbout / p.stats.guessesAbout) * 100) : 0;

  const standings: Standing[] = players
    .map((p) => ({
      playerId: p.id,
      score: p.score,
      correctGuesses: p.stats.correctGuesses,
      totalGuesses: p.stats.totalGuesses,
      knownPercent: known(p),
    }))
    .sort((a, b) => b.score - a.score || b.correctGuesses - a.correctGuesses);

  const awards: Award[] = [];
  const best = <T>(list: T[], value: (x: T) => number) =>
    list.reduce<T | undefined>((acc, x) => (acc === undefined || value(x) > value(acc) ? x : acc), undefined);

  const sherlock = best(players.filter((p) => p.stats.correctGuesses > 0), (p) => p.stats.correctGuesses);
  if (sherlock) {
    awards.push({
      emoji: '🕵️',
      title: 'Lo Sherlock del gruppo',
      description: `Ha indovinato ${sherlock.stats.correctGuesses} risposte degli altri`,
      playerId: sherlock.id,
    });
  }

  const studied = players.filter((p) => p.stats.guessesAbout > 0);
  const openBook = best(studied, known);
  if (openBook && known(openBook) > 0) {
    awards.push({
      emoji: '📖',
      title: 'Libro aperto',
      description: `Risposte indovinate dagli altri: ${known(openBook)}%`,
      playerId: openBook.id,
    });
  }
  const mystery = best(studied, (p) => -known(p));
  if (mystery && mystery !== openBook) {
    awards.push({
      emoji: '🎲',
      title: 'Il più imprevedibile',
      description: `Risposte indovinate dagli altri: solo ${known(mystery)}%`,
      playerId: mystery.id,
    });
  }

  if (speedBonus) {
    const flash = best(players.filter((p) => p.stats.firsts > 0), (p) => p.stats.firsts);
    if (flash) {
      awards.push({
        emoji: '⚡',
        title: 'Più veloce della spunta blu',
        description: `Primo a indovinare per ${flash.stats.firsts} volte`,
        playerId: flash.id,
      });
    }
  }

  const clueless = best(players.filter((p) => p.stats.totalGuesses > 0), (p) => -p.stats.correctGuesses);
  if (clueless && clueless !== sherlock) {
    awards.push({
      emoji: '🙈',
      title: 'Ma vi conoscete?',
      description: `Solo ${clueless.stats.correctGuesses} risposte azzeccate`,
      playerId: clueless.id,
    });
  }

  return { standings, awards };
}
