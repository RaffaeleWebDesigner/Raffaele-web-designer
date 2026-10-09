import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CategoryInfo, Question, QuestionBank } from '../shared/types';
import { isCategoryUnlocked } from './packs';

const BANK_PATH = fileURLToPath(new URL('../data/questions.json', import.meta.url));

/**
 * Carica e valida data/questions.json.
 * Se il file contiene un errore il server si ferma con un messaggio chiaro,
 * così ci si accorge subito di una domanda scritta male.
 */
function loadBank(): QuestionBank {
  const bank = JSON.parse(readFileSync(BANK_PATH, 'utf8')) as QuestionBank;
  const categoryIds = new Set(bank.categories.map((c) => c.id));
  const seen = new Set<string>();
  for (const q of bank.questions) {
    const where = `domanda "${q.id ?? '?'}" in data/questions.json`;
    if (!q.id || seen.has(q.id)) throw new Error(`id mancante o duplicato: ${where}`);
    seen.add(q.id);
    if (!categoryIds.has(q.category)) throw new Error(`categoria sconosciuta "${q.category}": ${where}`);
    if (!q.text) throw new Error(`testo mancante: ${where}`);
    if (q.type === 'choice' && (!Array.isArray(q.options) || q.options.length !== 4)) {
      throw new Error(`servono esattamente 4 opzioni: ${where}`);
    }
    if (q.type === 'slider' && !(q.max > q.min)) throw new Error(`min/max non validi: ${where}`);
    if (q.type !== 'choice' && q.type !== 'slider') throw new Error(`tipo non valido: ${where}`);
  }
  return bank;
}

const bank = loadBank();

/** Categoria virtuale che pesca da tutte quelle sbloccate */
export const MIX_CATEGORY: CategoryInfo = {
  id: 'mix',
  name: 'Mix',
  emoji: '🎲',
  description: 'Un po\' di tutto',
};

export function getCategories(): CategoryInfo[] {
  return [MIX_CATEGORY, ...bank.categories];
}

export function isValidCategory(id: string): boolean {
  return id === MIX_CATEGORY.id || bank.categories.some((c) => c.id === id && isCategoryUnlocked(c));
}

/** Pesca `count` domande a caso, evitando quelle già usate nella stanza se possibile. */
export function pickQuestions(category: string, count: number, alreadyUsed: Set<string>): Question[] {
  const unlocked = new Set(bank.categories.filter(isCategoryUnlocked).map((c) => c.id));
  const pool = bank.questions.filter((q) =>
    category === MIX_CATEGORY.id ? unlocked.has(q.category) : q.category === category,
  );
  const fresh = shuffle(pool.filter((q) => !alreadyUsed.has(q.id)));
  // Se le domande nuove non bastano (molte partite di fila) si ripescano le vecchie
  const recycled = shuffle(pool.filter((q) => alreadyUsed.has(q.id)));
  return [...fresh, ...recycled].slice(0, count);
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

console.log(`[domande] caricate ${bank.questions.length} domande in ${bank.categories.length} categorie`);
