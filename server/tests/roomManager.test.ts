import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadQuestionBank } from '../src/questionBank.js'
import { MAX_PLAYERS, RoomManager, RoomManagerError } from '../src/roomManager.js'
import type { RoomSettings } from '../src/types.js'

const bankPath = fileURLToPath(new URL('../bank/question-bank.json', import.meta.url))

const settings: RoomSettings = {
  topic: 'science',
  difficulty: 'easy',
  questionCount: 5,
  secondsPerQuestion: 15,
}

async function createManager() {
  return new RoomManager(await loadQuestionBank(bankPath), {
    createId: (() => {
      let index = 0
      return () => `player-${++index}`
    })(),
    createToken: (() => {
      let index = 0
      return () => `token-${++index}`
    })(),
  })
}

describe('RoomManager', () => {
  it('creates and joins a room with normalized nicknames', async () => {
    const manager = await createManager()
    const host = manager.create({ nickname: '  Quiz   Host ', avatarId: 'cool', settings })
    const guest = manager.join({ roomCode: host.room.code.toLowerCase(), nickname: 'Player Two', avatarId: 'cat' })

    expect(host.player.nickname).toBe('Quiz Host')
    expect(guest.room.players).toHaveLength(2)
    expect(guest.room.players.find((player) => player.id === host.player.id)?.isHost).toBe(true)
    expect(guest.room.players.find((player) => player.id === guest.player.id)?.isHost).toBe(false)
    expect(guest.reconnectToken).not.toBe(host.reconnectToken)
  })

  it('enforces the 12-player room limit and duplicate connected nicknames', async () => {
    const manager = await createManager()
    const host = manager.create({ nickname: 'Host', avatarId: 'cool', settings })

    for (let index = 2; index <= MAX_PLAYERS; index += 1) {
      manager.join({ roomCode: host.room.code, nickname: `Player ${index}`, avatarId: 'cat' })
    }
    expect(() => manager.join({ roomCode: host.room.code, nickname: 'Player 13', avatarId: 'cat' })).toThrowError(
      expect.objectContaining({ code: 'ROOM_FULL' }),
    )
    expect(() => manager.join({ roomCode: host.room.code, nickname: ' host ', avatarId: 'robot' })).toThrowError(
      expect.objectContaining({ code: 'ROOM_FULL' }),
    )
  })

  it('restricts settings changes to the host and validates question availability', async () => {
    const manager = await createManager()
    const host = manager.create({ nickname: 'Host', avatarId: 'cool', settings })
    const guest = manager.join({ roomCode: host.room.code, nickname: 'Guest', avatarId: 'cat' })

    expect(() => manager.updateSettings(host.room.code, guest.player.id, { ...settings, difficulty: 'hard' })).toThrowError(
      expect.objectContaining({ code: 'HOST_ONLY' }),
    )
    expect(() => manager.updateSettings(host.room.code, host.player.id, { ...settings, questionCount: 15 })).not.toThrow()
    expect(() => manager.updateSettings(host.room.code, host.player.id, { ...settings, questionCount: 10 })).not.toThrow()
  })

  it('transfers host ownership when the host explicitly leaves', async () => {
    const manager = await createManager()
    const host = manager.create({ nickname: 'Host', avatarId: 'cool', settings })
    const guest = manager.join({ roomCode: host.room.code, nickname: 'Guest', avatarId: 'cat' })

    const result = manager.leave(host.room.code, host.player.id)
    expect(result.hostChanged).toBe(guest.player.id)
    expect(manager.snapshotByCode(host.room.code).hostId).toBe(guest.player.id)
    expect(manager.snapshotByCode(host.room.code).players.find((player) => player.id === guest.player.id)?.isHost).toBe(true)
  })

  it('preserves a disconnected player for reconnect and restores the same identity', async () => {
    const manager = await createManager()
    const host = manager.create({ nickname: 'Host', avatarId: 'cool', settings })
    manager.markDisconnected(host.room.code, host.player.id)

    const reconnected = manager.join({
      roomCode: host.room.code,
      nickname: 'ignored on reconnect',
      avatarId: 'robot',
      reconnectToken: host.reconnectToken,
    })
    expect(reconnected.player.id).toBe(host.player.id)
    expect(reconnected.player.connected).toBe(true)
    expect(reconnected.player.nickname).toBe('Host')
  })

  it('expires disconnected players after the grace window and transfers the host', async () => {
    let now = 1_000
    const questionBank = await loadQuestionBank(bankPath)
    const manager = new RoomManager(questionBank, {
      now: () => now,
      disconnectGraceMs: 100,
    })
    const host = manager.create({ nickname: 'Host', avatarId: 'cool', settings })
    const guest = manager.join({ roomCode: host.room.code, nickname: 'Guest', avatarId: 'cat' })
    manager.markDisconnected(host.room.code, host.player.id)
    now += 101

    expect(manager.cleanupExpired()).toEqual([])
    expect(manager.snapshotByCode(host.room.code).hostId).toBe(guest.player.id)
    expect(manager.drainHostChanges()).toEqual([{ roomCode: host.room.code, hostId: guest.player.id }])
    expect(manager.snapshotByCode(host.room.code).players.some((player) => player.id === host.player.id)).toBe(false)
    expect(() => manager.join({
      roomCode: host.room.code,
      nickname: 'Host again',
      avatarId: 'cool',
      reconnectToken: host.reconnectToken,
    })).toThrowError(expect.objectContaining({ code: 'RECONNECT_INVALID' }))
  })

  it('returns structured errors for missing and invalid rooms', async () => {
    const manager = await createManager()
    expect(() => manager.join({ roomCode: 'bad', nickname: 'Guest', avatarId: 'cat' })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ROOM_CODE' }),
    )
    expect(() => manager.snapshotByCode('ABC234')).toThrowError(
      expect.objectContaining({ code: 'ROOM_NOT_FOUND' }),
    )
    expect(() => manager.create({ nickname: ' ', avatarId: 'cool', settings })).toThrowError(RoomManagerError)
  })
})
