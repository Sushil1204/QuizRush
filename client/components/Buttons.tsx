import { Link } from 'react-router-dom'
import type { To } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'
import { ArrowRightIcon, SpinnerIcon } from './icons'

type ButtonContentProps = {
  icon?: ReactNode
  trailing: boolean
  loading: boolean
  children: ReactNode
}

function ButtonContent({ icon, trailing, loading, children }: ButtonContentProps): ReactElement {
  return (
    <>
      {loading ? (
        <SpinnerIcon size={16} className="qr-btn__spinner" />
      ) : (
        icon && <span className="qr-btn__icon">{icon}</span>
      )}
      <span className="qr-btn__label">{children}</span>
      {!loading && trailing && <ArrowRightIcon size={17} className="qr-btn__arrow" />}
    </>
  )
}

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'sm' | undefined

type ButtonClassOptions = {
  variant: ButtonVariant
  size: ButtonSize
  block: boolean
  className: string
  disabled: boolean
  loading: boolean
}

function buttonClass({
  variant,
  size,
  block,
  className,
  disabled,
  loading,
}: ButtonClassOptions): string {
  return [
    'qr-btn',
    `qr-btn--${variant}`,
    size === 'sm' && 'qr-btn--sm',
    block && 'qr-btn--block',
    (disabled || loading) && 'is-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export type PrimaryButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled'
> & {
  to?: To
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
  trailing?: boolean
  loading?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
}

export function PrimaryButton({
  to,
  variant = 'primary',
  size,
  block,
  icon,
  trailing = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}: PrimaryButtonProps): ReactElement {
  block = block ?? false
  const classes = buttonClass({ variant, size, block, className, disabled, loading })

  if (to) {
    return (
      <Link to={to} className={classes}>
        <ButtonContent icon={icon} trailing={trailing} loading={false}>
          {children}
        </ButtonContent>
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <ButtonContent icon={icon} trailing={trailing} loading={loading}>
        {children}
      </ButtonContent>
    </button>
  )
}

export function SecondaryButton(props: PrimaryButtonProps): ReactElement {
  return <PrimaryButton {...props} variant="secondary" />
}
