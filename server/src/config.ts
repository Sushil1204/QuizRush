function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export type ServerConfig = {
  port: number
  clientOrigin: string | string[]
  roomExpiryMs: number
  disconnectGraceMs: number
  cleanupIntervalMs: number
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const origin = env.CLIENT_ORIGIN?.trim() || 'http://localhost:5173'
  return {
    port: positiveInteger(env.PORT, 3001),
    clientOrigin: origin.includes(',') ? origin.split(',').map((item) => item.trim()).filter(Boolean) : origin,
    roomExpiryMs: positiveInteger(env.ROOM_EXPIRY_MS, 60 * 60 * 1000),
    disconnectGraceMs: positiveInteger(env.DISCONNECT_GRACE_MS, 30_000),
    cleanupIntervalMs: positiveInteger(env.CLEANUP_INTERVAL_MS, 60_000),
  }
}
