/**
 * PREDISPOSIZIONI FUTURE (tutte spente).
 *
 * - ads: spazi pubblicitari non invasivi. Con `enabled: true` il componente
 *   <AdSlot> mostra un riquadro nei punti indicati in `placements`
 *   (mai durante le domande). Lì andrà lo snippet del circuito scelto.
 * - premiumPacks: le categorie con "premium": true in data/questions.json
 *   vengono mostrate col lucchetto. La verifica acquisto sta in server/packs.ts.
 * - Le statistiche anonime sono lato server: server/analytics.ts e /api/stats.
 */
export const features = {
  ads: {
    enabled: false,
    placements: ['lobby', 'results'] as const,
  },
  premiumPacks: {
    enabled: false,
  },
};

export type AdPlacement = (typeof features.ads.placements)[number];
