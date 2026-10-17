import type { ComponentType, ReactElement, ReactNode } from 'react'
import type { IconProps } from './icons'

type OptionCardProps<Value extends string | number> = {
  name: string
  value: Value
  checked: boolean
  onChange: (value: Value) => void
  label: ReactNode
  Icon?: ComponentType<IconProps>
  className?: string
}

export default function OptionCard<Value extends string | number>({
  name,
  value,
  checked,
  onChange,
  label,
  Icon,
  className = '',
}: OptionCardProps<Value>): ReactElement {
  return (
    <label className={`qr-option${checked ? ' is-selected' : ''} ${className}`.trim()}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span className="qr-option__lead" aria-hidden="true">
        {Icon ? <Icon size={17} /> : <span className="qr-option__dot" />}
      </span>
      <span className="qr-option__label">{label}</span>
    </label>
  )
}
