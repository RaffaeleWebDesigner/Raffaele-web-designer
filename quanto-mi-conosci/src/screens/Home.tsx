import { useState, type FormEvent } from 'react';
import { CODE_LENGTH, NAME_MAX_LENGTH, normalizeCode, normalizeName } from '../../shared/rules';
import type { Game } from '../lib/useGame';
import { loadName } from '../lib/storage';

/** Home: crea una stanza o entra con un codice. Il nome si mette al volo. */
export function Home({ game }: { game: Game }) {
  const codeFromLink = normalizeCode(new URLSearchParams(window.location.search).get('r') ?? '');
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(codeFromLink ? 'join' : 'choose');
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState(codeFromLink);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeName(name);
    if (!cleanName) return setError('Come ti chiami?');
    if (mode === 'join' && code.length !== CODE_LENGTH) return setError(`Il codice ha ${CODE_LENGTH} lettere.`);
    setBusy(true);
    setError(null);
    const res = mode === 'create' ? await game.create(cleanName) : await game.join(code, cleanName);
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <main className="screen home">
      <div className="hero">
        <div className="hero-emojis" aria-hidden>
          <span>🤔</span>
          <span>🍕</span>
          <span>👀</span>
          <span>🎉</span>
        </div>
        <h1 className="logo">
          Quanto <span>Mi</span> Conosci?
        </h1>
        <p className="tagline">Rispondi su di te. Gli altri provano a indovinare. Chi ti conosce davvero?</p>
      </div>

      {game.notice && (
        <div className="notice" role="status">
          {game.notice}
          <button className="notice-close" onClick={game.dismissNotice} aria-label="Chiudi">
            ×
          </button>
        </div>
      )}

      {mode === 'choose' ? (
        <div className="stack">
          <button className="btn btn-primary btn-xl" onClick={() => setMode('create')}>
            🎉 Crea stanza
          </button>
          <button className="btn btn-secondary btn-xl" onClick={() => setMode('join')}>
            🔑 Entra con codice
          </button>
          <ol className="how">
            <li><b>1.</b> Crea la stanza e manda il link nel gruppo</li>
            <li><b>2.</b> Ognuno risponde in segreto su di sé</li>
            <li><b>3.</b> A turno, indovinate le risposte degli altri</li>
          </ol>
        </div>
      ) : (
        <form className="stack card" onSubmit={submit}>
          <h2>{mode === 'create' ? 'Crea una stanza' : 'Entra nella stanza'}</h2>
          {mode === 'join' && (
            <label className="field">
              <span>Codice stanza</span>
              <input
                className="input input-code"
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
                placeholder="ABCD"
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                autoFocus={!codeFromLink}
              />
            </label>
          )}
          <label className="field">
            <span>Il tuo nome</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Marco"
              maxLength={NAME_MAX_LENGTH}
              autoComplete="nickname"
              enterKeyHint="go"
              autoFocus={mode === 'create' || !!codeFromLink}
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-xl" disabled={busy}>
            {busy ? '…' : mode === 'create' ? 'Crea e invita gli amici' : 'Entra!'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => { setMode('choose'); setError(null); }}>
            ← Indietro
          </button>
        </form>
      )}
    </main>
  );
}
