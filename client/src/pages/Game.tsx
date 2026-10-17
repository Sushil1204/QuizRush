import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Decor from '../../components/Decor'
import { PageHeading } from '../../components/Headings'
import { PrimaryButton, SecondaryButton } from '../../components/Buttons'
import { BoltIcon, CheckIcon, XMarkIcon } from '../../components/icons'
import {
  getCurrentPlayerId,
  getRoom,
  rematch,
  requestRoomState,
  restoreRoomSession,
  submitAnswer,
  subscribeGameEvents,
  subscribeRoomState,
  type GameEvent,
  type LeaderboardEntry,
  type PublicQuestion,
  type Room,
} from '../services/roomService'

function leaderboardTitle(entries: LeaderboardEntry[], playerId: string | null): string {
  const player = entries.find((entry) => entry.playerId === playerId)
  return player?.rank === 1 ? 'You won the room!' : 'Final scores are in'
}

export default function Game(): ReactElement {
  const { code } = useParams()
  const navigate = useNavigate()
  const playerId = getCurrentPlayerId()
  const [room, setRoom] = useState<Room | null>(() => getRoom(code))
  const [question, setQuestion] = useState<PublicQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [answer, setAnswer] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [reveal, setReveal] = useState<{ correctIndex: number; entries: LeaderboardEntry[] } | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsubscribeRoom = subscribeRoomState((nextRoom) => {
      if (nextRoom.code !== code) return
      setRoom(nextRoom)
      if (nextRoom.phase === 'LOBBY') navigate(`/lobby/${nextRoom.code}`, { replace: true })
    })
    const unsubscribeGame = subscribeGameEvents((event: GameEvent) => {
      switch (event.type) {
        case 'question-open':
          setQuestion(event.question)
          setQuestionIndex(event.questionIndex)
          setTotalQuestions(event.totalQuestions)
          setDeadlineAt(event.deadlineAt)
          setAnswer(null)
          setLocked(false)
          setReveal(null)
          setServerError(null)
          break
        case 'answer-locked':
          if (event.playerId === playerId) setLocked(true)
          break
        case 'answer-reveal':
          setReveal({ correctIndex: event.correctIndex, entries: event.entries })
          setLeaderboard(event.entries)
          setLocked(true)
          break
        case 'leaderboard':
          setLeaderboard(event.entries)
          break
        case 'finished':
          setLeaderboard(event.entries)
          setReveal(null)
          break
        case 'countdown':
          setTotalQuestions(event.totalQuestionCount)
          break
      }
    })
    void restoreRoomSession().then(() => requestRoomState())
    return () => {
      unsubscribeRoom()
      unsubscribeGame()
    }
  }, [code, navigate, playerId])

  useEffect(() => {
    if (deadlineAt === null) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [deadlineAt])

  const secondsLeft = useMemo(
    () => (deadlineAt === null ? null : Math.max(0, Math.ceil((deadlineAt - now) / 1_000))),
    [deadlineAt, now],
  )
  const currentPlayer = room?.players.find((player) => player.id === playerId)
  const isFinished = room?.phase === 'GAME_OVER'

  const chooseAnswer = (optionIndex: number): void => {
    if (!question || locked || reveal || busy) return
    setAnswer(optionIndex)
  }

  const lockAnswer = (): void => {
    if (!question || answer === null || locked || busy) return
    setBusy(true)
    void submitAnswer(question.id, answer)
      .catch((error: unknown) => setServerError(error instanceof Error ? error.message : 'Unable to submit that answer.'))
      .finally(() => setBusy(false))
  }

  const handleRematch = (): void => {
    if (busy) return
    setBusy(true)
    void rematch()
      .then((nextRoom) => navigate(`/lobby/${nextRoom.code}`))
      .catch((error: unknown) => setServerError(error instanceof Error ? error.message : 'Unable to start a rematch.'))
      .finally(() => setBusy(false))
  }

  if (!room) {
    return (
      <>
        <Decor variant="join" />
        <main className="qr-main">
          <div className="qr-container qr-container--narrow">
            <div className="qr-card qr-lobby__empty">
              <h1 className="qr-lobby__empty-title">Reconnecting to the game…</h1>
              <p className="qr-lobby__empty-text">Your private room session is being restored.</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  if (isFinished) {
    return (
      <>
        <Decor variant="join" />
        <main className="qr-main">
          <div className="qr-container qr-container--narrow">
            <PageHeading title={leaderboardTitle(leaderboard, playerId)} description={`Room ${room.code} · ${room.settings.questionCount} questions`} />
            <section className="qr-card qr-game__results" aria-labelledby="results-heading">
              <div className="qr-game__results-head">
                <h2 id="results-heading">Leaderboard</h2>
                <BoltIcon size={22} />
              </div>
              <ol className="qr-game__leaderboard">
                {leaderboard.map((entry) => (
                  <li key={entry.playerId} className={entry.playerId === playerId ? 'is-you' : undefined}>
                    <span className="qr-game__rank">{entry.rank}</span>
                    <span className="qr-game__player-name">{entry.nickname}{entry.playerId === playerId && <small>You</small>}</span>
                    <span className="qr-game__score">{entry.score}</span>
                  </li>
                ))}
              </ol>
              <div className="qr-form__actions">
                {currentPlayer?.isHost && <PrimaryButton onClick={handleRematch} loading={busy}>Play again</PrimaryButton>}
                <SecondaryButton to="/" icon={<XMarkIcon size={16} />}>Back to home</SecondaryButton>
              </div>
            </section>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Decor variant="join" />
      <main className="qr-main">
        <div className="qr-container qr-container--narrow">
          <PageHeading
            title={question ? `Question ${questionIndex + 1} of ${totalQuestions}` : 'Get ready!'}
            description={question ? `Room ${room.code} · ${secondsLeft ?? room.settings.secondsPerQuestion}s on the clock` : 'The host is opening the first question.'}
          />
          {serverError && <div className="qr-alert qr-alert--error" role="alert">{serverError}</div>}
          <section className="qr-card qr-game" aria-live="polite">
            {question ? (
              <>
                <div className="qr-game__status">
                  <span className="qr-badge qr-badge--primary"><BoltIcon size={13} /> Live round</span>
                  <strong>{secondsLeft === null ? '—' : `${secondsLeft}s`}</strong>
                </div>
                <h2 className="qr-game__question">{question.text}</h2>
                <div className="qr-game__options">
                  {question.options.map((option, index) => {
                    const isSelected = answer === index
                    const isCorrect = reveal?.correctIndex === index
                    const isWrong = reveal && isSelected && !isCorrect
                    return (
                      <button
                        key={`${question.id}-${index}`}
                        type="button"
                        className={[
                          'qr-answer',
                          isSelected && !reveal ? 'is-selected' : '',
                          isCorrect ? 'is-correct' : '',
                          isWrong ? 'is-wrong' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => chooseAnswer(index)}
                        disabled={locked || Boolean(reveal)}
                      >
                        <span className="qr-answer__letter">{String.fromCharCode(65 + index)}</span>
                        <span className="qr-answer__text">{option}</span>
                        {isCorrect && <CheckIcon size={15} />}
                      </button>
                    )
                  })}
                </div>
                <div className="qr-game__actions">
                  {reveal ? (
                    <p className="qr-game__result">Answer revealed — check the leaderboard for your score.</p>
                  ) : (
                    <PrimaryButton onClick={lockAnswer} disabled={answer === null || locked} loading={busy} trailing>
                      {locked ? 'Answer locked' : 'Lock answer'}
                    </PrimaryButton>
                  )}
                </div>
              </>
            ) : (
              <div className="qr-game__waiting">
                <BoltIcon size={28} />
                <h2>Get ready for the first question</h2>
                <p>Everyone sees the same question and deadline from the server.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
