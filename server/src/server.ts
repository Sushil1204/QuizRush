import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { GameEngine } from './gameEngine.js'
import { loadConfig, type ServerConfig } from './config.js'
import { loadQuestionBank } from './questionBank.js'
import { RoomManager } from './roomManager.js'
import { createSocketServer } from './socketServer.js'

const moduleDirectory = dirname(fileURLToPath(import.meta.url))

export async function startServer(config: ServerConfig = loadConfig()): Promise<{
  close: () => Promise<void>
  port: number
}> {
  const bankPath = resolve(moduleDirectory, '../bank/question-bank.json')
  const questionBank = await loadQuestionBank(bankPath)
  const manager = new RoomManager(questionBank, {
    roomExpiryMs: config.roomExpiryMs,
    disconnectGraceMs: config.disconnectGraceMs,
  })
  const gameEngine = new GameEngine(manager, questionBank)
  const httpServer = createServer((request, response) => {
    if (request.url === '/health' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ ok: true, rooms: manager.roomCount() }))
      return
    }
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ ok: false, error: 'Not found' }))
  })
  const { io } = createSocketServer(httpServer, {
    manager,
    gameEngine,
    corsOrigin: config.clientOrigin,
  })
  const cleanupTimer = setInterval(() => {
    for (const roomCode of manager.cleanupExpired()) gameEngine.disposeRoom(roomCode)
  }, config.cleanupIntervalMs)

  await new Promise<void>((resolveListen, rejectListen) => {
    httpServer.once('error', rejectListen)
    httpServer.listen(config.port, '0.0.0.0', () => resolveListen())
  })
  const address = httpServer.address()
  const port = address && typeof address !== 'string' ? address.port : config.port
  let closed = false
  return {
    port,
    close: async () => {
      if (closed) return
      closed = true
      clearInterval(cleanupTimer)
      await new Promise<void>((resolveClose) => io.close(() => resolveClose()))
      if (httpServer.listening) {
        await new Promise<void>((resolveClose) => httpServer.close(() => resolveClose()))
      }
    },
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(moduleDirectory, 'server.js')) {
  const config = loadConfig()
  startServer(config)
    .then(({ port }) => {
      console.log(`QuizRush server listening on http://localhost:${port}`)
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
