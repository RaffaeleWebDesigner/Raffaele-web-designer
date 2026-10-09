import { useEffect, useState } from 'react';
import type { RoomView } from '../../shared/types';
import { GUESS_SECONDS, SLIDER_TOLERANCE } from '../../shared/rules';
import { Avatar } from '../components/Avatar';
import { Countdown } from '../components/Countdown';
import { QuestionCard } from '../components/QuestionCard';
import { answerLabel, playersOf } from '../lib/helpers';
import type { Game } from '../lib/useGame';

/** Fase 2: a turno, tutti indovinano le risposte di un giocatore. */
export function Guessing({ game, view }: { game: Game; view: RoomView }) {
  const g = view.guessing!;
  const { byId, me, isHost } = playersOf(view);
  const target = byId.get(g.targetId)!;
  const q = view.questions[g.questionIndex];
  const iAmTarget = g.targetId === view.meId;
  const canAdvance = isHost || iAmTarget;
  const showIntro = useIntro(g.targetId, g.step === 0 && !g.revealed);

  const myResult = g.results.find((r) => r.playerId === view.meId);
  const pending = g.guesserIds.filter((id) => !g.guessedIds.includes(id));
  const isLast = g.step === g.stepsTotal - 1 && g.targetIndex === g.targetsTotal - 1;

  if (showIntro) {
    return (
      <main className="screen center intro" onClick={() => undefined}>
        <p className="kicker">Giocatore {g.targetIndex + 1} di {g.targetsTotal}</p>
        <div className="intro-avatar zoom-in">
          <Avatar player={target} size="xl" />
        </div>
        <h1 className="title zoom-in">{iAmTarget ? 'Ora tocca a te!' : `Ora tocca a ${target.name}!`}</h1>
        <p className="subtitle">
          {iAmTarget ? 'Vediamo quanto ti conoscono 👀' : `Quanto conosci ${target.name}?`}
        </p>
      </main>
    );
  }

  return (
    <main className="screen guessing">
      <header className="topbar">
        <span className="target-chip" style={{ borderColor: target.color }}>
          <Avatar player={target} size="sm" /> {iAmTarget ? 'Tu' : target.name}
        </span>
        <span className="topbar-title">
          {g.step + 1}/{g.stepsTotal}
        </span>
        <span className="pill score-pill">⭐ {me.score}</span>
      </header>
      {!g.revealed && <Countdown deadline={g.deadline} now={game.now} total={GUESS_SECONDS} />}

      <section key={`${g.targetId}-${g.questionIndex}`} className="question slide-in">
        <p className="question-kicker">
          {iAmTarget ? 'La tua risposta segreta 🤫' : `Cosa ha risposto ${target.name}?`}
        </p>
        <h1 className="question-text">{q.text}</h1>

        {g.revealed ? (
          <>
            <QuestionCard
              question={q}
              selected={null}
              reveal={{
                correct: g.correctAnswer ?? -1,
                picks: g.results.flatMap((r) => {
                  const player = byId.get(r.playerId);
                  return player ? [{ player, value: r.guess, correct: r.correct }] : [];
                }),
              }}
            />
            {!iAmTarget && (
              <div className={`verdict ${myResult?.correct ? 'is-good' : 'is-bad'}`}>
                {myResult ? (myResult.correct ? `Esatto! +${myResult.points}${myResult.first ? ' ⚡' : ''}` : 'Sbagliato! 😅') : 'Non hai risposto 😴'}
              </div>
            )}
            <ul className="results-list">
              {g.results.map((r) => {
                const p = byId.get(r.playerId);
                if (!p) return null;
                return (
                  <li key={r.playerId} className={`pop-in ${r.correct ? 'is-good' : 'is-bad'}`}>
                    <Avatar player={p} size="sm" />
                    <span className="player-name">{p.name}</span>
                    <span className="result-guess">{q.type === 'slider' ? r.guess : ''}</span>
                    <span className="result-points">{r.correct ? `+${r.points}${r.first ? ' ⚡' : ''}` : '✗'}</span>
                  </li>
                );
              })}
            </ul>
            {q.type === 'slider' && (
              <p className="hint">Vale come giusta anche una risposta a ±{SLIDER_TOLERANCE} di distanza.</p>
            )}
          </>
        ) : iAmTarget ? (
          <>
            <div className="secret-answer">
              {view.myAnswers[g.questionIndex] !== null && answerLabel(q, view.myAnswers[g.questionIndex]!)}
            </div>
            <p className="subtitle">Gli altri stanno cercando di indovinare…</p>
          </>
        ) : g.myGuess === null ? (
          <QuestionCard question={q} selected={null} onPick={game.guess} />
        ) : (
          <QuestionCard question={q} selected={g.myGuess} disabled />
        )}
      </section>

      <div className="sticky-bottom">
        {g.revealed ? (
          canAdvance ? (
            <button className="btn btn-primary btn-xl btn-block" onClick={game.next}>
              {isLast ? 'Vai alla classifica 🏆' : g.step === g.stepsTotal - 1 ? 'Prossimo giocatore →' : 'Prossima domanda →'}
            </button>
          ) : (
            <p className="waiting">Si va avanti tra poco<span className="dots" /></p>
          )
        ) : (
          <>
            <div className="who-guessed">
              {g.guesserIds.map((id) => {
                const p = byId.get(id);
                return p ? <Avatar key={id} player={p} size="sm" dim={!g.guessedIds.includes(id)} /> : null;
              })}
            </div>
            <p className="waiting">
              {pending.length === 0
                ? 'Rivelazione…'
                : `Mancano ${pending.length === 1 ? byId.get(pending[0])?.name ?? '1' : pending.length}`}
              {pending.length > 0 && <span className="dots" />}
            </p>
            {isHost && pending.length > 0 && g.guessedIds.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={game.skip}>
                Rivela subito
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/** Mostra per 2,2 secondi la schermata "Ora tocca a…" quando cambia protagonista. */
function useIntro(targetId: string, active: boolean): boolean {
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    if (!active || seen === targetId) return;
    const t = setTimeout(() => setSeen(targetId), 2200);
    return () => clearTimeout(t);
  }, [targetId, active, seen]);
  return active && seen !== targetId;
}
