import { MAX_NICKNAME, sanitizeNickname } from '../src/services/roomService'
import type { FocusEventHandler, ReactElement } from 'react'

type NicknameInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  label?: string
  placeholder?: string
  error?: string
  onBlur?: FocusEventHandler<HTMLInputElement>
}

export default function NicknameInput({
  value,
  onChange,
  id = 'nickname',
  label = 'Your nickname',
  placeholder = 'Your name',
  error,
  onBlur,
}: NicknameInputProps): ReactElement {
  const counter = `${value.length}/${MAX_NICKNAME}`
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="qr-field">
      <div className="qr-field-head">
        <label className="qr-label" htmlFor={id}>
          {label}
        </label>
        <span className={`qr-counter${value.length >= MAX_NICKNAME ? ' is-full' : ''}`}>
          {counter}
        </span>
      </div>
      <input
        id={id}
        className={`qr-input${error ? ' is-invalid' : ''}`}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={MAX_NICKNAME}
        autoComplete="nickname"
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onBlur={onBlur}
        onChange={(event) => onChange(sanitizeNickname(event.target.value))}
      />
      {error && (
        <p className="qr-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
