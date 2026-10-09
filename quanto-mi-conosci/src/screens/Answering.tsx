import type { RoomView } from '../../shared/types';
import { ANSWER_SECONDS_PER_QUESTION } from '../../shared/rules';
import { Countdown } from '../components/Countdown';
import { GroupProgress } from '../components/GroupProgress';
import { QuestionCard } from '../components/QuestionCard';
import { playersOf } from '../lib/helpers';
import type { Game } from '../lib/useGame';

/** Fase 1: ognuno risponde in segreto alle domande su sé stesso. */
export function Answering({ game, view }: { game: Game; view: RoomView }) {
  const { isHost } = playersOf(view);
  const total = view.questions.length;
  const index = view.myAnswers.findIndex((a) => a === null);
  const finished = index === -1;
  const doneCount = view.players.filter((p) => p.answeredCount >= total).length;
  const timer = (
    <Countdown deadline={view.answeringDeadline} now={game.now} total={total * ANSWER_SECONDS_PER_QUESTION} />
  );

  if (finished) {
    return (
      <main className="screen center">
        {timer}
        <div className="big-emoji bounce">🤫</div>
        <h1 className="title">Fatto!</h1>
        <p className="subtitle">
          Le tue risposte sono al sicuro. Aspettiamo gli altri… ({doneCount}/{view.players.length})
        </p>
        <div className="card wide">
          <GroupProgress players={view.players} total={total} />
        </div>
        {isHost && doneCount < view.players.length && (
          <button className="btn btn-ghost" onClick={game.skip}>
            Non aspettare i ritardatari →
          </button>
        )}
      </main>
    );
  }

  const q = view.questions[index];
  return (
    <main className="screen">
      <header className="topbar">
        <span className="pill">Su di te 🤫</span>
        <span className="topbar-title">
          {index + 1}/{total}
        </span>
        <span className="pill">{doneCount} hanno finito</span>
      </header>
      {timer}
      <div className="steps">
        {view.questions.map((_, i) => (
          <span key={i} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
        ))}
      </div>
      <section key={q.id} className="question slide-in">
        <p className="question-kicker">Rispondi sinceramente…</p>
        <h1 className="question-text">{q.text}</h1>
        <QuestionCard question={q} selected={null} onPick={(v) => game.answer(index, v)} />
      </section>
    </main>
  );
}
