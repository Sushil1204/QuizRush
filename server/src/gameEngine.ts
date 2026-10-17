import { publicQuestion, type QuestionBank } from './questionBank.js'
import { MIN_PLAYERS, RoomManager } from './roomManager.js'
import type {
  AnswerRecord,
  AnswerSubmitResponse,
  GameAnswerRevealPayload,
  GameCountdownPayload,
  GameQuestionOpenPayload,
  LeaderboardEntry,
  PublicRoomState,
  RematchResponse,
  RoomRecord,
} from './types.js'

export type GameEvent =
  | { roomCode: string; name: 'game:countdown'; payload: GameCountdownPayload }
  | { roomCode: string; name: 'game:question-open'; payload: GameQuestionOpenPayload }
  | { roomCode: string; name: 'game:answer-locked'; payload: { playerId: string } }
  | { roomCode: string; name: 'game:answer-reveal'; payload: GameAnswerRevealPayload }
  | { roomCode: string; name: 'game:leaderboard'; payload: { entries: LeaderboardEntry[] } }
  | { roomCode: string; name: 'game:finished'; payload: { entries: LeaderboardEntry[] } }

export class GameEngineError extends Error {
  readonly code: string
  readonly details: unknown

  constructor(code: string, message: string, details: unknown = undefined) {
    super(message)
    this.name = 'GameEngineError'
    this.code = code
    this.details = details
  }
}

type Timer = ReturnType<typeof setTimeout>

export type GameEngineOptions = {
  now?: () => number
  schedule?: (callback: () => void, delayMs: number) => Timer
  cancel?: (timer: Timer) => void
  countdownMs?: number
  resultMs?: number
  onEvent?: (event: GameEvent) => void
}

export class GameEngine {
  private readonly now: () => number
  private readonly schedule: (callback: () => void, delayMs: number) => Timer
  private readonly cancel: (timer: Timer) => void
  private readonly countdownMs: number
  private readonly resultMs: number
  private onEvent: (event: GameEvent) => void
  private readonly timers = new Map<string, Set<Timer>>()

  constructor(
    private readonly manager: RoomManager,
    private readonly questionBank: QuestionBank,
    options: GameEngineOptions = {},
  ) {
    this.now = options.now ?? Date.now
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs))
    this.cancel = options.cancel ?? ((timer) => clearTimeout(timer))
    this.countdownMs = options.countdownMs ?? 3_000
    this.resultMs = options.resultMs ?? 1_500
    this.onEvent = options.onEvent ?? (() => undefined)
  }

  setEventHandler(handler: (event: GameEvent) => void): void {
    this.onEvent = handler
  }

  start(roomCode: string, playerId: string): PublicRoomState {
    const room = this.manager.requireMembership(roomCode, playerId)
    if (room.hostId !== playerId) throw new GameEngineError('HOST_ONLY', 'Only the host can start the game.')
    if (room.phase !== 'LOBBY') throw new GameEngineError('GAME_ALREADY_STARTED', 'This room already has a game in progress.')

    const eligible = [...room.players.values()].filter((player) => player.connected)
    if (eligible.length < MIN_PLAYERS) {
      throw new GameEngineError('MIN_PLAYERS', `At least ${MIN_PLAYERS} connected players are required to start.`)
    }

    const questions = this.questionBank.select(
      room.settings.topic,
      room.settings.difficulty,
      room.settings.questionCount,
    )
    this.clearRoomTimers(room.code)
    room.questions = questions
    room.currentQuestionIndex = -1
    room.questionOpenedAt = null
    room.deadlineAt = null
    room.game = {
      questions,
      currentQuestionIndex: -1,
      eligiblePlayerIds: new Set(eligible.map((player) => player.id)),
      answers: new Map(),
    }
    room.phase = 'COUNTDOWN'
    room.lastActivityAt = this.now()

    this.emit(room.code, 'game:countdown', {
      startsAt: this.now() + this.countdownMs,
      seconds: Math.ceil(this.countdownMs / 1_000),
      totalQuestionCount: questions.length,
    })
    this.scheduleRoom(room.code, () => this.openQuestion(room.code))
    return this.manager.snapshotByCode(room.code)
  }

  submitAnswer(roomCode: string, playerId: string, questionId: string, optionIndex: number): AnswerSubmitResponse {
    const room = this.manager.requireMembership(roomCode, playerId)
    if (room.phase !== 'QUESTION_OPEN' || !room.game) {
      throw new GameEngineError('QUESTION_NOT_OPEN', 'Answers are only accepted while a question is open.')
    }
    const question = room.game.questions[room.game.currentQuestionIndex]
    if (!question || question.id !== questionId) {
      throw new GameEngineError('STALE_QUESTION', 'That question is no longer active.')
    }
    if (!room.game.eligiblePlayerIds.has(playerId)) {
      throw new GameEngineError('PLAYER_NOT_ELIGIBLE', 'You were not connected when this question opened.')
    }
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) {
      throw new GameEngineError('INVALID_OPTION', 'Choose one of the four available answers.')
    }
    if (room.game.answers.has(playerId)) {
      throw new GameEngineError('DUPLICATE_ANSWER', 'Your answer for this question is already locked.')
    }
    const deadlineAt = room.deadlineAt
    if (deadlineAt === null || this.now() >= deadlineAt) {
      this.closeQuestion(room.code)
      throw new GameEngineError('ANSWER_LATE', 'That answer arrived after the question closed.')
    }

    const correct = question.correctIndex === optionIndex
    const points = correct ? this.score(this.now(), room.questionOpenedAt ?? this.now(), deadlineAt) : 0
    const answer: AnswerRecord = {
      playerId,
      questionId,
      optionIndex,
      submittedAt: this.now(),
      correct,
      points,
    }
    room.game.answers.set(playerId, answer)
    const player = room.players.get(playerId)
    if (!player) throw new GameEngineError('NOT_ROOM_MEMBER', 'You are not a member of this room.')
    player.answeredQuestions += 1
    player.score += points
    if (correct) player.correctAnswers += 1
    room.lastActivityAt = this.now()
    this.emit(room.code, 'game:answer-locked', { playerId })

    if (this.allEligiblePlayersAnswered(room)) this.closeQuestion(room.code)
    return { accepted: true }
  }

  rematch(roomCode: string, playerId: string): RematchResponse {
    const room = this.manager.requireMembership(roomCode, playerId)
    if (room.hostId !== playerId) throw new GameEngineError('HOST_ONLY', 'Only the host can start a rematch.')
    if (room.phase !== 'GAME_OVER') throw new GameEngineError('GAME_NOT_OVER', 'The current game has not finished yet.')
    this.clearRoomTimers(room.code)
    room.phase = 'LOBBY'
    room.questions = []
    room.game = null
    room.currentQuestionIndex = -1
    room.questionOpenedAt = null
    room.deadlineAt = null
    for (const player of room.players.values()) {
      player.score = 0
      player.correctAnswers = 0
      player.answeredQuestions = 0
      player.ready = player.id === room.hostId
    }
    room.lastActivityAt = this.now()
    return { state: this.manager.snapshotByCode(room.code) }
  }

  playerRemoved(roomCode: string, playerId: string): void {
    const room = this.manager.get(roomCode)
    if (!room?.game) return
    room.game.eligiblePlayerIds.delete(playerId)
    if (room.phase === 'QUESTION_OPEN' && this.allEligiblePlayersAnswered(room)) this.closeQuestion(room.code)
  }

  disposeRoom(roomCode: string): void {
    this.clearRoomTimers(roomCode)
    this.timers.delete(roomCode)
  }

  private openQuestion(roomCode: string): void {
    const room = this.manager.get(roomCode)
    if (!room?.game || room.phase !== 'COUNTDOWN' && room.phase !== 'QUESTION_RESULT') return
    const nextIndex = room.game.currentQuestionIndex + 1
    const question = room.game.questions[nextIndex]
    if (!question) {
      this.finish(room)
      return
    }
    const openedAt = this.now()
    const deadlineAt = openedAt + room.settings.secondsPerQuestion * 1_000
    room.game.currentQuestionIndex = nextIndex
    room.game.answers = new Map()
    room.currentQuestionIndex = nextIndex
    room.phase = 'QUESTION_OPEN'
    room.questionOpenedAt = openedAt
    room.deadlineAt = deadlineAt
    room.lastActivityAt = openedAt
    this.emit(room.code, 'game:question-open', {
      question: publicQuestion(question),
      questionIndex: nextIndex,
      totalQuestions: room.game.questions.length,
      openedAt,
      deadlineAt,
    })
    this.scheduleRoom(room.code, () => this.closeQuestion(room.code), room.settings.secondsPerQuestion * 1_000)
  }

  private closeQuestion(roomCode: string): void {
    const room = this.manager.get(roomCode)
    if (!room?.game || room.phase !== 'QUESTION_OPEN') return
    const question = room.game.questions[room.game.currentQuestionIndex]
    if (!question) return
    room.phase = 'QUESTION_RESULT'
    room.lastActivityAt = this.now()
    const entries = this.leaderboard(room)
    this.emit(room.code, 'game:answer-reveal', {
      questionId: question.id,
      correctIndex: question.correctIndex,
      entries,
    })
    this.emit(room.code, 'game:leaderboard', { entries })
    if (room.game.currentQuestionIndex + 1 >= room.game.questions.length) {
      this.scheduleRoom(room.code, () => this.finish(room), this.resultMs)
    } else {
      this.scheduleRoom(room.code, () => this.openQuestion(room.code), this.resultMs)
    }
  }

  private finish(room: RoomRecord): void {
    if (room.phase === 'GAME_OVER') return
    room.phase = 'GAME_OVER'
    room.questionOpenedAt = null
    room.deadlineAt = null
    room.lastActivityAt = this.now()
    const entries = this.leaderboard(room)
    this.emit(room.code, 'game:finished', { entries })
    this.emit(room.code, 'game:leaderboard', { entries })
  }

  private allEligiblePlayersAnswered(room: RoomRecord): boolean {
    if (!room.game) return false
    for (const playerId of room.game.eligiblePlayerIds) {
      if (room.players.has(playerId) && !room.game.answers.has(playerId)) return false
    }
    return room.game.eligiblePlayerIds.size > 0
  }

  private leaderboard(room: RoomRecord): LeaderboardEntry[] {
    const players = [...room.players.values()].sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (right.correctAnswers !== left.correctAnswers) return right.correctAnswers - left.correctAnswers
      const nicknameOrder = left.nickname.localeCompare(right.nickname, 'en', { sensitivity: 'base' })
      return nicknameOrder || left.id.localeCompare(right.id)
    })
    return players.map((player, index) => ({
      playerId: player.id,
      nickname: player.nickname,
      avatarId: player.avatarId,
      score: player.score,
      rank: index + 1,
      correctAnswers: player.correctAnswers,
      answeredQuestions: player.answeredQuestions,
      accuracy: player.answeredQuestions === 0 ? 0 : Math.round((player.correctAnswers / player.answeredQuestions) * 100),
    }))
  }

  private score(now: number, openedAt: number, deadlineAt: number): number {
    const totalTimeMs = Math.max(1, deadlineAt - openedAt)
    const remainingTimeMs = Math.max(0, deadlineAt - now)
    return Math.min(1_000, Math.max(500, 500 + Math.floor((500 * remainingTimeMs) / totalTimeMs)))
  }

  private emit(roomCode: string, name: GameEvent['name'], payload: GameEvent['payload']): void {
    this.onEvent({ roomCode, name, payload } as GameEvent)
  }

  private scheduleRoom(roomCode: string, callback: () => void, delayMs = this.countdownMs): void {
    const timer = this.schedule(() => {
      this.timers.get(roomCode)?.delete(timer)
      callback()
    }, delayMs)
    const roomTimers = this.timers.get(roomCode) ?? new Set<Timer>()
    roomTimers.add(timer)
    this.timers.set(roomCode, roomTimers)
  }

  private clearRoomTimers(roomCode: string): void {
    const roomTimers = this.timers.get(roomCode)
    if (!roomTimers) return
    for (const timer of roomTimers) this.cancel(timer)
    roomTimers.clear()
    this.timers.delete(roomCode)
  }
}
