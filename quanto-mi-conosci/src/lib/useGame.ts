import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomView, Session, Settings } from '../../shared/types';
import { socket } from './socket';
import { clearSession, loadSession, saveName, saveSession } from './storage';

export type Result = { ok: true } | { ok: false; error: string };

/** Lo stato del gioco e tutte le azioni, in un unico hook. */
export function useGame() {
  const [view, setView] = useState<RoomView | null>(null);
  const [online, setOnline] = useState(socket.connected);
  /** true finché non sappiamo se c'è una partita da riprendere */
  const [restoring, setRestoring] = useState(() => loadSession() !== null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Differenza tra orologio del server e del telefono */
  const clockOffset = useRef(0);

  useEffect(() => {
    const rejoin = () => {
      setOnline(true);
      const saved = loadSession();
      if (!saved) return setRestoring(false);
      socket.emit('room:rejoin', saved, (res) => {
        if (!res.ok) {
          clearSession();
          setView(null);
          setNotice(res.error);
          setUrlCode(null);
        }
        setRestoring(false);
      });
    };
    const onDisconnect = () => setOnline(false);
    const onState = (v: RoomView) => {
      clockOffset.current = v.serverTime - Date.now();
      setView(v);
    };
    const onGone = (reason: string) => {
      clearSession();
      setView(null);
      setNotice(reason);
      setUrlCode(null);
    };
    socket.on('connect', rejoin);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    socket.on('room:gone', onGone);
    if (socket.connected) rejoin();
    return () => {
      socket.off('connect', rejoin);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onState);
      socket.off('room:gone', onGone);
    };
  }, []);

  const enter = (name: string, res: ({ ok: true } & Session) | { ok: false; error: string }): Result => {
    if (!res.ok) return res;
    saveSession({ code: res.code, playerId: res.playerId, token: res.token });
    saveName(name);
    setUrlCode(res.code);
    setNotice(null);
    return { ok: true };
  };

  const create = useCallback(
    (name: string) =>
      new Promise<Result>((resolve) => {
        if (!socket.connected) return resolve({ ok: false, error: 'Connessione assente, riprova tra un attimo.' });
        socket.emit('room:create', { name }, (res) => resolve(enter(name, res)));
      }),
    [],
  );

  const join = useCallback(
    (code: string, name: string) =>
      new Promise<Result>((resolve) => {
        if (!socket.connected) return resolve({ ok: false, error: 'Connessione assente, riprova tra un attimo.' });
        socket.emit('room:join', { code, name }, (res) => resolve(enter(name, res)));
      }),
    [],
  );

  const leave = useCallback(() => {
    socket.emit('room:leave');
    clearSession();
    setView(null);
    setUrlCode(null);
  }, []);

  const start = useCallback(
    () => new Promise<Result>((resolve) => socket.emit('host:start', resolve)),
    [],
  );

  return {
    view,
    online,
    restoring,
    notice,
    dismissNotice: () => setNotice(null),
    /** Ora corrente secondo il server */
    now: () => Date.now() + clockOffset.current,
    create,
    join,
    leave,
    start,
    updateSettings: (patch: Partial<Settings>) => socket.emit('host:settings', patch),
    answer: (index: number, value: number) => socket.emit('answer:submit', { index, value }),
    guess: (value: number) => socket.emit('guess:submit', { value }),
    skip: () => socket.emit('host:skip'),
    next: () => socket.emit('host:next'),
    restart: () => socket.emit('host:restart'),
  };
}

export type Game = ReturnType<typeof useGame>;

/** Tiene il codice stanza nell'URL (?r=ABCD): è anche il link da condividere. */
function setUrlCode(code: string | null): void {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('r', code);
  else url.searchParams.delete('r');
  window.history.replaceState(null, '', url);
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/?r=${code}`;
}
