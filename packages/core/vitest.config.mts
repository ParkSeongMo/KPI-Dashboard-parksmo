import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // core는 순수 코드만 담으므로 별칭 없이 상대 경로로 import한다
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
