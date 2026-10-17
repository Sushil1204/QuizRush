import type { ReactElement } from 'react'
import { CheckIcon } from './icons'

type ProgressStepsProps = {
  steps: string[]
  current?: number
}

export default function ProgressSteps({ steps, current = 1 }: ProgressStepsProps): ReactElement {
  return (
    <nav className="qr-steps" aria-label="Room setup progress">
      <ol className="qr-steps__list">
        {steps.map((step, index) => {
          const position = index + 1
          const state = position < current ? 'is-done' : position === current ? 'is-current' : ''
          return (
            <li
              key={step}
              className={`qr-steps__item ${state}`.trim()}
              aria-current={position === current ? 'step' : undefined}
            >
              <span className="qr-steps__num" aria-hidden="true">
                {position < current ? <CheckIcon size={11} /> : position}
              </span>
              <span className="qr-steps__label">{step}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
