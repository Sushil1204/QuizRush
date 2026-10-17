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
}

export type ServerToClientEvents = {
  'room:state': (state: PublicRoomState) => void
  'room:player-joined': (player: PublicPlayer) => void
  'room:player-left': (payload: { playerId: string }) => void
  'room:host-changed': (payload: { hostId: string }) => void
  'server:error': (error: ClientError) => void
}

export type SocketData = {
  roomCode?: string
  playerId?: string
  reconnectToken?: string
}
