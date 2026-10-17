import { describe, expect, it } from 'vitest'
import { RateLimiter } from '../src/rateLimiter.js'

describe('RateLimiter', () => {
  it('allows a bounded burst and resets the bucket after its window', () => {
    let now = 1_000
    const limiter = new RateLimiter(() => now)
    const limit = { max: 2, windowMs: 100 }

    expect(limiter.allow('socket:event', limit)).toBe(true)
    expect(limiter.allow('socket:event', limit)).toBe(true)
    expect(limiter.allow('socket:event', limit)).toBe(false)
    now += 100
    expect(limiter.allow('socket:event', limit)).toBe(true)
  })

  it('clears keys by socket prefix', () => {
    const limiter = new RateLimiter(() => 1_000)
    const limit = { max: 1, windowMs: 100 }
    expect(limiter.allow('socket-a:room:join', limit)).toBe(true)
    expect(limiter.allow('socket-b:room:join', limit)).toBe(true)
    limiter.clear('socket-a:')
    expect(limiter.allow('socket-a:room:join', limit)).toBe(true)
    expect(limiter.allow('socket-b:room:join', limit)).toBe(false)
  })
})
