import type { ReactElement, ReactNode } from 'react'

type PageHeadingProps = {
  title: ReactNode
  description?: ReactNode
  center?: boolean
}

export function PageHeading({ title, description, center = false }: PageHeadingProps): ReactElement {
  return (
    <header className={`qr-page-heading${center ? ' qr-page-heading--center' : ''}`}>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  )
}

type SectionHeadingProps = {
  children: ReactNode
  className?: string
}

export function SectionHeading({ children, className = '' }: SectionHeadingProps): ReactElement {
  return <h2 className={`qr-section-heading ${className}`.trim()}>{children}</h2>
}
