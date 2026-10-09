import type { CategoryInfo } from '../shared/types';

/**
 * PREDISPOSIZIONE — pacchetti di domande a pagamento (non attivo).
 *
 * Per vendere un pacchetto in futuro:
 *  1. aggiungi in data/questions.json una categoria con `"premium": true`
 *     e le sue domande;
 *  2. implementa qui la verifica dell'acquisto (es. codice sblocco salvato
 *     nella stanza, o account dell'host verificato con Stripe/Lemon Squeezy).
 *
 * Oggi le categorie premium restano semplicemente nascoste/bloccate.
 */
export function isCategoryUnlocked(category: CategoryInfo): boolean {
  return !category.premium;
}
