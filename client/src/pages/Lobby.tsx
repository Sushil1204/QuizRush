import { useState, type CSSProperties, type ReactElement } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Decor from '../../components/Decor'
import { PageHeading } from '../../components/Headings'
import { SecondaryButton } from '../../components/Buttons'
import { BoltIcon, CheckIcon, CopyIcon, HomeIcon, LeaveIcon } from '../../components/icons'
import { getAvatar } from '../../data/avatars'
import { getDifficultyLabel, getTopicLabel } from '../../data/gameOptions'
import {
  CODE_LENGTH,
  getRoom,
  leaveRoom,
  type Player,
  type Room,
} from '../services/roomService'

type LobbyLocationState = {
  yourPlayerId?: string
  isHost?: boolean
}

type AvatarStyle = CSSProperties & {
  '--avatar-bg': string
}

export default function Lobby(): ReactElement {
  const { code } = useParams()
  const location = useLocation() as ReturnType<typeof useLocation> & {
    state: LobbyLocationState | null
  }
  const navigate = useNavigate()
  const [copied, setCopied] = useState<boolean>(false)

  const room: Room | null = getRoom(code)
  const yourPlayerId: string | null = location.state?.yourPlayerId ?? null

  if (!room) {
    return (
      <>
        <Decor variant="home" />
        <main className="qr-main">
          <div className="qr-container qr-container--narrow">
            <div className="qr-card qr-lobby__empty">
              <h1 className="qr-lobby__empty-title">That room isn’t open</h1>
              <p className="qr-lobby__empty-text">
                Room codes live on this device for the session — ask the host for the code
                on their board, or start a fresh room.
              </p>
              <div className="qr-form__actions">
                <SecondaryButton to="/join" icon={<BoltIcon size={16} />}>
                  Join a room
                </SecondaryButton>
                <SecondaryButton to="/" icon={<HomeIcon size={16} />}>
                  Back to home
                </SecondaryButton>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  const settings = room.settings
  const you: Player | null = room.players.find((player) => player.id === yourPlayerId) ?? null

  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const handleLeave = (): void => {
    if (yourPlayerId) leaveRoom(room.code, yourPlayerId)
    navigate('/')
  }

  return (
    <>
      <Decor variant="join" />
      <main className="qr-main">
        <div className="qr-container qr-container--narrow">
          <PageHeading
            title={you?.isHost ? 'Your room is open!' : 'You’re in!'}
            description={
              you?.isHost
                ? 'Share the code — friends join from their phones with just a nickname.'
                : 'The host has the board. Hang tight until everyone is in.'
            }
          />

          <div className="qr-lobby">
            <section className="qr-card qr-lobby__code" aria-labelledby="lobby-code-label">
              <div className="qr-field-head">
                <span className="qr-label" id="lobby-code-label">
                  Room code
                </span>
                <button type="button" className="qr-copy" onClick={copyCode}>
                  {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="qr-lobby__code-boxes">
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <span key={index} className="qr-lobby__code-box">
                    {room.code[index]}
                  </span>
                ))}
              </div>
              <p className="qr-lobby__hint" role={copied ? 'status' : undefined}>
                {copied
                  ? 'Code copied — paste it to your friends.'
                  : 'Type this code on the Join page to get in.'}
              </p>
            </section>

            <section className="qr-card qr-lobby__players" aria-labelledby="players-heading">
              <h2 className="qr-lobby__heading" id="players-heading">
                Players
                <span className="qr-lobby__count">
                  {room.players.length}
                  /12
                </span>
              </h2>
              <ul className="qr-lobby__list">
                {room.players.map((player) => {
                  const avatar = getAvatar(player.avatarId)
                  const isYou = player.id === yourPlayerId
                  return (
                    <li key={player.id} className={`qr-lobby__player${isYou ? ' is-you' : ''}`}>
                      <span
                        className="qr-preview__avatar"
                         style={{ '--avatar-bg': avatar.bg } as AvatarStyle}
                        aria-hidden="true"
                      >
                        {avatar.emoji}
                      </span>
                      <span className="qr-lobby__name">
                        {player.nickname}
                        {isYou && <span className="qr-lobby__tag">You</span>}
                      </span>
                      {player.isHost && (
                        <span className="qr-lobby__host">
                          <BoltIcon size={12} />
                          Host
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="qr-lobby__settings" aria-label="Room settings">
                <span className="qr-chip">{getTopicLabel(settings.topic)}</span>
                <span className="qr-chip">{getDifficultyLabel(settings.difficulty)}</span>
                <span className="qr-chip">{settings.questionCount} questions</span>
                <span className="qr-chip">{settings.secondsPerQuestion}s each</span>
              </div>

              <SecondaryButton block icon={<LeaveIcon size={17} />} onClick={handleLeave}>
                Leave room
              </SecondaryButton>
            </section>
          </div>

          <p className="qr-lobby__footer">
            Want a different board? <Link className="qr-link" to="/create">Create a room</Link>
          </p>
        </div>
      </main>
    </>
  )
}
