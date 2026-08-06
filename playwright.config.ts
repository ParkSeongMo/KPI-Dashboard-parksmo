import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const API_URL = process.env.KPI_API_URL ?? 'http://localhost:4000'

export default defineConfig({
  testDir: 'tests/e2e',
  // 지난 실행이 남긴 e2e 데이터를 먼저 지운다. 없으면 목록 순서 검증이 잘못 깨진다.
  globalSetup: './tests/e2e/global-setup.ts',
  // E2E는 실제 DB를 쓴다. 병렬로 돌리면 서로의 데이터를 건드린다.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // 분리 이후 백엔드와 프론트엔드 두 프로세스가 모두 필요하다.
  webServer: [
    {
      command: 'npm run dev:api',
      url: `${API_URL}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:web',
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
