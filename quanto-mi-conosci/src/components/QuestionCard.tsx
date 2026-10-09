import { useEffect, useState } from 'react';
import type { PublicPlayer, Question } from '../../shared/types';
import { SLIDER_TOLERANCE } from '../../shared/rules';
import { OPTION_LETTERS } from '../lib/helpers';
import { Avatar } from './Avatar';

interface Props {
  question: Question;
  /** Valore già scelto (evidenziato) */
  selected: number | null;
  onPick?: (value: number) => void;
  disabled?: boolean;
  /** In fase di rivelazione: risposta giusta e chi ha scelto cosa */
  reveal?: { correct: number; picks: { player: PublicPlayer; value: number; correct: boolean }[] };
}

/** Una domanda con le sue 4 opzioni oppure con lo slider. */
export function QuestionCard({ question, selected, onPick, disabled, reveal }: Props) {
  if (question.type === 'choice') {
    return (
      <div className="options">
        {question.options.map((opt, i) => {
          const isCorrect = reveal && reveal.correct === i;
          const pickers = reveal?.picks.filter((p) => p.value === i) ?? [];
          const cls = [
            'option',
            `option-${i}`,
            selected === i ? 'is-selected' : '',
            reveal ? (isCorrect ? 'is-correct' : 'is-wrong') : '',
          ].join(' ');
          return (
            <button
              key={i}
              className={cls}
              disabled={disabled || !!reveal}
              onClick={() => onPick?.(i)}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="option-letter">{isCorrect ? '✓' : OPTION_LETTERS[i]}</span>
              <span className="option-text">{opt}</span>
              {pickers.length > 0 && (
                <span className="option-pickers">
                  {pickers.map((p) => (
                    <Avatar key={p.player.id} player={p.player} size="sm" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
  return <SliderInput question={question} selected={selected} onPick={onPick} disabled={disabled} reveal={reveal} />;
}

function SliderInput({ question, selected, onPick, disabled, reveal }: Props & { question: Extract<Question, { type: 'slider' }> }) {
  const mid = Math.round((question.min + question.max) / 2);
  const [value, setValue] = useState(selected ?? mid);
  useEffect(() => setValue(selected ?? mid), [question.id, selected, mid]);

  const pct = (v: number) => ((v - question.min) / (question.max - question.min)) * 100;
  const locked = disabled || selected !== null || !!reveal;

  return (
    <div className="slider-box">
      <div className="slider-value">{reveal ? reveal.correct : value}</div>
      <div className="slider-track-wrap">
        {reveal && (
          <>
            {/* zona "indovinato" (±tolleranza) */}
            <div
              className="slider-zone"
              style={{
                left: `${pct(Math.max(question.min, reveal.correct - SLIDER_TOLERANCE))}%`,
                width: `${pct(Math.min(question.max, reveal.correct + SLIDER_TOLERANCE)) - pct(Math.max(question.min, reveal.correct - SLIDER_TOLERANCE))}%`,
              }}
            />
            {reveal.picks.map((p, i) => (
              <div key={p.player.id} className="slider-pick" style={{ left: `${pct(p.value)}%`, top: `${-30 - (i % 3) * 22}px` }}>
                <Avatar player={p.player} size="sm" />
              </div>
            ))}
          </>
        )}
        <input
          type="range"
          className="slider"
          min={question.min}
          max={question.max}
          step={1}
          value={reveal ? reveal.correct : value}
          disabled={locked}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
      <div className="slider-labels">
        <span>{question.minLabel}</span>
        <span>{question.maxLabel}</span>
      </div>
      {!locked && (
        <button className="btn btn-primary btn-block" onClick={() => onPick?.(value)}>
          Conferma {value}
        </button>
      )}
    </div>
  );
}
