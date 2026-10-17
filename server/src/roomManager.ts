import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import {
  type QuestionBank,
  type RequestTopic,
  type Difficulty,
} from './questionBank.js'
import type {
  PlayerRecord,
  PublicPlayer,
  PublicRoomState,
  RoomCreatePayload,
  RoomJoinPayload,
  RoomRecord,
  RoomSession,
  RoomSettings,
} from './types.js'

export const MAX_PLAYERS = 12
export const MIN_PLAYERS = 2
export const MAX_NICKNAME = 16
export const ROOM_CODE_LENGTH = 6
export const DEFAULT_ROOM_EXPIRY_MS = 60 * 60 * 1000

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type RoomManagerOptions = {
  questionBank: QuestionBank
  now?: () => number
  roomExpiryMs?: number
  disconnectGraceMs?: number
  createToken?: () => string
  createId?: () => string
}

export class RoomManagerError extends Error {
  readonly code: string
  readonly details: unknown

  constructor(code: string, message: string, details: unknown = undefined) {
    super(message)
    this.name = 'RoomManagerError'
    this.code = code
    this.details = details
  }
}

function normalizeRoomCode(value: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH)
}

function sanitizeNickname(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NICKNAME)
}

function defaultToken(): string {
  return randomBytes(32).toString('base64url')
}

function defaultId(): string {
  return randomUUID()
}

function newRoomCode(rooms: Map<string, RoomRecord>): string {
  let code = ''
  do {
    code = Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join('')
  } while (rooms.has(code))
  return code
}

export function cloneSettings(settings: RoomSettings): RoomSettings {
  return { ...settings }
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomRecord>()
  private readonly now: () => number
  private readonly roomExpiryMs: number
  private readonly disconnectGraceMs: number
  private readonly createToken: () => string
  private readonly createId: () => string
  private readonly reconnectTokens = new Map<string, { roomCode: string; playerId: string; expiresAt: number }>()

  constructor(private readonly questionBank: QuestionBank, options: Omit<RoomManagerOptions, 'questionBank'> = {}) {
    this.now = options.now ?? Date.now
    this.roomExpiryMs = options.roomExpiryMs ?? DEFAULT_ROOM_EXPIRY_MS
    this.disconnectGraceMs = options.disconnectGraceMs ?? 30_000
    this.createToken = options.createToken ?? defaultToken
    this.createId = options.createId ?? defaultId
  }

  create(payload: RoomCreatePayload): RoomSession {
    const nickname = sanitizeNickname(payload.nickname)
    if (!nickname) {
      throw new RoomManagerError('NICKNAME_INVALID', 'Give yourself a nickname before creating a room.')
    }
    const now = this.now()
    const code = newRoomCode(this.rooms)
    const player = this.makePlayer(nickname, payload.avatarId, true)
    const room: RoomRecord = {
      code,
      createdAt: now,
      lastActivityAt: now,
      hostId: player.id,
      settings: cloneSettings(payload.settings),
      phase: 'LOBBY',
      players: new Map([[player.id, player]]),
      questions: [],
      currentQuestionIndex: -1,
      questionOpenedAt: null,
      deadlineAt: null,
      game: null,
    }
    this.rooms.set(code, room)
    const reconnectToken = this.issueReconnectToken(room, player.id)
    return { room: this.snapshot(room), player: this.publicPlayer(player), reconnectToken }
  }

  join(payload: RoomJoinPayload): RoomSession {
    const code = normalizeRoomCode(payload.roomCode)
    if (code.length !== ROOM_CODE_LENGTH) {
      throw new RoomManagerError('INVALID_ROOM_CODE', 'Enter the full 6-character room code from the host.')
    }
    const room = this.rooms.get(code)
    if (!room) {
      throw new RoomManagerError('ROOM_NOT_FOUND', "We couldn't find that room. Check the host's code and try again.")
    }
    this.assertNotExpired(room)
    if (payload.reconnectToken) {
      const reconnect = this.reconnectTokens.get(payload.reconnectToken)
      if (!reconnect || reconnect.roomCode !== room.code || (reconnect.expiresAt !== 0 && reconnect.expiresAt < this.now())) {
        throw new RoomManagerError('RECONNECT_INVALID', 'That reconnect session is no longer valid.')
      }
      const player = room.players.get(reconnect.playerId)
      if (!player || player.connected) {
        throw new RoomManagerError('DUPLICATE_CONNECTION', 'That player is already connected in this room.')
      }
      player.connected = true
      player.disconnectedAt = null
      reconnect.expiresAt = 0
      room.lastActivityAt = this.now()
      return {
        room: this.snapshot(room),
        player: this.publicPlayer(player),
        reconnectToken: payload.reconnectToken,
      }
    }
    if (room.phase !== 'LOBBY') {
      throw new RoomManagerError('GAME_ALREADY_STARTED', 'This room has already started a game.')
    }
    if (room.players.size >= MAX_PLAYERS) {
      throw new RoomManagerError('ROOM_FULL', `This room is full — ${MAX_PLAYERS} players max.`)
    }
    const nickname = sanitizeNickname(payload.nickname)
    if (!nickname) {
      throw new RoomManagerError('NICKNAME_INVALID', 'Your nickname cannot be empty.')
    }
    const duplicate = [...room.players.values()].find(
      (player) => player.connected && player.nickname.toLocaleLowerCase() === nickname.toLocaleLowerCase(),
    )
    if (duplicate) {
      throw new RoomManagerError('DUPLICATE_CONNECTION', 'That nickname is already connected in this room.')
    }
    const player = this.makePlayer(nickname, payload.avatarId, false)
    room.players.set(player.id, player)
    room.lastActivityAt = this.now()
    const reconnectToken = this.issueReconnectToken(room, player.id)
    return { room: this.snapshot(room), player: this.publicPlayer(player), reconnectToken }
  }

  leave(roomCode: string, playerId: string): { player: PublicPlayer; hostChanged: string | null; deleted: boolean } {
    const room = this.requireRoom(roomCode)
    const player = this.requirePlayer(room, playerId)
    room.players.delete(playerId)
    this.deleteReconnectTokens(roomCode, playerId)
    const hostChanged = this.transferHostIfNeeded(room)
    room.lastActivityAt = this.now()
    const deleted = room.players.size === 0
    if (deleted) this.rooms.delete(room.code)
    return { player: this.publicPlayer(player), hostChanged, deleted }
  }

  setReady(roomCode: string, playerId: string, ready: boolean): PublicRoomState {
    const room = this.requireRoom(roomCode)
    const player = this.requirePlayer(room, playerId)
    if (room.phase !== 'LOBBY') {
      throw new RoomManagerError('GAME_ALREADY_STARTED', 'Ready status cannot change after the game starts.')
    }
    player.ready = ready
    room.lastActivityAt = this.now()
    return this.snapshot(room)
  }

  updateSettings(roomCode: string, playerId: string, settings: RoomSettings): PublicRoomState {
    const room = this.requireRoom(roomCode)
    this.assertHost(room, playerId)
    if (room.phase !== 'LOBBY') {
      throw new RoomManagerError('GAME_ALREADY_STARTED', 'Room settings cannot change after the game starts.')
    }
    this.questionBank.select(settings.topic, settings.difficulty, settings.questionCount)
    room.settings = cloneSettings(settings)
    room.lastActivityAt = this.now()
    return this.snapshot(room)
  }

  get(roomCode: string): RoomRecord | null {
    const room = this.rooms.get(normalizeRoomCode(roomCode)) ?? null
    if (!room) return null
    this.assertNotExpired(room)
    return room
  }

  snapshotByCode(roomCode: string): PublicRoomState {
    return this.snapshot(this.requireRoom(roomCode))
  }

  requireMembership(roomCode: string, playerId: string): RoomRecord {
    const room = this.requireRoom(roomCode)
    this.requirePlayer(room, playerId)
    return room
  }

  markDisconnected(roomCode: string, playerId: string): void {
    const room = this.get(roomCode)
    if (!room) return
    const player = room.players.get(playerId)
    if (!player) return
    player.connected = false
    player.disconnectedAt = this.now()
    for (const token of this.reconnectTokens.values()) {
      if (token.roomCode === room.code && token.playerId === playerId) token.expiresAt = this.now() + this.disconnectGraceMs
    }
    room.lastActivityAt = this.now()
  }

  expireRooms(): string[] {
    const expired: string[] = []
    const now = this.now()
    const cutoff = now - this.roomExpiryMs
    for (const [code, room] of this.rooms) {
      for (const player of room.players.values()) {
        if (player.disconnectedAt !== null && player.disconnectedAt + this.disconnectGraceMs <= now) {
          room.players.delete(player.id)
          this.deleteReconnectTokens(code, player.id)
        }
      }
      this.transferHostIfNeeded(room)
      if (room.players.size === 0) {
        expired.push(code)
        this.rooms.delete(code)
        continue
      }
      if (room.lastActivityAt < cutoff) {
        expired.push(code)
        this.rooms.delete(code)
        for (const player of room.players.values()) this.deleteReconnectTokens(code, player.id)
      }
    }
    return expired
  }

  cleanupExpired(): string[] {
    return this.expireRooms()
  }

  roomCount(): number {
    return this.rooms.size
  }

  private makePlayer(nickname: string, avatarId: string, isHost: boolean): PlayerRecord {
    return {
      id: this.createId(),
      nickname,
      avatarId,
      score: 0,
      correctAnswers: 0,
      answeredQuestions: 0,
      isHost,
      ready: isHost,
      connected: true,
      disconnectedAt: null,
    }
  }

  private issueReconnectToken(room: RoomRecord, playerId: string): string {
    const token = this.createToken()
    this.reconnectTokens.set(token, {
      roomCode: room.code,
      playerId,
      expiresAt: 0,
    })
    return token
  }

  private deleteReconnectTokens(roomCode: string, playerId: string): void {
    for (const [token, value] of this.reconnectTokens) {
      if (value.roomCode === roomCode && value.playerId === playerId) this.reconnectTokens.delete(token)
    }
  }

  private assertNotExpired(room: RoomRecord): void {
    if (room.lastActivityAt < this.now() - this.roomExpiryMs) {
      this.rooms.delete(room.code)
      throw new RoomManagerError('ROOM_EXPIRED', 'This room has expired. Create a new room to keep playing.')
    }
  }

  private requireRoom(roomCode: string): RoomRecord {
    const normalized = normalizeRoomCode(roomCode)
    const room = this.rooms.get(normalized)
    if (!room) throw new RoomManagerError('ROOM_NOT_FOUND', 'That room is no longer available.')
    this.assertNotExpired(room)
    return room
  }

  private requirePlayer(room: RoomRecord, playerId: string): PlayerRecord {
    const player = room.players.get(playerId)
    if (!player) throw new RoomManagerError('NOT_ROOM_MEMBER', 'You are not a member of this room.')
    return player
  }

  private assertHost(room: RoomRecord, playerId: string): void {
    if (room.hostId !== playerId) throw new RoomManagerError('HOST_ONLY', 'Only the host can change room settings.')
  }

  private transferHostIfNeeded(room: RoomRecord): string | null {
    if (!room.players.has(room.hostId)) {
      const nextHost = [...room.players.values()].find((player) => player.connected) ?? [...room.players.values()][0]
      if (!nextHost) return null
      room.hostId = nextHost.id
    }
    for (const player of room.players.values()) player.isHost = player.id === room.hostId
    return room.hostId
  }

  private publicPlayer(player: PlayerRecord): PublicPlayer {
    const { disconnectedAt, ...rest } = player
    return { ...rest, disconnected: disconnectedAt !== null || !player.connected }
  }

  private snapshot(room: RoomRecord): PublicRoomState {
    return {
      code: room.code,
      createdAt: room.createdAt,
      hostId: room.hostId,
      settings: cloneSettings(room.settings),
      phase: room.phase,
      players: [...room.players.values()].map((player) => this.publicPlayer(player)),
      currentQuestionIndex: room.currentQuestionIndex,
      questionOpenedAt: room.questionOpenedAt,
      deadlineAt: room.deadlineAt,
    }
  }
}

export function roomSettingValues(settings: RoomSettings): {
  topic: RequestTopic
  difficulty: Difficulty
} {
  return { topic: settings.topic, difficulty: settings.difficulty }
}
