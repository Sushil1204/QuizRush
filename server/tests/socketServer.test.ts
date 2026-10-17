import { createServer } from 'node:http'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client'
import { afterEach, describe, expect, it } from 'vitest'
import { loadQuestionBank } from '../src/questionBank.js'
import { RoomManager } from '../src/roomManager.js'
import { createSocketServer } from '../src/socketServer.js'
import type { ClientToServerEvents, RoomSession, ServerToClientEvents, RoomSettings } from '../src/types.js'

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>

const bankPath = fileURLToPath(new URL('../bank/question-bank.json', import.meta.url))
const settings: RoomSettings = {
  topic: 'mixed',
  difficulty: 'mixed',
  questionCount: 5,
  secondsPerQuestion: 15,
}

const clients: TestClient[] = []
const servers: Array<{ close: () => Promise<void> }> = []

async function setup() {
  const httpServer = createServer()
  const manager = new RoomManager(await loadQuestionBank(bankPath))
  const { io } = createSocketServer(httpServer, { manager })
  httpServer.listen(0)
  await once(httpServer, 'listening')
  const address = httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a port.')
  servers.push({
    close: async () => {
      await new Promise<void>((resolve) => io.close(() => resolve()))
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    },
  })
  return `http://127.0.0.1:${address.port}`
}

async function client(url: string): Promise<TestClient> {
  const socket = connectClient(url, { forceNew: true, transports: ['websocket'] }) as TestClient
  clients.push(socket)
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', reject)
  })
  return socket
}

function emitAck<T>(socket: TestClient, event: 'room:create', payload: Parameters<ClientToServerEvents['room:create']>[0]): Promise<T>
function emitAck<T>(socket: TestClient, event: 'room:join', payload: Parameters<ClientToServerEvents['room:join']>[0]): Promise<T>
function emitAck<T>(socket: TestClient, event: 'room:ready', payload: Parameters<ClientToServerEvents['room:ready']>[0]): Promise<T>
function emitAck<T>(socket: TestClient, event: 'room:update-settings', payload: Parameters<ClientToServerEvents['room:update-settings']>[0]): Promise<T>
function emitAck<T>(socket: TestClient, event: 'game:request-state', payload?: undefined): Promise<T>
function emitAck<T>(socket: TestClient, event: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const callback = (response: { ok: boolean; data?: T; error?: { message: string } }) => {
      if (response.ok) resolve(response.data as T)
      else reject(new Error(response.error?.message ?? 'Socket command failed'))
    }
    const untypedSocket = socket as unknown as { emit: (eventName: string, ...args: unknown[]) => void }
    if (payload === undefined) untypedSocket.emit(event, callback)
    else untypedSocket.emit(event, payload, callback)
  })
}

afterEach(async () => {
  for (const socket of clients.splice(0)) socket.disconnect()
  for (const server of servers.splice(0)) await server.close()
})

describe('room Socket.IO events', () => {
  it('creates, joins, synchronizes room state, and isolates rooms', async () => {
    const url = await setup()
    const host = await client(url)
    const guest = await client(url)
    const otherHost = await client(url)

    const hostSession = await emitAck<RoomSession>(host, 'room:create', {
      nickname: 'Host',
      avatarId: 'cool',
      settings,
    })
    const guestStatePromise = new Promise<unknown>((resolve) => guest.once('room:state', resolve))
    const guestSession = await emitAck<RoomSession>(guest, 'room:join', {
      roomCode: hostSession.room.code,
      nickname: 'Guest',
      avatarId: 'cat',
    })
    expect(guestSession.room.players).toHaveLength(2)
    expect((await guestStatePromise as RoomSession['room']).players).toHaveLength(2)

    const otherSession = await emitAck<RoomSession>(otherHost, 'room:create', {
      nickname: 'Other host',
      avatarId: 'robot',
      settings,
    })
    expect(otherSession.room.code).not.toBe(hostSession.room.code)

    const guestSawOtherRoom = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 100)
      guest.once('room:state', (state) => {
        clearTimeout(timer)
        resolve(state.code === otherSession.room.code)
      })
    })
    await emitAck<RoomSession>(otherHost, 'game:request-state')
    expect(await guestSawOtherRoom).toBe(false)
  })

  it('enforces host authorization and supports ready state changes', async () => {
    const url = await setup()
    const host = await client(url)
    const guest = await client(url)
    const session = await emitAck<RoomSession>(host, 'room:create', {
      nickname: 'Host',
      avatarId: 'cool',
      settings,
    })
    await emitAck<RoomSession>(guest, 'room:join', {
      roomCode: session.room.code,
      nickname: 'Guest',
      avatarId: 'cat',
    })

    await expect(emitAck(guest, 'room:update-settings', { ...settings, secondsPerQuestion: 30 })).rejects.toThrow()
    const state = await emitAck<RoomSession['room']>(guest, 'room:ready', { ready: true })
    expect(state.players.find((player) => player.nickname === 'Guest')?.ready).toBe(true)
  })
})
