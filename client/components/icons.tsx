/* Authored inline SVG icon set — one stroke grammar (2px, round caps, 24 grid). */
import type { SVGProps } from 'react'

export type IconProps = {
  size?: number
  className?: string
}

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
})

export function BoltIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="none" fill="currentColor">
      <path d="M13.6 1.8 4.4 13.6a.7.7 0 0 0 .56 1.12h4.14l-1.2 7.2a.66.66 0 0 01.2.62l9.2-11.8a.7.7 0 0 0-.56-1.12h-4.2l1.36-7.4a.66.66 0 0 0-1.2-.62Z" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 12h15" />
      <path d="m14 6.5 5.5 5.5L14 17.5" />
    </svg>
  )
}

export function UsersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="9.2" cy="8" r="3.4" />
      <path d="M3.4 20c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4" />
      <circle cx="17" cy="9.2" r="2.5" />
      <path d="M16.2 14.8c2.7-.2 4.9 1.8 4.9 4.6" />
    </svg>
  )
}

export function HomeIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 10.8 12 3.5l9 7.3" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  )
}

export function XMarkIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 6l12 12 M18 6 6 18" />
    </svg>
  )
}

export function DiceIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="9.2" cy="9.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="14.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="9.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9.2" cy="14.8" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FlaskIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 3h6" />
      <path d="M10 3v5.4L6.3 17.1A2.4 2.4 0 0 08.4 20.7h7.2a2.4 2.4 0 0 02.1-3.6L14 8.4V3" />
      <path d="M7.6 14.6h8.8" />
    </svg>
  )
}

export function LandmarkIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 10.5 12 4l8.5 6.5" />
      <path d="M6.2 11v7 M10 11v7 M14 11v7 M17.8 11v7" />
      <path d="M3.5 20.5h17" />
    </svg>
  )
}

export function GlobeIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4Z" />
    </svg>
  )
}

export function FilmIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M7.5 5v14 M16.5 5v14" />
      <path d="M3 9.5h4.5 M3 14.5h4.5 M16.5 9.5H21 M16.5 14.5H21" />
    </svg>
  )
}

export function TrophyIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7.5 4.5h9v4.6a4.5 4.5 0 0 1-9 0Z" />
      <path d="M7.5 5.5H5.3A2.8 2.8 0 0 02.5 8.3v.9c0 1.6 1.3 2.8 2.8 2.8h2" />
      <path d="M16.5 5.5h2.2A2.8 2.8 0 0 121.5 8.3v.9c0 1.6-1.3 2.8-2.8 2.8h-2" />
      <path d="M12 13.7v6.8" />
      <path d="M8.5 20.5h7" />
    </svg>
  )
}

export function HashIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9.5 3.5 7.5 20.5 M16.5 3.5l-2 17 M4 9.2h16 M3.5 14.8h16" />
    </svg>
  )
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3.4 2.2" />
    </svg>
  )
}

export function CopyIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.6" />
      <path d="M15.5 5.5H6A2.5 2.5 0 0 03.5 8v9.5" />
    </svg>
  )
}

export function SparkleIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} stroke="none" fill="currentColor">
      <path d="M12 2.5c.6 5.4 4.1 8.9 9.5 9.5-5.4.6-8.9 4.1-9.5 9.5-.6-5.4-4.1-8.9-9.5-9.5 5.4-.6 8.9-4.1 9.5-9.5Z" />
    </svg>
  )
}

export function SpinnerIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} strokeWidth={2.6}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" opacity={0.9} />
    </svg>
  )
}

export function LeaveIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M14.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h8.5" />
      <path d="M10 12h11" />
      <path d="m17.5 8.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
}
