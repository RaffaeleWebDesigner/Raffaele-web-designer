/**
 * PREDISPOSIZIONE — statistiche anonime di utilizzo.
 *
 * Oggi gli eventi vengono solo contati in memoria e stampati nel log.
 * Nessun dato personale: niente nomi, niente IP, solo numeri.
 * Per inviarli a un servizio (Plausible, PostHog, un database…) basta
 * implementare `send()` senza toccare il resto del codice.
 */

export type AnalyticsEvent =
  | { type: 'room_created' }
  | { type: 'game_started'; players: number; category: string; questions: number }
  | { type: 'game_completed'; players: number }
  | { type: 'game_abandoned'; phase: string };

const counters = {
  roomsCreated: 0,
  gamesStarted: 0,
  gamesCompleted: 0,
  playersInStartedGames: 0,
};

export function track(event: AnalyticsEvent): void {
  switch (event.type) {
    case 'room_created':
      counters.roomsCreated++;
      break;
    case 'game_started':
      counters.gamesStarted++;
      counters.playersInStartedGames += event.players;
      break;
    case 'game_completed':
      counters.gamesCompleted++;
      break;
  }
  send(event);
}

/** Riepilogo anonimo, esposto su /api/stats */
export function getStats() {
  const { roomsCreated, gamesStarted, gamesCompleted, playersInStartedGames } = counters;
  return {
    roomsCreated,
    gamesStarted,
    gamesCompleted,
    averagePlayers: gamesStarted ? +(playersInStartedGames / gamesStarted).toFixed(1) : 0,
    completionRate: gamesStarted ? +(gamesCompleted / gamesStarted).toFixed(2) : 0,
  };
}

function send(event: AnalyticsEvent): void {
  if (process.env.ANALYTICS_LOG === '1') console.log('[analytics]', JSON.stringify(event));
}
