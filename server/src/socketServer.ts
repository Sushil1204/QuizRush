import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { answerSubmitSchema, roomCreateSchema, roomJoinSchema, roomReadySchema, roomSettingsSchema } from './schemas.js'
import { GameEngine, type GameEvent } from './gameEngine.js'
import { RateLimiter, type RateLimit } from './rateLimiter.js'
import { RoomManager, RoomManagerError } from './roomManager.js'
import type {
  Ack,
  ClientError,
  ClientToServerEvents,
  PublicRoomState,
  ServerToClientEvents,
  SocketData,
} from './types.js'

type QuizSocketServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>
type QuizSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>

export type SocketServerOptions = {
  manager: RoomManager
  gameEngine: GameEngine
  corsOrigin?: string | string[]
  rateLimiter?: RateLimiter
}

function toClientError(error: unknown): ClientError {
  if (error instanceof RoomManagerError) {
    return { code: error.code, message: error.message, details: error.details }
  }
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const candidate = error as { code: unknown; message: unknown; details?: unknown }
    if (typeof candidate.code === 'string' && typeof candidate.message === 'string') {
      return { code: candidate.code, message: candidate.message, details: candidate.details }
    }
  }
  return { code: 'INTERNAL_ERROR', message: 'Something went wrong while handling that request.' }
}

function ok<T>(data: T): Ack<T> {
  return { ok: true, data }
}

function fail<T>(error: unknown): Ack<T> {
  return { ok: false, error: toClientError(error) }
}

function requireSession(socket: QuizSocket): {
  roomCode: string
  playerId: string
} {
  const roomCode = socket.data.roomCode
  const playerId = socket.data.playerId
  if (!roomCode || !playerId) throw new RoomManagerError('NOT_ROOM_MEMBER', 'Join a room before using this command.')
  return { roomCode, playerId }
}

function emitRoomState(io: QuizSocketServer, manager: RoomManager, roomCode: string): PublicRoomState | null {
  const room = manager.get(roomCode)
  if (!room) return null
  const state = manager.snapshotByCode(roomCode)
  io.to(roomCode).emit('room:state', state)
  return state
}

export function createSocketServer(httpServer: HttpServer, options: SocketServerOptions): {
  io: QuizSocketServer
  manager: RoomManager
} {
  const io: QuizSocketServer = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(httpServer, {
    cors: { origin: options.corsOrigin ?? true },
  })
  const { manager, gameEngine } = options
  const rateLimiter = options.rateLimiter ?? new RateLimiter()
  const defaultCommandLimit: RateLimit = { max: 40, windowMs: 10_000 }
  const commandLimits: Record<string, RateLimit> = {
    'answer:submit': { max: 20, windowMs: 1_000 },
  }

  const rateLimited = (socketId: string, eventName: string): boolean =>
    !rateLimiter.allow(`${socketId}:${eventName}`, commandLimits[eventName] ?? defaultCommandLimit)

  const emitCurrentQuestion = (socket: QuizSocket, roomCode: string): void => {
    const question = gameEngine.currentQuestion(roomCode)
    if (question) socket.emit('game:question-open', question)
  }

  const emitGameEvent = (event: GameEvent): void => {
    switch (event.name) {
      case 'game:countdown':
        io.to(event.roomCode).emit('game:countdown', event.payload)
        break
      case 'game:question-open':
        io.to(event.roomCode).emit('game:question-open', event.payload)
        break
      case 'game:answer-locked':
        io.to(event.roomCode).emit('game:answer-locked', event.payload)
        break
      case 'game:answer-reveal':
        io.to(event.roomCode).emit('game:answer-reveal', event.payload)
        break
      case 'game:leaderboard':
        io.to(event.roomCode).emit('game:leaderboard', event.payload)
        break
      case 'game:finished':
        io.to(event.roomCode).emit('game:finished', event.payload)
        break
    }
    emitRoomState(io, manager, event.roomCode)
  }

  gameEngine.setEventHandler?.(emitGameEvent)

  io.on('connection', (socket) => {
    socket.on('room:create', (payload, callback) => {
      if (rateLimited(socket.id, 'room:create')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      const result = roomCreateSchema.safeParse(payload)
      if (!result.success) {
        callback(fail({ code: 'INVALID_PAYLOAD', message: 'The room details are invalid.', details: result.error.issues }))
        return
      }
      try {
        const session = manager.create(result.data)
        socket.join(session.room.code)
        socket.data.roomCode = session.room.code
        socket.data.playerId = session.player.id
        socket.data.reconnectToken = session.reconnectToken
        callback(ok(session))
        socket.emit('room:state', session.room)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('room:join', (payload, callback) => {
      if (rateLimited(socket.id, 'room:join')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      const result = roomJoinSchema.safeParse(payload)
      if (!result.success) {
        callback(fail({ code: 'INVALID_PAYLOAD', message: 'The join details are invalid.', details: result.error.issues }))
        return
      }
      try {
        const session = manager.join(result.data)
        socket.join(session.room.code)
        socket.data.roomCode = session.room.code
        socket.data.playerId = session.player.id
        socket.data.reconnectToken = session.reconnectToken
        callback(ok(session))
        socket.to(session.room.code).emit('room:player-joined', session.player)
        emitRoomState(io, manager, session.room.code)
        emitCurrentQuestion(socket, session.room.code)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('room:leave', (callback) => {
      if (rateLimited(socket.id, 'room:leave')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      try {
        const { roomCode, playerId } = requireSession(socket)
        const result = manager.leave(roomCode, playerId)
        gameEngine.playerRemoved(roomCode, playerId)
        socket.leave(roomCode)
        socket.data.roomCode = undefined
        socket.data.playerId = undefined
        socket.data.reconnectToken = undefined
        callback(ok({ left: true }))
        io.to(roomCode).emit('room:player-left', { playerId: result.player.id })
        if (result.hostChanged) io.to(roomCode).emit('room:host-changed', { hostId: result.hostChanged })
        emitRoomState(io, manager, roomCode)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('room:ready', (payload, callback) => {
      if (rateLimited(socket.id, 'room:ready')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      const result = roomReadySchema.safeParse(payload)
      if (!result.success) {
        callback(fail({ code: 'INVALID_PAYLOAD', message: 'Ready status must be a boolean.', details: result.error.issues }))
        return
      }
      try {
        const { roomCode, playerId } = requireSession(socket)
        const state = manager.setReady(roomCode, playerId, result.data.ready)
        callback(ok(state))
        io.to(roomCode).emit('room:state', state)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('room:update-settings', (payload, callback) => {
      if (rateLimited(socket.id, 'room:update-settings')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      const result = roomSettingsSchema.safeParse(payload)
      if (!result.success) {
        callback(fail({ code: 'INVALID_PAYLOAD', message: 'The room settings are invalid.', details: result.error.issues }))
        return
      }
      try {
        const { roomCode, playerId } = requireSession(socket)
        const state = manager.updateSettings(roomCode, playerId, result.data)
        callback(ok(state))
        io.to(roomCode).emit('room:state', state)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('game:request-state', (callback) => {
      if (rateLimited(socket.id, 'game:request-state')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      try {
        const { roomCode, playerId } = requireSession(socket)
        manager.requireMembership(roomCode, playerId)
        callback(ok(manager.snapshotByCode(roomCode)))
        emitCurrentQuestion(socket, roomCode)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('game:start', (callback) => {
      if (rateLimited(socket.id, 'game:start')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      try {
        const { roomCode, playerId } = requireSession(socket)
        const state = gameEngine.start(roomCode, playerId)
        callback(ok({ state }))
        io.to(roomCode).emit('room:state', state)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('answer:submit', (payload, callback) => {
      if (rateLimited(socket.id, 'answer:submit')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Answering too quickly. Try again shortly.' }))
        return
      }
      const result = answerSubmitSchema.safeParse(payload)
      if (!result.success) {
        callback(fail({ code: 'INVALID_PAYLOAD', message: 'The answer payload is invalid.', details: result.error.issues }))
        return
      }
      try {
        const { roomCode, playerId } = requireSession(socket)
        callback(ok(gameEngine.submitAnswer(roomCode, playerId, result.data.questionId, result.data.optionIndex)))
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('game:rematch', (callback) => {
      if (rateLimited(socket.id, 'game:rematch')) {
        callback(fail({ code: 'RATE_LIMITED', message: 'Too many room commands. Try again shortly.' }))
        return
      }
      try {
        const { roomCode, playerId } = requireSession(socket)
        const result = gameEngine.rematch(roomCode, playerId)
        callback(ok(result))
        io.to(roomCode).emit('room:state', result.state)
      } catch (error) {
        callback(fail(error))
      }
    })

    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode
      const playerId = socket.data.playerId
      if (!roomCode || !playerId) return
      manager.markDisconnected(roomCode, playerId)
      gameEngine.playerRemoved(roomCode, playerId)
      emitRoomState(io, manager, roomCode)
      rateLimiter.clear(`${socket.id}:`)
    })
  })

  return { io, manager }
}
