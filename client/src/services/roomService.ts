import { io, type Socket } from 'socket.io-client'

export const CODE_LENGTH = 6
export const MAX_NICKNAME = 16
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

export type RoomSettings = {
  topic: string
  difficulty: string
  questionCount: number
  secondsPerQuestion: number
}

export type Player = {
  id: string
  nickname: string
  avatarId: string
  score: number
  correctAnswers: number
  answeredQuestions: number
  isHost: boolean
  ready: boolean
  connected: boolean
  disconnected: boolean
}

export type Room = {
  code: string
  createdAt: number
  hostId: string
  settings: RoomSettings
  phase: 'LOBBY' | 'COUNTDOWN' | 'QUESTION_OPEN' | 'QUESTION_RESULT' | 'GAME_OVER'
  players: Player[]
  currentQuestionIndex: number
  questionOpenedAt: number | null
  deadlineAt: number | null
}

export type CreateRoomInput = {
  nickname: string
  avatarId: string
  settings: RoomSettings
}

export type JoinRoomInput = {
  nickname: string
  avatarId: string
}

export type RoomSession = {
  room: Room
  player: Player
  reconnectToken: string
}

export type ClientError = {
  code: string
  message: string
  details?: unknown
}

type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: ClientError }

export type PublicQuestion = {
  id: string
  topic: string
  difficulty: string
  text: string
  options: [string, string, string, string]
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

export type GameQuestionOpen = {
  question: PublicQuestion
  questionIndex: number
  totalQuestions: number
  openedAt: number
  deadlineAt: number
}

export type GameEvent =
  | { type: 'countdown'; startsAt: number; seconds: number; totalQuestionCount: number }
  | ({ type: 'question-open' } & GameQuestionOpen)
  | { type: 'answer-locked'; playerId: string }
  | { type: 'answer-reveal'; questionId: string; correctIndex: number; entries: LeaderboardEntry[] }
  | { type: 'leaderboard'; entries: LeaderboardEntry[] }
  | { type: 'finished'; entries: LeaderboardEntry[] }

type ServerToClientEvents = {
  'room:state': (state: Room) => void
  'room:player-joined': (player: Player) => void
  'room:player-left': (payload: { playerId: string }) => void
  'room:host-changed': (payload: { hostId: string }) => void
  'game:countdown': (payload: { startsAt: number; seconds: number; totalQuestionCount: number }) => void
  'game:question-open': (payload: GameQuestionOpen) => void
  'game:answer-locked': (payload: { playerId: string }) => void
  'game:answer-reveal': (payload: { questionId: string; correctIndex: number; entries: LeaderboardEntry[] }) => void
  'game:leaderboard': (payload: { entries: LeaderboardEntry[] }) => void
  'game:finished': (payload: { entries: LeaderboardEntry[] }) => void
  'server:error': (error: ClientError) => void
}

type ClientToServerEvents = {
  'room:create': (payload: CreateRoomInput, ack: (response: Ack<RoomSession>) => void) => void
  'room:join': (
    payload: JoinRoomInput & { roomCode: string; reconnectToken?: string },
    ack: (response: Ack<RoomSession>) => void,
  ) => void
  'room:leave': (ack: (response: Ack<{ left: true }>) => void) => void
  'room:ready': (payload: { ready: boolean }, ack: (response: Ack<Room>) => void) => void
  'room:update-settings': (payload: RoomSettings, ack: (response: Ack<Room>) => void) => void
  'game:request-state': (ack: (response: Ack<Room>) => void) => void
  'game:start': (ack: (response: Ack<{ state: Room }>) => void) => void
  'answer:submit': (
    payload: { questionId: string; optionIndex: number },
    ack: (response: Ack<{ accepted: true }>) => void,
  ) => void
  'game:rematch': (ack: (response: Ack<{ state: Room }>) => void) => void
}

type QuizSocket = Socket<ServerToClientEvents, ClientToServerEvents>

type StoredSession = {
  roomCode: string
  playerId: string
  reconnectToken: string
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'
const SESSION_KEY = 'quizrush.session'

let socket: QuizSocket | null = null
let cachedRoom: Room | null = null
let session: StoredSession | null = readSession()
let restoring = false
let shouldRestore = Boolean(session)
let needsRestore = Boolean(session)

const roomListeners = new Set<(room: Room) => void>()
const gameListeners = new Set<(event: GameEvent) => void>()
const errorListeners = new Set<(error: ClientError) => void>()

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const stored = window.sessionStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as StoredSession
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function saveSession(next: StoredSession | null): void {
  session = next
  if (typeof window === 'undefined') return
  if (next) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  else window.sessionStorage.removeItem(SESSION_KEY)
}

function notifyRoom(room: Room): void {
  cachedRoom = room
  for (const listener of roomListeners) listener(room)
}

function notifyGame(event: GameEvent): void {
  for (const listener of gameListeners) listener(event)
}

function notifyError(error: ClientError): void {
  for (const listener of errorListeners) listener(error)
}

function bindSocket(next: QuizSocket): void {
  next.on('room:state', notifyRoom)
  next.on('game:countdown', (payload) => notifyGame({ type: 'countdown', ...payload }))
  next.on('game:question-open', (payload) => notifyGame({ type: 'question-open', ...payload }))
  next.on('game:answer-locked', (payload) => notifyGame({ type: 'answer-locked', ...payload }))
  next.on('game:answer-reveal', (payload) => notifyGame({ type: 'answer-reveal', ...payload }))
  next.on('game:leaderboard', (payload) => notifyGame({ type: 'leaderboard', ...payload }))
  next.on('game:finished', (payload) => notifyGame({ type: 'finished', ...payload }))
  next.on('server:error', notifyError)
  next.on('disconnect', () => {
    needsRestore = Boolean(session)
  })
  next.on('connect', () => {
    if (shouldRestore && needsRestore && session && !restoring) void restoreRoomSession()
  })
}

function ensureSocket(): Promise<void> {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
    bindSocket(socket)
  }
  if (socket.connected) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const handleConnect = () => {
      socket?.off('connect_error', handleError)
      resolve()
    }
    const handleError = (error: Error) => {
      socket?.off('connect', handleConnect)
      reject(error)
    }
    socket?.once('connect', handleConnect)
    socket?.once('connect_error', handleError)
    socket?.connect()
  })
}

function emitAck<T>(
  emit: (callback: (response: Ack<T>) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    emit((response) => {
      if (response.ok) resolve(response.data)
      else {
        notifyError(response.error)
        reject(new Error(response.error.message))
      }
    })
  })
}

function requireSocket(): QuizSocket {
  if (!socket) throw new Error('The QuizRush connection is not ready.')
  return socket
}

export function normalizeCode(raw: unknown = ''): string {
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH)
}

export function isCompleteCode(code: unknown): boolean {
  return normalizeCode(code).length === CODE_LENGTH
}

export function sanitizeNickname(raw: unknown = ''): string {
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, MAX_NICKNAME)
}

export async function createRoom({ nickname, avatarId, settings }: CreateRoomInput): Promise<{
  room: Room
  player: Player
}> {
  shouldRestore = false
  await ensureSocket()
  const result = await emitAck<RoomSession>((callback) => requireSocket().emit('room:create', { nickname, avatarId, settings }, callback))
  saveSession({ roomCode: result.room.code, playerId: result.player.id, reconnectToken: result.reconnectToken })
  shouldRestore = true
  needsRestore = false
  notifyRoom(result.room)
  return { room: result.room, player: result.player }
}

export async function joinRoom(
  rawCode: string,
  { nickname, avatarId }: JoinRoomInput,
): Promise<{ room: Room; player: Player }> {
  shouldRestore = false
  await ensureSocket()
  const roomCode = normalizeCode(rawCode)
  const reconnectToken = session?.roomCode === roomCode ? session.reconnectToken : undefined
  const result = await emitAck<RoomSession>((callback) =>
    requireSocket().emit('room:join', { roomCode, nickname, avatarId, reconnectToken }, callback),
  )
  saveSession({ roomCode: result.room.code, playerId: result.player.id, reconnectToken: result.reconnectToken })
  shouldRestore = true
  needsRestore = false
  notifyRoom(result.room)
  return { room: result.room, player: result.player }
}

export async function restoreRoomSession(): Promise<Room | null> {
  if (!session || restoring) return cachedRoom
  if (socket?.connected && !needsRestore && cachedRoom?.code === session.roomCode) return cachedRoom
  restoring = true
  try {
    shouldRestore = false
    await ensureSocket()
    const result = await emitAck<RoomSession>((callback) =>
      requireSocket().emit(
        'room:join',
        {
          roomCode: session!.roomCode,
          nickname: '',
          avatarId: '',
          reconnectToken: session!.reconnectToken,
        },
        callback,
      ),
    )
    saveSession({ roomCode: result.room.code, playerId: result.player.id, reconnectToken: result.reconnectToken })
    notifyRoom(result.room)
    shouldRestore = true
    needsRestore = false
    return result.room
  } catch {
    saveSession(null)
    cachedRoom = null
    shouldRestore = false
    return null
  } finally {
    restoring = false
  }
}

export async function leaveRoom(rawCode: unknown, playerId: string): Promise<void> {
  if (!socket?.connected || session?.roomCode !== normalizeCode(rawCode) || session.playerId !== playerId) {
    saveSession(null)
    cachedRoom = null
    return
  }
  await emitAck<{ left: true }>((callback) => requireSocket().emit('room:leave', callback))
  saveSession(null)
  cachedRoom = null
  shouldRestore = false
  needsRestore = false
  socket.disconnect()
}

export async function setReady(ready: boolean): Promise<Room> {
  await ensureSocket()
  return emitAck<Room>((callback) => requireSocket().emit('room:ready', { ready }, callback))
}

export async function updateRoomSettings(settings: RoomSettings): Promise<Room> {
  await ensureSocket()
  return emitAck<Room>((callback) => requireSocket().emit('room:update-settings', settings, callback))
}

export async function startGame(): Promise<Room> {
  await ensureSocket()
  const result = await emitAck<{ state: Room }>((callback) => requireSocket().emit('game:start', callback))
  notifyRoom(result.state)
  return result.state
}

export async function submitAnswer(questionId: string, optionIndex: number): Promise<void> {
  await ensureSocket()
  await emitAck<{ accepted: true }>((callback) =>
    requireSocket().emit('answer:submit', { questionId, optionIndex }, callback),
  )
}

export async function rematch(): Promise<Room> {
  await ensureSocket()
  const result = await emitAck<{ state: Room }>((callback) => requireSocket().emit('game:rematch', callback))
  notifyRoom(result.state)
  return result.state
}

export async function requestRoomState(): Promise<Room | null> {
  if (!session) return cachedRoom
  await ensureSocket()
  const room = await emitAck<Room>((callback) => requireSocket().emit('game:request-state', callback))
  notifyRoom(room)
  return room
}

export function getRoom(rawCode: unknown = ''): Room | null {
  return cachedRoom?.code === normalizeCode(rawCode) ? cachedRoom : null
}

export function getCurrentPlayerId(): string | null {
  return session?.playerId ?? null
}

export function subscribeRoomState(listener: (room: Room) => void): () => void {
  roomListeners.add(listener)
  if (cachedRoom) listener(cachedRoom)
  return () => roomListeners.delete(listener)
}

export function subscribeGameEvents(listener: (event: GameEvent) => void): () => void {
  gameListeners.add(listener)
  return () => gameListeners.delete(listener)
}

export function subscribeServerErrors(listener: (error: ClientError) => void): () => void {
  errorListeners.add(listener)
  return () => errorListeners.delete(listener)
}
