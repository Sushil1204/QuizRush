import { useState, type CSSProperties, type FormEvent, type ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Decor from '../../components/Decor'
import { PageHeading } from '../../components/Headings'
import { PrimaryButton, SecondaryButton } from '../../components/Buttons'
import RoomCodeInput from '../../components/RoomCodeInput'
import NicknameInput from '../../components/NicknameInput'
import AvatarPicker from '../../components/AvatarPicker'
import { ArrowRightIcon, HomeIcon, UsersIcon } from '../../components/icons'
import { AVATARS, type Avatar } from '../../data/avatars'
import { isCompleteCode, joinRoom, sanitizeNickname } from '../services/roomService'

type AvatarStyle = CSSProperties & {
  '--avatar-bg': string
}

const HOW_STEPS: string[] = [
  'Host sets the board',
  'Friends join by code',
  'Everyone answers — top score wins.',
]

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'We could not join the room. Please try again.'
}

export default function JoinRoom(): ReactElement {
  const navigate = useNavigate()
  const [code, setCode] = useState<string>('')
  const [nickname, setNickname] = useState<string>('')
  const [avatarId, setAvatarId] = useState<string>(AVATARS[0].id)
  const [codeTouched, setCodeTouched] = useState<boolean>(false)
  const [nameTouched, setNameTouched] = useState<boolean>(false)
  const [showErrors, setShowErrors] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [joining, setJoining] = useState<boolean>(false)

  const codeOk = isCompleteCode(code)
  const nameOk = sanitizeNickname(nickname).length > 0
  const canJoin = codeOk && nameOk && !joining
  const showCodeError = (showErrors || codeTouched) && !codeOk
  const showNameError = (showErrors || nameTouched) && !nameOk

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (joining) return
    setShowErrors(true)
    setServerError(null)
    if (!codeOk || !nameOk) return

    setJoining(true)
    try {
      const { room, player } = await joinRoom(code, {
        nickname: sanitizeNickname(nickname),
        avatarId,
      })
      navigate(`/lobby/${room.code}`, { state: { yourPlayerId: player.id } })
    } catch (error: unknown) {
      setServerError(errorMessage(error))
      setJoining(false)
    }
  }

  return (
    <>
      <Decor variant="home" />
      <main className="qr-main">
        <div className="qr-container">
          <PageHeading
            title="Join a room"
            description="Type the code off the host's board, then your name."
          />

          <div className="qr-join-grid">
            <form className="qr-card qr-form" onSubmit={handleSubmit} noValidate>
              <div className="qr-field">
                <div className="qr-field-head">
                  <span className="qr-label" id="room-code-label">
                    Room code
                  </span>
                  <span className="qr-counter">{code.length}/6</span>
                </div>
                <RoomCodeInput
                  value={code}
                   onChange={(next: string) => {
                    setCode(next)
                    setServerError(null)
                  }}
                  invalid={showCodeError}
                  describedBy={showCodeError ? 'code-error' : undefined}
                  onBlur={() => setCodeTouched(true)}
                />
                {showCodeError && (
                  <p className="qr-field-error" id="code-error">
                    Enter all 6 characters of the room code.
                  </p>
                )}
              </div>

              <NicknameInput
                value={nickname}
                 onChange={(next: string) => {
                  setNickname(next)
                  setServerError(null)
                }}
                error={showNameError ? 'Your nickname can’t be empty.' : undefined}
                onBlur={() => setNameTouched(true)}
              />

              <AvatarPicker
                value={avatarId}
                onChange={setAvatarId}
                groupName="join-avatar"
                columns={6}
                columnsMobile={5}
              />

              {serverError && (
                <div className="qr-alert qr-alert--error" role="alert">
                  {serverError}
                </div>
              )}

              <div className="qr-form__actions">
                <PrimaryButton
                  type="submit"
                  icon={<UsersIcon size={18} />}
                  trailing
                  loading={joining}
                  disabled={!canJoin}
                >
                  {joining ? 'Joining…' : 'Join room'}
                </PrimaryButton>
                <SecondaryButton to="/" icon={<HomeIcon size={17} />}>
                  Back to home
                </SecondaryButton>
              </div>
            </form>

            <aside className="qr-card qr-how" aria-labelledby="how-heading">
              <h2 className="qr-how__heading" id="how-heading">
                How it works
              </h2>
              <ol className="qr-how__steps">
                {HOW_STEPS.map((step, index) => (
                  <li key={step}>
                    <span className="qr-how__num" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="qr-how__proof">
                <span className="qr-how__avatars" aria-hidden="true">
                  {AVATARS.slice(0, 5).map((avatar: Avatar) => (
                    <span
                      key={avatar.id}
                      className="qr-hero__avatar"
                     style={{ '--avatar-bg': avatar.bg } as AvatarStyle}
                    >
                      {avatar.emoji}
                    </span>
                  ))}
                </span>
                <p className="qr-how__note">No sign-ups — just a code and a name.</p>
              </div>

              <hr className="qr-how__divider" />

              <p className="qr-how__host">
                Hosting instead?{' '}
                <Link className="qr-link" to="/create">
                  Create a room
                  <ArrowRightIcon size={15} />
                </Link>
              </p>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}
