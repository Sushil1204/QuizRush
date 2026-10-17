import { AVATARS, type Avatar } from '../data/avatars'
import type { CSSProperties, ReactElement } from 'react'
import { CheckIcon } from './icons'

type AvatarOptionProps = {
  avatar: Avatar
  checked: boolean
  onChange: (avatarId: string) => void
  groupName: string
}

type AvatarGridStyle = CSSProperties & {
  '--avatar-bg'?: string
  '--avatar-cols'?: number
  '--avatar-cols-sm'?: number
}

export function AvatarOption({
  avatar,
  checked,
  onChange,
  groupName,
}: AvatarOptionProps): ReactElement {
  return (
    <label className={`qr-avatar${checked ? ' is-selected' : ''}`}>
      <input
        type="radio"
        name={groupName}
        value={avatar.id}
        checked={checked}
        onChange={() => onChange(avatar.id)}
        className="sr-only"
      />
      <span className="qr-avatar__frame">
        <span
          className="qr-avatar__disc"
            style={{ '--avatar-bg': avatar.bg } as AvatarGridStyle}
          aria-hidden="true"
        >
          <span className="qr-avatar__emoji">{avatar.emoji}</span>
        </span>
        <span className="qr-avatar__check" aria-hidden="true">
          <CheckIcon size={11} />
        </span>
      </span>
      <span className="sr-only">{avatar.label}</span>
    </label>
  )
}

type AvatarPickerProps = {
  value: string
  onChange: (avatarId: string) => void
  groupName: string
  legend?: string
  columns?: number
  columnsMobile?: number
}

export default function AvatarPicker({
  value,
  onChange,
  groupName,
  legend = 'Choose your avatar',
  columns,
  columnsMobile,
}: AvatarPickerProps): ReactElement {
  const avatars = AVATARS as Avatar[]
  const style: AvatarGridStyle = {}
  if (columns) style['--avatar-cols'] = columns
  if (columnsMobile) style['--avatar-cols-sm'] = columnsMobile

  return (
    <fieldset className="qr-fieldset">
      <legend className="qr-label">{legend}</legend>
      <div className="qr-avatar-grid" style={style}>
        {avatars.map((avatar) => (
          <AvatarOption
            key={avatar.id}
            avatar={avatar}
            groupName={groupName}
            checked={value === avatar.id}
            onChange={onChange}
          />
        ))}
      </div>
    </fieldset>
  )
}
