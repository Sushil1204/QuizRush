import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameEngine, type GameEvent } from '../src/gameEngine.js'
import { loadQuestionBank } from '../src/questionBank.js'
import { RoomManager } from '../src/roomManager.js'
import type { RoomSettings } from '../src/types.js'

const bankPath = fileURLToPath(new URL('../bank/question-bank.json', import.meta.url))
const settings: RoomSettings = {
  topic: 'science',
  difficulty: 'easy',
  questionCount: 5,
  secondsPerQuestion: 10,
}

afterEach(() => {
  vi.useRealTimers()
})

async function setup() {
  vi.useFakeTimers()
  const questionBank = await loadQuestionBank(bankPath)
  const manager = new RoomManager(questionBank)
  const events: GameEvent[] = []
  const engine = new GameEngine(manager, questionBank, {
    countdownMs: 100,
    resultMs: 50,
    onEvent: (event) => events.push(event),
  })
  const host = manager.create({ nickname: 'Host', avatarId: 'cool', settings })
  const guest = manager.join({ roomCode: host.room.code, nickname: 'Guest', avatarId: 'cat' })
  return { manager, engine, events, host, guest }
}

describe('GameEngine', () => {
  it('requires the host and minimum player count before starting', async () => {
    vi.useFakeTimers()
    const questionBank = await loadQuestionBank(bankPath)
    const manager = new RoomManager(questionBank)
    const engine = new GameEngine(manager, questionBank)
    const host = manager.create({ nickname: 'Host', avatarId: 'cool', settings })

    expect(() => engine.start(host.room.code, host.player.id)).toThrowError(
      expect.objectContaining({ code: 'MIN_PLAYERS' }),
    )
    const guest = manager.join({ roomCode: host.room.code, nickname: 'Guest', avatarId: 'cat' })
    expect(() => engine.start(host.room.code, guest.player.id)).toThrowError(
      expect.objectContaining({ code: 'HOST_ONLY' }),
    )
    vi.useRealTimers()
  })

  it('opens a public question without leaking its correct answer', async () => {
    const { engine, events, host, guest } = await setup()
    const state = engine.start(host.room.code, host.player.id)
    expect(state.phase).toBe('COUNTDOWN')
    expect(events[0]?.name).toBe('game:countdown')

    vi.advanceTimersByTime(100)
    const opened = events.find((event) => event.name === 'game:question-open')
    expect(opened?.name).toBe('game:question-open')
    if (opened?.name !== 'game:question-open') throw new Error('Question did not open')
    expect(opened.payload.question).not.toHaveProperty('correctIndex')
    expect(opened.payload.question.options).toHaveLength(4)
    expect(opened.payload.questionIndex).toBe(0)
    expect(opened.payload.deadlineAt).toBe(opened.payload.openedAt + 10_000)

    expect(() => engine.submitAnswer(host.room.code, guest.player.id, 'stale-id', 0)).toThrowError(
      expect.objectContaining({ code: 'STALE_QUESTION' }),
    )
    vi.useRealTimers()
  })

  it('scores correct answers authoritatively and rejects duplicates', async () => {
    const { manager, engine, events, host, guest } = await setup()
    engine.start(host.room.code, host.player.id)
    vi.advanceTimersByTime(100)
    const opened = events.find((event) => event.name === 'game:question-open')
    if (opened?.name !== 'game:question-open') throw new Error('Question did not open')
    const room = manager.get(host.room.code)
    const question = room?.questions[0]
    if (!question) throw new Error('Question missing')

    const accepted = engine.submitAnswer(host.room.code, host.player.id, question.id, question.correctIndex)
    expect(accepted).toEqual({ accepted: true })
    expect(() => engine.submitAnswer(host.room.code, host.player.id, question.id, question.correctIndex)).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_ANSWER' }),
    )
    vi.advanceTimersByTime(1)
    engine.submitAnswer(host.room.code, guest.player.id, question.id, (question.correctIndex + 1) % 4)
    const reveal = events.find((event) => event.name === 'game:answer-reveal')
    expect(reveal?.name).toBe('game:answer-reveal')
    const hostEntry = reveal?.name === 'game:answer-reveal'
      ? reveal.payload.entries.find((entry) => entry.playerId === host.player.id)
      : undefined
    const guestEntry = reveal?.name === 'game:answer-reveal'
      ? reveal.payload.entries.find((entry) => entry.playerId === guest.player.id)
      : undefined
    expect(hostEntry?.score).toBe(1000)
    expect(hostEntry?.correctAnswers).toBe(1)
    expect(guestEntry?.score).toBe(0)
    expect(reveal?.name === 'game:answer-reveal' ? reveal.payload.correctIndex : undefined).toBe(question.correctIndex)
    vi.useRealTimers()
  })

  it('closes unanswered questions on the server deadline and rejects late answers', async () => {
    const { manager, engine, events, host, guest } = await setup()
    engine.start(host.room.code, host.player.id)
    vi.advanceTimersByTime(100)
    const question = manager.get(host.room.code)?.questions[0]
    if (!question) throw new Error('Question missing')
    vi.advanceTimersByTime(10_000)
    expect(events.some((event) => event.name === 'game:answer-reveal')).toBe(true)
    expect(() => engine.submitAnswer(host.room.code, guest.player.id, question.id, 0)).toThrowError(
      expect.objectContaining({ code: 'QUESTION_NOT_OPEN' }),
    )
    vi.useRealTimers()
  })

  it('finishes a full match and supports a host rematch', async () => {
    const { manager, engine, events, host, guest } = await setup()
    engine.start(host.room.code, host.player.id)
    for (let index = 0; index < settings.questionCount; index += 1) {
      vi.advanceTimersByTime(index === 0 ? 100 : 50)
      const room = manager.get(host.room.code)
      const question = room?.questions[index]
      if (!question) throw new Error(`Question ${index} missing`)
      engine.submitAnswer(host.room.code, host.player.id, question.id, question.correctIndex)
      engine.submitAnswer(host.room.code, guest.player.id, question.id, question.correctIndex)
    }
    vi.advanceTimersByTime(50)
    expect(manager.snapshotByCode(host.room.code).phase).toBe('GAME_OVER')
    expect(events.some((event) => event.name === 'game:finished')).toBe(true)
    expect(engine.rematch(host.room.code, host.player.id).state.phase).toBe('LOBBY')
    expect(manager.snapshotByCode(host.room.code).players.every((player) => player.score === 0)).toBe(true)
    vi.useRealTimers()
  })

  it('keeps leaderboard ties deterministic', async () => {
    const { manager, engine, events, host, guest } = await setup()
    engine.start(host.room.code, host.player.id)
    vi.advanceTimersByTime(100)
    const room = manager.get(host.room.code)
    if (!room?.game) throw new Error('Game missing')
    const question = room.questions[0]
    if (!question) throw new Error('Question missing')
    engine.submitAnswer(host.room.code, host.player.id, question.id, (question.correctIndex + 1) % 4)
    engine.submitAnswer(host.room.code, guest.player.id, question.id, (question.correctIndex + 1) % 4)
    const reveal = events.find((event) => event.name === 'game:answer-reveal')
    expect(reveal?.name).toBe('game:answer-reveal')
    if (reveal?.name !== 'game:answer-reveal') return
    expect(reveal.payload.entries.map((entry) => entry.nickname)).toEqual(['Guest', 'Host'])
  })
})
