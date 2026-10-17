import type { Difficulty, QuestionRecord, RequestTopic } from './questionBank.js'

export const ROOM_PHASES = [
  'LOBBY',
  'COUNTDOWN',
  'QUESTION_OPEN',
  'QUESTION_RESULT',
  'GAME_OVER',
] as const

export type RoomPhase = (typeof ROOM_PHASES)[number]

export type RoomSettings = {
  topic: RequestTopic
  difficulty: Difficulty
  questionCount: 5 | 10 | 15
  secondsPerQuestion: 10 | 15 | 20 | 30
}

export type PlayerRecord = {
  id: string
  nickname: string
  avatarId: string
  score: number
  correctAnswers: number
  answeredQuestions: number
  isHost: boolean
  ready: boolean
  connected: boolean
  disconnectedAt: number | null
}

export type RoomRecord = {
  code: string
  createdAt: number
  lastActivityAt: number
  hostId: string
  settings: RoomSettings
  phase: RoomPhase
  players: Map<string, PlayerRecord>
  questions: QuestionRecord[]
  currentQuestionIndex: number
  questionOpenedAt: number | null
  deadlineAt: number | null
  game: GameRecord | null
}

export type AnswerRecord = {
  playerId: string
  questionId: string
  optionIndex: number
  submittedAt: number
  correct: boolean
  points: number
}

export type GameRecord = {
  questions: QuestionRecord[]
  currentQuestionIndex: number
  eligiblePlayerIds: Set<string>
  answers: Map<string, AnswerRecord>
}

export type PublicPlayer = Omit<PlayerRecord, 'disconnectedAt'> & {
  disconnected: boolean
}

export type PublicRoomState = {
  code: string
  createdAt: number
  hostId: string
  settings: RoomSettings
  phase: RoomPhase
  players: PublicPlayer[]
  currentQuestionIndex: number
  questionOpenedAt: number | null
  deadlineAt: number | null
}

export type RoomSession = {
  room: PublicRoomState
  player: PublicPlayer
  reconnectToken: string
}

export type ClientError = {
  code: string
  message: string
  details?: unknown
}

export type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: ClientError }

export type RoomCreatePayload = {
  nickname: string
  avatarId: string
  settings: RoomSettings
}

export type RoomJoinPayload = {
  roomCode: string
  nickname: string
  avatarId: string
  reconnectToken?: string
}

export type RoomReadyPayload = {
  ready: boolean
}

export type RoomUpdateSettingsPayload = RoomSettings

export type ClientToServerEvents = {
  'room:create': (
    payload: RoomCreatePayload,
    ack: (response: Ack<RoomSession>) => void,
  ) => void
  'room:join': (
    payload: RoomJoinPayload,
    ack: (response: Ack<RoomSession>) => void,
  ) => void
  'room:leave': (ack: (response: Ack<{ left: true }>) => void) => void
  'room:ready': (
    payload: RoomReadyPayload,
    ack: (response: Ack<PublicRoomState>) => void,
  ) => void
  'room:update-settings': (
    payload: RoomUpdateSettingsPayload,
    ack: (response: Ack<PublicRoomState>) => void,
  ) => void
  'game:request-state': (ack: (response: Ack<PublicRoomState>) => void) => void
  'game:start': (ack: (response: Ack<GameStartResponse>) => void) => void
  'answer:submit': (
    payload: AnswerSubmitPayload,
    ack: (response: Ack<AnswerSubmitResponse>) => void,
  ) => void
  'game:rematch': (ack: (response: Ack<RematchResponse>) => void) => void
}

export type ServerToClientEvents = {
  'room:state': (state: PublicRoomState) => void
  'room:player-joined': (player: PublicPlayer) => void
  'room:player-left': (payload: { playerId: string }) => void
  'room:host-changed': (payload: { hostId: string }) => void
  'game:countdown': (payload: GameCountdownPayload) => void
  'game:question-open': (payload: GameQuestionOpenPayload) => void
  'game:answer-locked': (payload: { playerId: string }) => void
  'game:answer-reveal': (payload: GameAnswerRevealPayload) => void
  'game:leaderboard': (payload: { entries: LeaderboardEntry[] }) => void
  'game:finished': (payload: { entries: LeaderboardEntry[] }) => void
  'server:error': (error: ClientError) => void
}

export type GameCountdownPayload = {
  startsAt: number
  seconds: number
  totalQuestionCount: number
}

export type PublicQuestion = {
  id: string
  topic: string
  difficulty: string
  text: string
  options: [string, string, string, string]
}

export type GameQuestionOpenPayload = {
  question: PublicQuestion
  questionIndex: number
  totalQuestions: number
  openedAt: number
  deadlineAt: number
}

export type LeaderboardEntry = {
  playerId: string
  nickname: string
  avatarId: string
  score: number
  rank: number
  correctAnswers: number
  answeredQuestions: number
  accuracy: number
}

export type GameAnswerRevealPayload = {
  questionId: string
  correctIndex: number
  entries: LeaderboardEntry[]
}

export type GameStartResponse = {
  state: PublicRoomState
}

export type AnswerSubmitPayload = {
  questionId: string
  optionIndex: number
}

export type AnswerSubmitResponse = {
  accepted: true
}

export type RematchResponse = {
  state: PublicRoomState
}

export type SocketData = {
  roomCode?: string
  playerId?: string
  reconnectToken?: string
}
