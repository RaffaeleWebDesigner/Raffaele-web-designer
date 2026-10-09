import { useEffect, useState } from 'react';

interface Props {
  deadline: number | null;
  /** Ora corrente secondo il server */
  now: () => number;
  total: number; // secondi totali, per la barra
}

/** Barra del tempo che si svuota; diventa rossa negli ultimi 5 secondi. */
export function Countdown({ deadline, now, total }: Props) {
  const [left, setLeft] = useState(() => (deadline ? deadline - now() : 0));

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setLeft(deadline - now()), 200);
    return () => clearInterval(id);
  }, [deadline, now]);

  if (!deadline) return null;
  const seconds = Math.max(0, Math.ceil(left / 1000));
  const pct = Math.max(0, Math.min(100, (left / (total * 1000)) * 100));
  return (
    <div className={`countdown ${seconds <= 5 ? 'is-urgent' : ''}`} aria-label={`${seconds} secondi`}>
      <div className="countdown-bar" style={{ width: `${pct}%` }} />
      <span className="countdown-text">⏱ {seconds}s</span>
    </div>
  );
}
