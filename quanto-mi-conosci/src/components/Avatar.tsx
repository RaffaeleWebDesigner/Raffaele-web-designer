import type { PublicPlayer } from '../../shared/types';

interface Props {
  player: PublicPlayer;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Mostra anche il nome sotto */
  label?: boolean;
  dim?: boolean;
}

/** Cerchio colorato con l'emoji del giocatore */
export function Avatar({ player, size = 'md', label = false, dim = false }: Props) {
  return (
    <div className={`avatar avatar-${size} ${!player.connected || dim ? 'is-dim' : ''}`} title={player.name}>
      <span className="avatar-face" style={{ background: player.color }}>
        {player.emoji}
      </span>
      {label && <span className="avatar-name">{player.name}</span>}
    </div>
  );
}
