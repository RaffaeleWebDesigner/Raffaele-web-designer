import type { PublicPlayer } from '../../shared/types';
import { Avatar } from './Avatar';

/** Chi ha finito di rispondere: una barra per giocatore. */
export function GroupProgress({ players, total }: { players: PublicPlayer[]; total: number }) {
  return (
    <ul className="progress-list">
      {players.map((p) => {
        const done = p.answeredCount >= total;
        return (
          <li key={p.id} className={done ? 'is-done' : ''}>
            <Avatar player={p} size="sm" />
            <span className="progress-name">{p.name}</span>
            <span className="progress-bar">
              <span style={{ width: `${(p.answeredCount / total) * 100}%`, background: p.color }} />
            </span>
            <span className="progress-mark">{done ? '✅' : `${p.answeredCount}/${total}`}</span>
          </li>
        );
      })}
    </ul>
  );
}
