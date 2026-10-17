import { getAvatar } from '../data/avatars'
import type { CSSProperties, MouseEventHandler, ReactElement } from 'react'
import { PrimaryButton, SecondaryButton } from './Buttons'
import {
  BoltIcon,
  ClockIcon,
  HashIcon,
  HomeIcon,
  SparkleIcon,
} from './icons'
import { CODE_LENGTH } from '../src/services/roomService'

type PreviewAvatarStyle = CSSProperties & {
  '--avatar-bg'?: string
}

type RoomPreviewCardProps = {
  nickname: string
  avatarId: string
  topicLabel: string
  difficultyLabel: string
  questionCount: number
  secondsPerQuestion: number
  onCreate: MouseEventHandler<HTMLButtonElement>
  creating?: boolean
  canCreate?: boolean
}

export default function RoomPreviewCard({
  nickname,
  avatarId,
  topicLabel,
  difficultyLabel,
  questionCount,
  secondsPerQuestion,
  onCreate,
  creating = false,
  canCreate = true,
}: RoomPreviewCardProps): ReactElement {
  const avatar = getAvatar(avatarId)
  const placeholder = nickname.trim() || 'You'

  return (
    <aside className="qr-preview" aria-label="Room preview">
      <h2 className="qr-preview__title">Room Preview</h2>

      <div className="qr-preview__player">
         <span
           className="qr-preview__avatar"
           style={{ '--avatar-bg': avatar.bg } as PreviewAvatarStyle}
           aria-hidden="true"
         >
          {avatar.emoji}
        </span>
        <span className="qr-preview__name">{placeholder}</span>
      </div>

      <div className="qr-preview__code" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <span key={index} className="qr-preview__code-box">
            <span className="qr-preview__code-dash">&ndash;</span>
          </span>
        ))}
      </div>
      <p className="qr-preview__code-hint">Your 6-letter code appears here after creation.</p>

      <div className="qr-preview__meta">
        <span className="qr-chip">
          <span className="qr-chip__dot" aria-hidden="true" />
          {topicLabel}
        </span>
        <span className="qr-chip">
          <span className="qr-chip__dot" aria-hidden="true" />
          {difficultyLabel}
        </span>
      </div>

      <div className="qr-preview__stats">
        <div className="qr-stat">
          <span className="qr-stat__label">
            <HashIcon size={13} /> Questions
          </span>
          <strong className="qr-stat__value">{questionCount}</strong>
        </div>
        <div className="qr-stat">
          <span className="qr-stat__label">
            <ClockIcon size={13} /> Time per question
          </span>
          <strong className="qr-stat__value">{secondsPerQuestion}s</strong>
        </div>
      </div>

      <div className="qr-preview__actions">
        <PrimaryButton block icon={<BoltIcon size={18} />} onClick={onCreate} loading={creating} disabled={!canCreate}>
          Create room
        </PrimaryButton>
        <SecondaryButton block to="/" icon={<HomeIcon size={17} />}>
          Back to home
        </SecondaryButton>
      </div>

      <p className="qr-preview__luck" aria-hidden="true">
        Good luck!
        <SparkleIcon size={15} className="qr-preview__luck-spark" />
      </p>
    </aside>
  )
}
