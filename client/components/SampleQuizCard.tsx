import { useState } from 'react'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { ArrowRightIcon, BoltIcon, CheckIcon, FlaskIcon, XMarkIcon } from './icons'

const QUESTION = 'Which planet is known as the Red Planet?'
type QuizOption = {
  id: string
  letter: string
  text: string
}

const OPTIONS: QuizOption[] = [
  { id: 'a', letter: 'A', text: 'Venus' },
  { id: 'b', letter: 'B', text: 'Mars' },
  { id: 'c', letter: 'C', text: 'Jupiter' },
  { id: 'd', letter: 'D', text: 'Mercury' },
]
const CORRECT_ID = 'b'

export default function SampleQuizCard() {
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const correct = selected === CORRECT_ID

  const reset = () => {
    setSelected(null)
    setRevealed(false)
  }

  return (
    <article className="qr-demo" aria-labelledby="demo-question">
      <header className="qr-demo__head">
        <span className="qr-badge qr-badge--primary">
          <BoltIcon size={13} />
          Sample Quiz
        </span>
        <span className="qr-badge">
          <FlaskIcon size={13} />
          Science
        </span>
      </header>

      <h3 className="qr-demo__question" id="demo-question">
        {QUESTION}
      </h3>

      <fieldset className="qr-demo__options">
        <legend className="sr-only">Pick one answer</legend>
        {OPTIONS.map((option) => {
          const isSelected = selected === option.id
          const isAnswer = revealed && option.id === CORRECT_ID
          const isMiss = revealed && isSelected && option.id !== CORRECT_ID
          return (
            <label
              key={option.id}
              className={[
                'qr-answer',
                isSelected && !revealed && 'is-selected',
                isAnswer && 'is-correct',
                isMiss && 'is-wrong',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="radio"
                name="demo-answer"
                value={option.id}
                checked={isSelected}
                onChange={() => setSelected(option.id)}
                disabled={revealed}
                className="sr-only"
              />
              <span className="qr-answer__letter" aria-hidden="true">
                {option.letter}
              </span>
              <span className="qr-answer__text">{option.text}</span>
              {isAnswer && (
                <span className="qr-answer__mark qr-answer__mark--correct">
                  <CheckIcon size={13} />
                  <span className="sr-only">Correct answer</span>
                </span>
              )}
              {isMiss && (
                <span className="qr-answer__mark qr-answer__mark--wrong">
                  <XMarkIcon size={13} />
                  <span className="sr-only">Your pick, not the answer</span>
                </span>
              )}
              {isSelected && !revealed && (
                <span className="qr-answer__mark qr-answer__mark--picked">
                  <CheckIcon size={13} />
                  <span className="sr-only">Selected</span>
                </span>
              )}
            </label>
          )
        })}
      </fieldset>

      <footer className="qr-demo__foot">
        {!revealed ? (
          <>
            <p className="qr-demo__hint">
              {selected ? 'Got one? Reveal the answer' : 'Pick an answer, then press'}
            </p>
            <PrimaryButton
              size="sm"
              trailing
              disabled={!selected}
              onClick={() => setRevealed(true)}
            >
              Reveal
            </PrimaryButton>
          </>
        ) : (
          <>
            <div
              className={`qr-banner ${correct ? 'qr-banner--win' : 'qr-banner--miss'}`}
              role="status"
            >
              <span className="qr-banner__icon" aria-hidden="true">
                {correct ? <CheckIcon size={15} /> : <XMarkIcon size={14} />}
              </span>
              <span className="qr-banner__copy">
                <strong>{correct ? 'Correct!' : 'Not quite'}</strong>
                <span>
                  {correct
                    ? 'Mars is the Red Planet.'
                    : 'The answer is B — Mars is the Red Planet.'}
                </span>
              </span>
              <span className="qr-banner__planet" aria-hidden="true">
                {'\u{1FA90}'}
              </span>
            </div>
            <SecondaryButton size="sm" icon={<ArrowRightIcon size={15} />} onClick={reset}>
              Play again
            </SecondaryButton>
          </>
        )}
      </footer>
    </article>
  )
}
