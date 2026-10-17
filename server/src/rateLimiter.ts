export type RateLimit = {
  max: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(private readonly now: () => number = Date.now) {}

  allow(key: string, limit: RateLimit): boolean {
    const now = this.now()
    const current = this.buckets.get(key)
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + limit.windowMs })
      return true
    }
    if (current.count >= limit.max) return false
    current.count += 1
    return true
  }

  clear(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.buckets.clear()
      return
    }
    for (const key of this.buckets.keys()) {
      if (key.startsWith(keyPrefix)) this.buckets.delete(key)
    }
  }
}
