import { request } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { startServer } from '../src/server.js'

const runningServers: Array<{ close: () => Promise<void> }> = []

afterEach(async () => {
  for (const server of runningServers.splice(0)) await server.close()
})

describe('server bootstrap', () => {
  it('loads the local question bank and exposes a health endpoint', async () => {
    const server = await startServer({
      port: 0,
      clientOrigin: 'http://localhost:5173',
      roomExpiryMs: 60_000,
      disconnectGraceMs: 100,
      cleanupIntervalMs: 60_000,
    })
    runningServers.push(server)

    const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      const requestHandle = request({ hostname: '127.0.0.1', port: server.port, path: '/health', method: 'GET' }, (responseHandle) => {
        let body = ''
        responseHandle.setEncoding('utf8')
        responseHandle.on('data', (chunk: string) => { body += chunk })
        responseHandle.on('end', () => resolve({ statusCode: responseHandle.statusCode, body }))
      })
      requestHandle.on('error', reject)
      requestHandle.end()
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ ok: true, rooms: 0 })
  })
})
