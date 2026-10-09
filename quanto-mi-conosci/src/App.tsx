import { useEffect } from 'react';
import { useGame } from './lib/useGame';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Answering } from './screens/Answering';
import { Guessing } from './screens/Guessing';
import { Results } from './screens/Results';

/** Sceglie la schermata in base alla fase della stanza. */
export function App() {
  const game = useGame();
  const { view } = game;

  // A ogni cambio di schermata o di domanda si riparte dall'alto
  const screenKey = `${view?.phase}-${view?.guessing?.targetId}-${view?.guessing?.step}`;
  useEffect(() => window.scrollTo(0, 0), [screenKey]);

  let screen;
  if (game.restoring) {
    screen = (
      <main className="screen center">
        <div className="big-emoji spin">🎲</div>
        <p className="subtitle">Rientro nella partita…</p>
      </main>
    );
  } else if (!view) {
    screen = <Home game={game} />;
  } else if (view.phase === 'lobby') {
    screen = <Lobby game={game} view={view} />;
  } else if (view.phase === 'answering') {
    screen = <Answering game={game} view={view} />;
  } else if (view.phase === 'guessing' && view.guessing) {
    screen = <Guessing game={game} view={view} />;
  } else {
    screen = <Results game={game} view={view} />;
  }

  return (
    <div className="app">
      {!game.online && <div className="offline-banner">📡 Connessione persa, mi riconnetto…</div>}
      {screen}
    </div>
  );
}
