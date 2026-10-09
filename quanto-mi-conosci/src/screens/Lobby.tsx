import { useState } from 'react';
import type { RoomView } from '../../shared/types';
import { MAX_PLAYERS, MIN_PLAYERS, QUESTION_COUNTS } from '../../shared/rules';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { playersOf } from '../lib/helpers';
import { inviteLink, type Game } from '../lib/useGame';

/** Lobby: codice, invito, giocatori in tempo reale e impostazioni dell'host. */
export function Lobby({ game, view }: { game: Game; view: RoomView }) {
  const { isHost, host } = playersOf(view);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = inviteLink(view.code);
  const online = view.players.filter((p) => p.connected).length;
  const missing = Math.max(0, MIN_PLAYERS - online);
  const s = view.settings;
  const shareText = `Giochiamo a "Quanto Mi Conosci?" 👀 Entra qui: ${link} (codice ${view.code})`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia il link:', link);
    }
  };

  const start = async () => {
    setError(null);
    const res = await game.start();
    if (!res.ok) setError(res.error);
  };

  return (
    <main className="screen lobby">
      <header className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={game.leave}>← Esci</button>
        <span className="topbar-title">Lobby</span>
        <span />
      </header>

      <section className="room-code card">
        <span className="label">Codice stanza</span>
        <div className="code">{view.code.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
        <div className="share-row">
          <a
            className="btn btn-whatsapp"
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
          >
            Invita su WhatsApp
          </a>
          <button className="btn btn-secondary" onClick={copy}>{copied ? '✓ Copiato' : '🔗 Copia link'}</button>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Giocatori</h2>
          <span className="pill">{view.players.length}/{MAX_PLAYERS}</span>
        </div>
        <ul className="player-list">
          {view.players.map((p) => (
            <li key={p.id} className="player-row pop-in">
              <Avatar player={p} />
              <span className="player-name">
                {p.name}
                {p.id === view.meId && <em> (tu)</em>}
              </span>
              {p.id === view.hostId && <span className="badge" title="Host">👑</span>}
              {!p.connected && <span className="badge badge-off">offline</span>}
            </li>
          ))}
        </ul>
        {missing > 0 && (
          <p className="hint">Servono ancora {missing} {missing === 1 ? 'giocatore' : 'giocatori'} per iniziare</p>
        )}
      </section>

      <section className="card">
        <h2>Impostazioni</h2>
        <span className="label">Categoria</span>
        <div className="category-grid">
          {view.categories.map((c) => (
            <button
              key={c.id}
              className={`category ${s.category === c.id ? 'is-selected' : ''}`}
              disabled={!isHost || c.premium}
              onClick={() => game.updateSettings({ category: c.id })}
            >
              <span className="category-emoji">{c.premium ? '🔒' : c.emoji}</span>
              <span className="category-name">{c.name}</span>
              <span className="category-desc">{c.description}</span>
            </button>
          ))}
        </div>

        <span className="label">Domande a testa</span>
        <div className="segmented">
          {QUESTION_COUNTS.map((n) => (
            <button
              key={n}
              className={s.questionCount === n ? 'is-selected' : ''}
              disabled={!isHost}
              onClick={() => game.updateSettings({ questionCount: n })}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="toggle">
          <input type="checkbox" checked={s.timer} disabled={!isHost} onChange={(e) => game.updateSettings({ timer: e.target.checked })} />
          <span className="toggle-ui" />
          <span>⏱ Timer (più pressione!)</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={s.speedBonus} disabled={!isHost} onChange={(e) => game.updateSettings({ speedBonus: e.target.checked })} />
          <span className="toggle-ui" />
          <span>⚡ +1 bonus a chi indovina per primo</span>
        </label>
      </section>

      <AdSlot placement="lobby" />

      <div className="sticky-bottom">
        {error && <p className="error">{error}</p>}
        {isHost ? (
          <button className="btn btn-primary btn-xl btn-block" disabled={missing > 0} onClick={start}>
            {missing > 0 ? `Aspettando amici… (${online}/${MIN_PLAYERS})` : 'Inizia la partita! 🚀'}
          </button>
        ) : (
          <p className="waiting">In attesa che <b>{host?.name ?? "l'host"}</b> avvii la partita<span className="dots" /></p>
        )}
      </div>
    </main>
  );
}
