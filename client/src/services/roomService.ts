/**
 * Local room store — the seam where Socket.IO will attach later.
 * Rooms live in this tab's memory: codes are real (6 chars), validation is real,
 * nothing here fabricates a network the product does not have.
 */

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
  isHost: boolean
}

export type Room = {
  code: string
  createdAt: number
  players: Player[]
  hostId: string
  settings: RoomSettings
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

export type CreateRoomResult = {
  room: Room
  player: Player
}

export type JoinRoomResult = {
  room: Room
  player: Player
}

// No I, O, 0, 1 — hosts read codes aloud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const rooms = new Map<string, Room>()

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

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

function generateCode(): string {
  let code: string
  do {
    code = Array.from({ length: CODE_LENGTH }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
    ).join('')
  } while (rooms.has(code))
  return code
}

function makePlayer(
  { nickname, avatarId }: Pick<JoinRoomInput, 'nickname' | 'avatarId'>,
  isHost: boolean,
): Player {
  return {
    id: `p_${Math.random().toString(36).slice(2, 9)}`,
    nickname,
    avatarId,
    score: 0,
    isHost,
  }
}

export async function createRoom({ nickname, avatarId, settings }: CreateRoomInput): Promise<CreateRoomResult> {
  await wait(600)
  const cleanName = sanitizeNickname(nickname)
  if (!cleanName) {
    throw new Error('Give yourself a nickname before creating a room.')
  }
  const code = generateCode()
  const host = makePlayer({ nickname: cleanName, avatarId }, true)
  const room: Room = {
    code,
    createdAt: Date.now(),
    players: [host],
    hostId: host.id,
    settings: { ...settings },
  }
  rooms.set(code, room)
  return { room, player: host }
}

export async function joinRoom(
  rawCode: string,
  { nickname, avatarId }: JoinRoomInput,
): Promise<JoinRoomResult> {
  await wait(600)
  const code = normalizeCode(rawCode)
  if (!isCompleteCode(code)) {
    throw new Error('Enter the full 6-character room code from the host.')
  }
  const room = rooms.get(code)
  if (!room) {
    throw new Error("We couldn't find that room. Check the code on the host's board and try again.")
  }
  if (room.players.length >= MAX_PLAYERS) {
    throw new Error(`This room is full — ${MAX_PLAYERS} players max.`)
  }
  const cleanName = sanitizeNickname(nickname)
  if (!cleanName) {
    throw new Error('Your nickname cannot be empty.')
  }
  const player = makePlayer({ nickname: cleanName, avatarId }, false)
  room.players.push(player)
  return { room, player }
}

export function getRoom(rawCode: unknown = ''): Room | null {
  return rooms.get(normalizeCode(rawCode)) ?? null
}

export function leaveRoom(rawCode: unknown, playerId: string): void {
  const room = getRoom(rawCode)
  if (!room) return
  room.players = room.players.filter((player) => player.id !== playerId)
  if (room.players.length === 0) rooms.delete(room.code)
}
