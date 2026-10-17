import { useRef, useState } from 'react'
import type { ChangeEvent, FocusEventHandler, ReactElement, SyntheticEvent } from 'react'
import { CODE_LENGTH, normalizeCode } from '../src/services/roomService'

/**
 * Six visual boxes, one logical value: a single input rides invisibly over the
 * boxes, so paste, backspace, arrows, and screen readers all work natively.
 */
type RoomCodeInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  invalid?: boolean
  describedBy?: string
  autoFocus?: boolean
  onBlur?: FocusEventHandler<HTMLInputElement>
}

export default function RoomCodeInput({
  value,
  onChange,
  id = 'room-code',
  invalid = false,
  describedBy,
  autoFocus = false,
  onBlur,
}: RoomCodeInputProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(() => value.length)

  const chars = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '')

  const syncCaret = (event: SyntheticEvent<HTMLInputElement>) => {
    const pos = event.currentTarget.selectionStart
    setActive(typeof pos === 'number' ? Math.min(pos, CODE_LENGTH - 1) : value.length)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = normalizeCode(event.target.value)
    onChange(next)
    setActive(Math.min(next.length, CODE_LENGTH - 1))
  }

  const focusInput = () => inputRef.current?.focus()

  return (
    <div
      className={`qr-code${invalid ? ' is-invalid' : ''}${value.length === CODE_LENGTH ? ' is-complete' : ''}`}
      onClick={focusInput}
    >
      <label className="sr-only" htmlFor={id}>
        Room code, {CODE_LENGTH} characters
      </label>
      <input
        ref={inputRef}
        id={id}
        className="qr-code__input"
        value={value}
        onChange={handleChange}
        onFocus={(event) => {
          setFocused(true)
          syncCaret(event)
        }}
        onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
        }}
        onClick={syncCaret}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
        maxLength={CODE_LENGTH}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoFocus={autoFocus}
      />
      <div className="qr-code__boxes" aria-hidden="true">
        {chars.map((char, index) => (
          <span
            key={index}
            className={[
              'qr-code__box',
              char ? 'is-filled' : '',
              focused && index === active ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  )
}
