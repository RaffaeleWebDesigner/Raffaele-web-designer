import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type { RoomView } from '../../shared/types';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { playersOf } from '../lib/helpers';
import { shareCard, type CardFormat } from '../lib/shareCard';
import type { Game } from '../lib/useGame';

/** Fine partita: podio, titoli buffi, card da condividere, rigioca. */
export function Results({ game, view }: { game: Game; view: RoomView }) {
  const { byId, isHost, host } = playersOf(view);
  const results = view.results!;
  const [sharing, setSharing] = useState<CardFormat | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const colors = ['#ff3d7f', '#ffd166', '#4cc9f0', '#3ddc97', '#b388ff'];
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.35 }, colors });
    const t = setTimeout(() => {
      confetti({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1 }, colors });
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const share = async (format: CardFormat) => {
    setSharing(format);
    try {
      await shareCard(view, format);
    } finally {
      setSharing(null);
    }
  };

  const standings = results.standings.filter((s) => byId.has(s.playerId));
  const podium = standings.slice(0, 3);
  // Ordine visivo del podio: 2° – 1° – 3°
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <main className="screen results">
      <h1 className="title">🏆 Classifica</h1>

      <div className="podium">
        {podiumOrder.map((s) => {
          const p = byId.get(s.playerId)!;
          const place = standings.indexOf(s) + 1;
          return (
            <div key={s.playerId} className={`podium-col place-${place}`}>
              <Avatar player={p} size={place === 1 ? 'xl' : 'lg'} />
              <span className="podium-name">{p.name}</span>
              <span className="podium-score">{s.score} pt</span>
              <div className="podium-step">{place}</div>
            </div>
          );
        })}
      </div>

      {standings.length > 3 && (
        <ol className="standings" start={4}>
          {standings.slice(3).map((s, i) => {
            const p = byId.get(s.playerId)!;
            return (
              <li key={s.playerId} className="player-row">
                <span className="rank">{i + 4}</span>
                <Avatar player={p} size="sm" />
                <span className="player-name">{p.name}</span>
                <span className="result-points">{s.score} pt</span>
              </li>
            );
          })}
        </ol>
      )}

      {results.awards.length > 0 && (
        <section className="awards">
          {results.awards.map((a, i) => {
            const p = byId.get(a.playerId);
            if (!p) return null;
            return (
              <div key={a.title} className="award pop-in" style={{ animationDelay: `${400 + i * 150}ms` }}>
                <span className="award-emoji">{a.emoji}</span>
                <div>
                  <div className="award-title">{a.title}</div>
                  <div className="award-who">
                    <b style={{ color: p.color }}>{p.name}</b> · {a.description}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="card">
        <h2>Condividi il risultato</h2>
        <div className="share-row">
          <button className="btn btn-secondary" disabled={!!sharing} onClick={() => share('story')}>
            {sharing === 'story' ? '…' : '📱 Storia 9:16'}
          </button>
          <button className="btn btn-secondary" disabled={!!sharing} onClick={() => share('square')}>
            {sharing === 'square' ? '…' : '⬛ Quadrata'}
          </button>
        </div>
      </section>

      <AdSlot placement="results" />

      <div className="sticky-bottom">
        {isHost ? (
          <button className="btn btn-primary btn-xl btn-block" onClick={game.restart}>
            🔁 Rigioca
          </button>
        ) : (
          <p className="waiting">Se {host?.name ?? "l'host"} vuole, si rigioca<span className="dots" /></p>
        )}
        <button className="btn btn-ghost btn-sm" onClick={game.leave}>Esci dalla stanza</button>
      </div>
    </main>
  );
}
