/* Decorative edge confetti — pointer-free, screen-reader-free, layout-free. */

import type { ReactElement, ReactNode } from 'react'

type DecorativeProps = {
  className?: string
  size?: number
}

function Star({ className, size = 20 }: DecorativeProps): ReactElement {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="m12 2.2 2.8 6.3 6.9.6-5.2 4.6 1.5 6.8-6-3.5-6 3.5 1.5-6.8-5.2-4.6 6.9-.6Z" />
    </svg>
  )
}

function Spark({ className, size = 16 }: DecorativeProps): ReactElement {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 2.5c.6 5.4 4.1 8.9 9.5 9.5-5.4.6-8.9 4.1-9.5 9.5-.6-5.4-4.1-8.9-9.5-9.5 5.4-.6 8.9-4.1 9.5-9.5Z" />
    </svg>
  )
}

function Squiggle({ className }: Pick<DecorativeProps, 'className'>): ReactElement {
  return (
    <svg className={className} width="34" height="18" viewBox="0 0 34 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M2.5 12c3.6-7 8.4-9.4 14.4-7.2 6 2.2 10.2.6 14.6-4.3" />
    </svg>
  )
}

function Curl({ className }: Pick<DecorativeProps, 'className'>): ReactElement {
  return (
    <svg className={className} width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M4 24C4 12.5 12 5 24 5.5" />
      <path d="M18.5 3.5 24.5 5.5 22 11.5" />
    </svg>
  )
}

function Confetti({ className }: Pick<DecorativeProps, 'className'>): ReactElement {
  return (
    <svg className={className} width="46" height="40" viewBox="0 0 46 40" fill="none" aria-hidden="true" focusable="false">
      <rect x="3" y="6" width="13" height="4.5" rx="2.25" transform="rotate(-38 3 6)" fill="#ff6b6b" />
      <rect x="24" y="3" width="12" height="4.5" rx="2.25" transform="rotate(28 24 3)" fill="#6825e8" />
      <rect x="6" y="26" width="12" height="4.5" rx="2.25" transform="rotate(18 6 26)" fill="#ffc947" />
      <rect x="30" y="24" width="13" height="4.5" rx="2.25" transform="rotate(-24 30 24)" fill="#4da3ff" />
    </svg>
  )
}

function Dashes({ className }: Pick<DecorativeProps, 'className'>): ReactElement {
  return (
    <svg className={className} width="40" height="36" viewBox="0 0 40 36" fill="none" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="14" height="5" rx="2.5" transform="rotate(35 4 4)" fill="#ff6b6b" />
      <rect x="18" y="16" width="13" height="5" rx="2.5" transform="rotate(-20 18 16)" fill="#6825e8" />
      <rect x="6" y="26" width="12" height="5" rx="2.5" transform="rotate(-45 6 26)" fill="#ffc947" />
    </svg>
  )
}

type DecorVariant = 'home' | 'join' | 'create'
type DecorItem = readonly [key: string, node: ReactNode]

const VARIANTS: Record<DecorVariant, DecorItem[]> = {
  home: [
    ['star-a', <Star key="a" className="qr-dec__star-a" size={24} />],
    ['spark-a', <Spark key="a" className="qr-dec__spark-a" size={17} />],
    ['squiggle-l', <Squiggle key="s" className="qr-dec__squiggle-l" />],
    ['confetti-l', <Confetti key="c" className="qr-dec__confetti-l" />],
    ['star-b', <Star key="b" className="qr-dec__star-b" size={19} />],
    ['spark-b', <Spark key="b" className="qr-dec__spark-b" size={14} />],
    ['curl-r', <Curl key="cu" className="qr-dec__curl-r" />],
    ['dash-r', <Dashes key="d" className="qr-dec__dash-r" />],
    ['confetti-bl', <Confetti key="cb" className="qr-dec__confetti-bl" />],
    ['wave', <svg key="w" className="qr-dec__wave" viewBox="0 0 520 190" fill="none" aria-hidden="true" focusable="false"><path d="M520 190H0c0-64 74-117 175-134C286 35 396 84 520 44v146Z" fill="#ece1ff" /></svg>],
  ],
  join: [
    ['spark-tr', <Spark key="a" className="qr-dec__spark-tr" size={20} />],
    ['curl-tr', <Curl key="b" className="qr-dec__curl-tr" />],
    ['star-l', <Star key="c" className="qr-dec__star-l" size={18} />],
    ['squiggle-l', <Squiggle key="d" className="qr-dec__squiggle-l2" />],
    ['dash-r', <Dashes key="e" className="qr-dec__dash-r2" />],
    ['confetti-bl', <Confetti key="f" className="qr-dec__confetti-bl2" />],
  ],
  create: [
    ['spark-l', <Spark key="a" className="qr-dec__spark-cl" size={18} />],
    ['star-r', <Star key="b" className="qr-dec__star-cr" size={21} />],
    ['curl-l', <Curl key="c" className="qr-dec__curl-cl" />],
    ['dash-r', <Dashes key="d" className="qr-dec__dash-cr" />],
    ['squiggle-r', <Squiggle key="e" className="qr-dec__squiggle-cr" />],
  ],
}

type DecorProps = {
  variant?: DecorVariant
}

export default function Decor({ variant = 'home' }: DecorProps): ReactElement {
  const items = VARIANTS[variant] ?? VARIANTS.home
  return (
    <div className={`qr-dec qr-dec--${variant}`} aria-hidden="true">
      {items.map(([key, node]) => (
        <span key={key} className="qr-dec__item">
          {node}
        </span>
      ))}
    </div>
  )
}
