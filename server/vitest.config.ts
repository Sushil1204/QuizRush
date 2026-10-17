import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    restoreMocks: true,
    clearMocks: true,
    hookTimeout: 10_000,
    testTimeout: 10_000,
  },
})
